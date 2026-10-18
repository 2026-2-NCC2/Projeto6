import { chaveIdempotente, falhar, hash, hashPayload, inteiro, novaCredencial } from './regras.js';
import { rows, one, numeric, openOrder } from './banco.js';
import { orderDto, queueDto, invitationDto, supportDto } from './consultas.js';
const json = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

// Funções comuns aos fluxos: transação, locks, prazos e integridade da unidade.
// Cada grupo recebe este contexto, sem criar outro pool ou outra transação.
export function criarContextoTransacoes(pool, { pagamento, emissor }) {
  async function transaction(work) {
    const db = await pool.getConnection();
    // O evento é o bloqueio comum de estoque, posse e reservas. READ COMMITTED
    // evita usar um snapshot anterior à espera desse bloqueio no InnoDB.
    try {
      await db.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await db.beginTransaction();
      const result = await work(db);
      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      throw error;
    } finally {
      db.release();
    }
  }

  async function run(user, key, operation, body, work) {
    chaveIdempotente(key);
    const digest = hashPayload(operation, body);
    return transaction(async (db) => {
      try {
        await rows(
          db,
          'INSERT INTO mvp_idempotencia(user_id,request_key,payload_hash) VALUES(?,?,?)',
          [user.id, key, digest],
        );
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
        const previous = await one(
          db,
          'SELECT payload_hash,response_json FROM mvp_idempotencia WHERE user_id=? AND request_key=? FOR UPDATE',
          [user.id, key],
        );
        if (previous.payload_hash !== digest)
          falhar(409, 'Chave idempotente já utilizada com conteúdo diferente.');
        return json(previous.response_json);
      }
      const result = await work(db);
      await rows(
        db,
        'UPDATE mvp_idempotencia SET response_json=? WHERE user_id=? AND request_key=?',
        [JSON.stringify(result), user.id, key],
      );
      return result;
    });
  }

  const config = (db) => one(db, 'SELECT * FROM mvp_config WHERE id=1');

  async function lockEvent(db, eventId, { sales = false } = {}) {
    inteiro(eventId);
    const event = await one(
      db,
      'SELECT e.*,m.status,m.ends_at FROM evento e JOIN mvp_evento m ON m.evento_id=e.id WHERE e.id=? FOR UPDATE',
      [eventId],
    );
    if (!event) falhar(404, 'Evento não encontrado ou ainda não migrado para o MVP.');
    await expireEvent(db, eventId);
    if (sales && (event.status !== 'published' || !event.publico_max))
      falhar(409, 'Evento não está disponível para novas operações.');
    if (sales) {
      const clock = await one(db, 'SELECT (? <= UTC_TIMESTAMP(3)) AS ended', [
        event.ends_at || event.data_hora,
      ]);
      if (clock.ended) falhar(409, 'Evento encerrado para novas operações.');
    }
    return event;
  }

  async function lockTicket(db, id) {
    const ticket = await one(
      db,
      `SELECT i.id,i.evento_id,i.dono_atual_id,u.*,c.kind,c.name category_name
      FROM ingresso i JOIN mvp_unidade u ON u.ticket_id=i.id JOIN mvp_categoria c ON c.id=u.category_id WHERE i.id=? FOR UPDATE`,
      [inteiro(id)],
    );
    if (!ticket) falhar(404, 'Ingresso não encontrado ou legado sem mapeamento de estado.');
    return ticket;
  }

  const own = (ticket, user) => {
    if (ticket.dono_atual_id !== user.id)
      falhar(403, 'Somente o titular atual pode operar este ingresso.');
  };

  const valid = (ticket) => {
    if (ticket.state !== 'valid') falhar(409, 'Ingresso usado ou cancelado.');
  };

  async function conflicts(db, ticketId) {
    const row = await one(
      db,
      `SELECT
      (SELECT id FROM mvp_anuncio WHERE ticket_id=? AND status IN ('active','reserved') LIMIT 1) listing_id,
      (SELECT id FROM mvp_convite WHERE ticket_id=? AND status='pending' LIMIT 1) invitation_id,
      (SELECT id FROM mvp_pedido WHERE ticket_id=? AND delivery_state IN ('reserved','pending') LIMIT 1) order_id`,
      [ticketId, ticketId, ticketId],
    );
    return row;
  }

  async function countAccount(db, userId, eventId, excludeInviteId = 0, excludeOrderId = 0) {
    const row = await one(
      db,
      `SELECT
      (SELECT COUNT(*) FROM ingresso i JOIN mvp_unidade u ON u.ticket_id=i.id WHERE i.evento_id=? AND i.dono_atual_id=? AND u.state='valid')
      +(SELECT COALESCE(SUM(quantity),0) FROM mvp_pedido WHERE event_id=? AND user_id=? AND delivery_state IN ('reserved','pending') AND id<>?)
      +(SELECT COUNT(*) FROM mvp_convite v JOIN ingresso i ON i.id=v.ticket_id WHERE i.evento_id=? AND v.to_user_id=? AND v.status='pending' AND v.id<>?) total`,
      [eventId, userId, eventId, userId, excludeOrderId, eventId, userId, excludeInviteId],
    );
    return numeric(row.total);
  }

  async function requireLimit(
    db,
    userId,
    eventId,
    quantity,
    excludeInviteId = 0,
    excludeOrderId = 0,
  ) {
    const settings = await config(db);
    if (
      (await countAccount(db, userId, eventId, excludeInviteId, excludeOrderId)) + quantity >
      settings.account_limit
    )
      falhar(
        409,
        `Limite de ${settings.account_limit} ingressos ativos/reservados por conta e evento.`,
      );
  }

  async function expireEvent(db, eventId) {
    const expired = await rows(
      db,
      "SELECT id,listing_id FROM mvp_pedido WHERE event_id=? AND delivery_state='reserved' AND expires_at<=UTC_TIMESTAMP(3) FOR UPDATE",
      [eventId],
    );
    for (const order of expired) {
      await rows(
        db,
        "UPDATE mvp_pedido SET delivery_state='expired',updated_at=UTC_TIMESTAMP(3) WHERE id=?",
        [order.id],
      );
      if (order.listing_id)
        await rows(db, "UPDATE mvp_anuncio SET status='active' WHERE id=? AND status='reserved'", [
          order.listing_id,
        ]);
      await rows(
        db,
        "UPDATE mvp_fila SET status='expired' WHERE order_id=? AND status='reserved'",
        [order.id],
      );
    }
    await rows(
      db,
      `UPDATE mvp_convite v JOIN ingresso i ON i.id=v.ticket_id SET v.status='expired'
      WHERE i.evento_id=? AND v.status='pending' AND v.expires_at<=UTC_TIMESTAMP(3)`,
      [eventId],
    );
  }

  async function newResaleOrder(db, listing, userId) {
    await requireLimit(db, userId, listing.evento_id, 1);
    const settings = await config(db);
    const inserted = await rows(
      db,
      `INSERT INTO mvp_pedido(user_id,event_id,category_id,kind,quantity,amount_cents,listing_id,ticket_id,expires_at)
      VALUES(?,?,?,'resale',1,?,?,?,TIMESTAMPADD(MINUTE,?,UTC_TIMESTAMP(3)))`,
      [
        userId,
        listing.evento_id,
        listing.category_id,
        listing.price_cents,
        listing.id,
        listing.ticket_id,
        settings.reservation_minutes,
      ],
    );
    await rows(db, "UPDATE mvp_anuncio SET status='reserved' WHERE id=?", [listing.id]);
    return inserted.insertId;
  }

  async function allocateQueue(db, eventId) {
    const event = await one(
      db,
      `SELECT m.status,COALESCE(m.ends_at,e.data_hora)<=UTC_TIMESTAMP(3) ended
      FROM mvp_evento m JOIN evento e ON e.id=m.evento_id WHERE m.evento_id=?`,
      [eventId],
    );
    if (event?.status !== 'published' || event.ended) return;
    const listings = await rows(
      db,
      `SELECT a.*,i.evento_id,u.category_id FROM mvp_anuncio a JOIN ingresso i ON i.id=a.ticket_id
      JOIN mvp_unidade u ON u.ticket_id=i.id WHERE i.evento_id=? AND a.status='active' AND u.state='valid' ORDER BY a.created_at,a.id FOR UPDATE`,
      [eventId],
    );
    for (const listing of listings) {
      const waiting = await rows(
        db,
        `SELECT f.* FROM mvp_fila f JOIN usuario u ON u.id=f.user_id
        WHERE f.event_id=? AND f.category_id=? AND f.status='queued' AND u.status_aprovacao='A' AND f.user_id<>?
        ORDER BY f.created_at,f.id FOR UPDATE`,
        [eventId, listing.category_id, listing.seller_id],
      );
      for (const candidate of waiting) {
        const settings = await config(db);
        if ((await countAccount(db, candidate.user_id, eventId)) >= settings.account_limit)
          continue;
        const orderId = await newResaleOrder(db, listing, candidate.user_id);
        await rows(db, "UPDATE mvp_fila SET status='reserved',order_id=? WHERE id=?", [
          orderId,
          candidate.id,
        ]);
        break;
      }
    }
  }

  async function revoke(db, ticket) {
    await rows(db, 'INSERT INTO mvp_credencial_revogada(token_hash,ticket_id) VALUES(?,?)', [
      hash(ticket.credential),
      ticket.id,
    ]);
    const token = novaCredencial();
    await rows(db, 'UPDATE mvp_unidade SET credential=? WHERE ticket_id=?', [token, ticket.id]);
    return token;
  }

  async function history(db, ticketId, kind, from, to, amount, orderId = null) {
    await rows(
      db,
      'INSERT INTO mvp_historico(ticket_id,kind,from_user_id,to_user_id,amount_cents,order_id) VALUES(?,?,?,?,?,?)',
      [ticketId, kind, from, to, amount, orderId],
    );
  }

  async function deliver(db, order, settings) {
    if (!emissor.emitir(settings.issuer_scenario).delivered) {
      await rows(
        db,
        "UPDATE mvp_pedido SET delivery_state='pending',updated_at=UTC_TIMESTAMP(3) WHERE id=?",
        [order.id],
      );
      return;
    }
    await requireLimit(db, order.user_id, order.event_id, order.quantity, 0, order.id);
    if (order.kind === 'primary') {
      const unitPrice = order.amount_cents / order.quantity;
      for (let n = 0; n < order.quantity; n++) {
        const inserted = await rows(
          db,
          'INSERT INTO ingresso(evento_id,dono_atual_id,preco) VALUES(?,?,?)',
          [order.event_id, order.user_id, (unitPrice / 100).toFixed(2)],
        );
        await rows(
          db,
          'INSERT INTO mvp_unidade(ticket_id,category_id,original_cents,cost_cents,credential) VALUES(?,?,?,?,?)',
          [inserted.insertId, order.category_id, unitPrice, unitPrice, novaCredencial()],
        );
        await rows(db, 'INSERT INTO mvp_pedido_unidade(order_id,ticket_id) VALUES(?,?)', [
          order.id,
          inserted.insertId,
        ]);
        await history(db, inserted.insertId, 'issued', null, order.user_id, unitPrice, order.id);
      }
    } else {
      const ticket = await lockTicket(db, order.ticket_id);
      valid(ticket);
      const listing = await one(db, 'SELECT * FROM mvp_anuncio WHERE id=? FOR UPDATE', [
        order.listing_id,
      ]);
      if (listing.status !== 'reserved' || ticket.dono_atual_id !== listing.seller_id)
        falhar(409, 'Repasse não pode ser concluído neste estado.');
      await revoke(db, ticket);
      await rows(db, 'UPDATE ingresso SET dono_atual_id=? WHERE id=?', [order.user_id, ticket.id]);
      await rows(db, 'UPDATE mvp_unidade SET cost_cents=? WHERE ticket_id=?', [
        order.amount_cents,
        ticket.id,
      ]);
      await rows(db, "UPDATE mvp_anuncio SET status='sold' WHERE id=?", [listing.id]);
      await rows(db, 'INSERT INTO mvp_pedido_unidade(order_id,ticket_id) VALUES(?,?)', [
        order.id,
        ticket.id,
      ]);
      await history(
        db,
        ticket.id,
        'resold',
        listing.seller_id,
        order.user_id,
        order.amount_cents,
        order.id,
      );
    }
    await rows(
      db,
      "UPDATE mvp_pedido SET delivery_state='delivered',updated_at=UTC_TIMESTAMP(3) WHERE id=?",
      [order.id],
    );
    await rows(
      db,
      "UPDATE mvp_fila SET status='completed' WHERE order_id=? AND status='reserved'",
      [order.id],
    );
  }

  async function refund(db, order, reason) {
    if (order.payment_state === 'approved') {
      await rows(
        db,
        'INSERT INTO mvp_estorno(order_id,amount_cents,reason) VALUES(?,?,?) ON DUPLICATE KEY UPDATE order_id=order_id',
        [order.id, order.amount_cents, reason],
      );
      await rows(
        db,
        "UPDATE mvp_pedido SET payment_state='refunded',delivery_state='refunded',updated_at=UTC_TIMESTAMP(3) WHERE id=?",
        [order.id],
      );
    } else if (openOrder(order))
      await rows(
        db,
        "UPDATE mvp_pedido SET delivery_state='cancelled',updated_at=UTC_TIMESTAMP(3) WHERE id=?",
        [order.id],
      );
    if (order.listing_id && openOrder(order))
      await rows(db, "UPDATE mvp_anuncio SET status='active' WHERE id=? AND status='reserved'", [
        order.listing_id,
      ]);
    await rows(db, "UPDATE mvp_fila SET status='left' WHERE order_id=? AND status='reserved'", [
      order.id,
    ]);
  }

  async function findOrderEvent(db, id) {
    const order = await one(db, 'SELECT event_id FROM mvp_pedido WHERE id=?', [inteiro(id)]);
    if (!order) falhar(404, 'Pedido não encontrado.');
    return order.event_id;
  }

  async function findTicketEvent(db, id) {
    const ticket = await one(db, 'SELECT evento_id FROM ingresso WHERE id=?', [inteiro(id)]);
    if (!ticket) falhar(404, 'Ingresso não encontrado.');
    return ticket.evento_id;
  }
  async function expire() {
    const events = await rows(
      pool,
      `SELECT DISTINCT event_id FROM mvp_pedido WHERE delivery_state='reserved' AND expires_at<=UTC_TIMESTAMP(3)
        UNION SELECT DISTINCT i.evento_id FROM mvp_convite v JOIN ingresso i ON i.id=v.ticket_id WHERE v.status='pending' AND v.expires_at<=UTC_TIMESTAMP(3)`,
    );
    for (const event of events)
      await transaction(async (db) => {
        await lockEvent(db, event.event_id);
        await allocateQueue(db, event.event_id);
      });
    return events.length;
  }
  return {
    transaction,
    run,
    config,
    lockEvent,
    lockTicket,
    own,
    valid,
    conflicts,
    countAccount,
    requireLimit,
    expireEvent,
    newResaleOrder,
    allocateQueue,
    revoke,
    history,
    deliver,
    refund,
    findOrderEvent,
    findTicketEvent,
    pool,
    pagamento,
    emissor,
    rows,
    one,
    numeric,
    openOrder,
    expire,
    orderDto,
    queueDto,
    invitationDto,
    supportDto,
  };
}
