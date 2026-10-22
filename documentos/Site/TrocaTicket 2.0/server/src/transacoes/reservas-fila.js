import { campos, dataISO, falhar, inteiro, tetoRepasse, validarPrecoRepasse } from './regras.js';

// Reservas primárias, anúncios e fila de repasse.
export function criarReservasFila(contexto) {
  const {
    run,
    config,
    lockEvent,
    lockTicket,
    own,
    valid,
    conflicts,
    requireLimit,
    newResaleOrder,
    allocateQueue,
    refund,
    findTicketEvent,
    pool,
    rows,
    one,
    numeric,
    expire,
    orderDto,
    queueDto,
  } = contexto;
  return {
    async reservePrimary(user, key, body) {
      campos(body, ['categoryId', 'quantity', 'halfDeclaration']);
      inteiro(body.categoryId);
      inteiro(body.quantity, 'Quantidade', 1, 20);
      if (body.halfDeclaration !== undefined && typeof body.halfDeclaration !== 'boolean')
        falhar(400, 'Declaração fictícia inválida.');
      return run(user, key, 'primary', body, async (db) => {
        const category = await one(db, 'SELECT event_id FROM mvp_categoria WHERE id=?', [
          body.categoryId,
        ]);
        if (!category) falhar(404, 'Categoria não encontrada.');
        const event = await lockEvent(db, category.event_id, { sales: true });
        const item = await one(db, 'SELECT * FROM mvp_categoria WHERE id=? FOR UPDATE', [
          body.categoryId,
        ]);
        if (!item.sales_open) falhar(409, 'Venda desta categoria encerrada.');
        if (item.kind === 'half' && body.halfDeclaration !== true)
          falhar(400, 'Confirme a declaração fictícia de meia-entrada.');
        await requireLimit(db, user.id, event.id, body.quantity);
        const counts = await one(
          db,
          `SELECT
          (SELECT COUNT(*) FROM ingresso i JOIN mvp_unidade u ON u.ticket_id=i.id WHERE u.category_id=? AND u.state<>'cancelled') sold,
          (SELECT COALESCE(SUM(quantity),0) FROM mvp_pedido WHERE category_id=? AND kind='primary' AND delivery_state IN ('reserved','pending')) reserved,
          (SELECT COUNT(*) FROM ingresso i JOIN mvp_unidade u ON u.ticket_id=i.id WHERE i.evento_id=? AND u.state<>'cancelled') total_sold,
          (SELECT COALESCE(SUM(quantity),0) FROM mvp_pedido WHERE event_id=? AND kind='primary' AND delivery_state IN ('reserved','pending')) total_reserved`,
          [item.id, item.id, event.id, event.id],
        );
        if (
          numeric(counts.sold) + numeric(counts.reserved) + body.quantity > item.stock ||
          numeric(counts.total_sold) + numeric(counts.total_reserved) + body.quantity >
            event.publico_max
        )
          falhar(409, 'Estoque ou capacidade esgotados.');
        const settings = await config(db);
        const amount = item.price_cents * body.quantity;
        inteiro(amount, 'Total', 0);
        const inserted = await rows(
          db,
          `INSERT INTO mvp_pedido(user_id,event_id,category_id,kind,quantity,amount_cents,expires_at)
          VALUES(?,?,?,'primary',?,?,TIMESTAMPADD(MINUTE,?,UTC_TIMESTAMP(3)))`,
          [user.id, event.id, item.id, body.quantity, amount, settings.reservation_minutes],
        );
        return orderDto(db, inserted.insertId, user);
      });
    },

    async listOrders(user) {
      await expire();
      const orders = await rows(
        pool,
        'SELECT id FROM mvp_pedido WHERE user_id=? ORDER BY id DESC',
        [user.id],
      );
      return Promise.all(orders.map((order) => orderDto(pool, order.id, user)));
    },

    async getOrder(user, id) {
      await expire();
      return orderDto(pool, inteiro(id), user);
    },

    async listListings(user, eventId) {
      await expire();
      const params = [];
      let filter = "a.status IN ('active','reserved')";
      if (eventId) {
        inteiro(eventId);
        filter += ' AND i.evento_id=?';
        params.push(eventId);
      }
      const listings = await rows(
        pool,
        `SELECT a.*,i.evento_id,u.category_id,u.original_cents,u.cost_cents,e.titulo,c.name FROM mvp_anuncio a
        JOIN ingresso i ON i.id=a.ticket_id JOIN mvp_unidade u ON u.ticket_id=i.id JOIN evento e ON e.id=i.evento_id
        JOIN mvp_categoria c ON c.id=u.category_id WHERE ${filter} ORDER BY a.created_at,a.id`,
        params,
      );
      return listings.map((item) => ({
        id: item.id,
        ticketId: item.ticket_id,
        eventId: item.evento_id,
        categoryId: item.category_id,
        eventTitle: item.titulo,
        categoryName: item.name,
        sellerId: item.seller_id,
        priceCents: item.price_cents,
        ceilingCents: tetoRepasse(item.original_cents, item.cost_cents),
        status: item.status,
        createdAt: dataISO(item.created_at),
      }));
    },

    async createListing(user, key, body) {
      campos(body, ['ticketId', 'priceCents']);
      inteiro(body.ticketId);
      return run(user, key, 'listing', body, async (db) => {
        const event = await lockEvent(db, await findTicketEvent(db, body.ticketId), {
          sales: true,
        });
        const ticket = await lockTicket(db, body.ticketId);
        own(ticket, user);
        valid(ticket);
        validarPrecoRepasse(body.priceCents, ticket.original_cents, ticket.cost_cents);
        const conflict = await conflicts(db, ticket.id);
        if (conflict.listing_id || conflict.invitation_id || conflict.order_id)
          falhar(409, 'Ingresso já tem anúncio ou operação pendente.');
        const inserted = await rows(
          db,
          'INSERT INTO mvp_anuncio(ticket_id,seller_id,price_cents) VALUES(?,?,?)',
          [ticket.id, user.id, body.priceCents],
        );
        await allocateQueue(db, event.id);
        return {
          id: inserted.insertId,
          ticketId: ticket.id,
          eventId: event.id,
          categoryId: ticket.category_id,
          sellerId: user.id,
          priceCents: body.priceCents,
          ceilingCents: tetoRepasse(ticket.original_cents, ticket.cost_cents),
          status: (await one(db, 'SELECT status FROM mvp_anuncio WHERE id=?', [inserted.insertId]))
            .status,
        };
      });
    },

    async cancelListing(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `cancelListing:${id}`, body, async (db) => {
        const found = await one(db, 'SELECT ticket_id FROM mvp_anuncio WHERE id=?', [inteiro(id)]);
        if (!found) falhar(404, 'Anúncio não encontrado.');
        await lockEvent(db, await findTicketEvent(db, found.ticket_id));
        const listing = await one(db, 'SELECT * FROM mvp_anuncio WHERE id=? FOR UPDATE', [id]);
        if (listing.seller_id !== user.id) falhar(403, 'Anúncio de outra conta.');
        if (listing.status === 'cancelled') return { id, status: 'cancelled' };
        if (listing.status !== 'active')
          falhar(409, 'Anúncio com reserva ou operação concluída não pode ser retirado.');
        await rows(db, "UPDATE mvp_anuncio SET status='cancelled' WHERE id=?", [id]);
        return { id, status: 'cancelled' };
      });
    },

    async reserveListing(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `reserveListing:${id}`, body, async (db) => {
        const found = await one(db, 'SELECT ticket_id FROM mvp_anuncio WHERE id=?', [inteiro(id)]);
        if (!found) falhar(404, 'Anúncio não encontrado.');
        const event = await lockEvent(db, await findTicketEvent(db, found.ticket_id), {
          sales: true,
        });
        await allocateQueue(db, event.id);
        const listing = await one(
          db,
          `SELECT a.*,i.evento_id,u.category_id FROM mvp_anuncio a JOIN ingresso i ON i.id=a.ticket_id JOIN mvp_unidade u ON u.ticket_id=i.id WHERE a.id=? FOR UPDATE`,
          [id],
        );
        if (listing.seller_id === user.id)
          falhar(409, 'Não é permitido comprar o próprio anúncio.');
        const queuedOrder = await one(
          db,
          "SELECT p.id,p.user_id FROM mvp_pedido p WHERE p.listing_id=? AND p.delivery_state IN ('reserved','pending')",
          [id],
        );
        if (queuedOrder?.user_id === user.id) return orderDto(db, queuedOrder.id, user);
        if (listing.status !== 'active') falhar(409, 'Anúncio já reservado ou encerrado.');
        const ticket = await lockTicket(db, listing.ticket_id);
        valid(ticket);
        if (ticket.kind === 'half')
          falhar(409, 'Entre na fila confirmando a declaração fictícia de meia-entrada.');
        const orderId = await newResaleOrder(db, listing, user.id);
        return orderDto(db, orderId, user);
      });
    },

    async joinQueue(user, key, body) {
      campos(body, ['eventId', 'categoryId', 'halfDeclaration']);
      inteiro(body.eventId);
      inteiro(body.categoryId);
      if (body.halfDeclaration !== undefined && typeof body.halfDeclaration !== 'boolean')
        falhar(400, 'Declaração fictícia inválida.');
      return run(user, key, 'joinQueue', body, async (db) => {
        await lockEvent(db, body.eventId, { sales: true });
        const category = await one(db, 'SELECT * FROM mvp_categoria WHERE id=? AND event_id=?', [
          body.categoryId,
          body.eventId,
        ]);
        if (!category) falhar(404, 'Categoria deste evento não encontrada.');
        if (category.kind === 'half' && body.halfDeclaration !== true)
          falhar(400, 'Confirme a declaração fictícia de meia-entrada.');
        const existing = await one(
          db,
          "SELECT id FROM mvp_fila WHERE user_id=? AND event_id=? AND category_id=? AND status IN ('queued','reserved')",
          [user.id, body.eventId, body.categoryId],
        );
        if (existing) falhar(409, 'A conta já está nesta fila.');
        const inserted = await rows(
          db,
          'INSERT INTO mvp_fila(user_id,event_id,category_id,half_declared) VALUES(?,?,?,?)',
          [user.id, body.eventId, body.categoryId, body.halfDeclaration === true],
        );
        await allocateQueue(db, body.eventId);
        return queueDto(db, inserted.insertId);
      });
    },

    async listQueue(user) {
      await expire();
      const queue = await rows(pool, 'SELECT id FROM mvp_fila WHERE user_id=? ORDER BY id DESC', [
        user.id,
      ]);
      return Promise.all(queue.map((item) => queueDto(pool, item.id)));
    },

    async leaveQueue(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `leaveQueue:${id}`, body, async (db) => {
        const initial = await one(db, 'SELECT * FROM mvp_fila WHERE id=?', [inteiro(id)]);
        if (!initial) falhar(404, 'Fila não encontrada.');
        await lockEvent(db, initial.event_id);
        const item = await one(db, 'SELECT * FROM mvp_fila WHERE id=? FOR UPDATE', [id]);
        if (item.user_id !== user.id) falhar(403, 'Fila de outra conta.');
        if (item.status === 'reserved') {
          const order = await one(db, 'SELECT * FROM mvp_pedido WHERE id=? FOR UPDATE', [
            item.order_id,
          ]);
          if (order.payment_state === 'approved')
            falhar(409, 'Resolva a entrega/estorno do pedido pago.');
          await refund(db, order, 'Saída da fila');
        }
        if (['queued', 'reserved'].includes(item.status))
          await rows(db, "UPDATE mvp_fila SET status='left' WHERE id=?", [id]);
        await allocateQueue(db, item.event_id);
        return queueDto(db, id);
      });
    },
  };
}
