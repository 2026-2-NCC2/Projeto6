import { campos, dataISO, falhar, inteiro, tetoRepasse, texto } from './regras.js';

// Carteira, histórico, leitura única e encerramento do evento.
export function criarCarteiraPortaria(contexto) {
  const {
    transaction,
    run,
    lockEvent,
    lockTicket,
    own,
    valid,
    conflicts,
    revoke,
    history,
    refund,
    findTicketEvent,
    pool,
    rows,
    one,
    expire,
  } = contexto;
  return {
    async listTickets(user) {
      await expire();
      const tickets = await rows(
        pool,
        `SELECT i.id,i.evento_id,i.dono_atual_id,u.*,e.titulo,c.name,c.kind,
        a.id listing_id,v.id invitation_id,p.id pending_order FROM ingresso i JOIN mvp_unidade u ON u.ticket_id=i.id
        JOIN evento e ON e.id=i.evento_id JOIN mvp_categoria c ON c.id=u.category_id
        LEFT JOIN mvp_anuncio a ON a.ticket_id=i.id AND a.status IN ('active','reserved')
        LEFT JOIN mvp_convite v ON v.ticket_id=i.id AND v.status='pending'
        LEFT JOIN mvp_pedido p ON p.ticket_id=i.id AND p.delivery_state IN ('reserved','pending') WHERE i.dono_atual_id=? ORDER BY i.id DESC`,
        [user.id],
      );
      return tickets.map((ticket) => ({
        id: ticket.id,
        eventId: ticket.evento_id,
        eventTitle: ticket.titulo,
        categoryId: ticket.category_id,
        categoryName: ticket.name,
        kind: ticket.kind,
        state: ticket.state,
        originalCents: ticket.original_cents,
        costCents: ticket.cost_cents,
        ceilingCents: tetoRepasse(ticket.original_cents, ticket.cost_cents),
        credential: ticket.credential,
        ownerId: ticket.dono_atual_id,
        listingId: ticket.listing_id,
        invitationId: ticket.invitation_id,
        blocked: Boolean(ticket.invitation_id || ticket.pending_order),
        createdAt: dataISO(ticket.created_at),
      }));
    },

    async credential(user, id) {
      return transaction(async (db) => {
        await lockEvent(db, await findTicketEvent(db, id));
        const ticket = await lockTicket(db, id);
        own(ticket, user);
        valid(ticket);
        const conflict = await conflicts(db, id);
        if (conflict.invitation_id || conflict.order_id)
          falhar(409, 'Resolva a operação pendente antes de usar a credencial.');
        return { ticketId: id, credential: ticket.credential, academic: true };
      });
    },

    async ticketHistory(user, id) {
      const ticket = await one(pool, 'SELECT dono_atual_id FROM ingresso WHERE id=?', [
        inteiro(id),
      ]);
      if (!ticket) falhar(404, 'Ingresso não encontrado.');
      const participated = await one(
        pool,
        'SELECT id FROM mvp_historico WHERE ticket_id=? AND (from_user_id=? OR to_user_id=?) LIMIT 1',
        [id, user.id, user.id],
      );
      if (ticket.dono_atual_id !== user.id && !participated && !user.admin)
        falhar(403, 'Histórico de outra conta.');
      return (
        await rows(pool, 'SELECT * FROM mvp_historico WHERE ticket_id=? ORDER BY id', [id])
      ).map((item) => ({
        id: item.id,
        kind: item.kind,
        fromUserId: item.from_user_id,
        toUserId: item.to_user_id,
        amountCents: item.amount_cents,
        orderId: item.order_id,
        createdAt: dataISO(item.created_at),
      }));
    },

    async enter(user, key, body) {
      campos(body, ['eventId', 'credential']);
      inteiro(body.eventId);
      const credential = texto(body.credential, 'Credencial', 64);
      if (!/^[a-f0-9]{64}$/.test(credential)) falhar(400, 'Credencial demonstrativa inválida.');
      return run(user, key, 'enter', body, async (db) => {
        const event = await lockEvent(db, body.eventId);
        if (event.organizador_id !== user.id && !user.admin)
          falhar(403, 'Portaria permitida apenas ao organizador responsável ou administrador.');
        if (event.status === 'cancelled') falhar(409, 'Evento cancelado.');
        const unit = await one(db, 'SELECT ticket_id FROM mvp_unidade WHERE credential=?', [
          credential,
        ]);
        if (!unit) falhar(409, 'Credencial desconhecida ou revogada.');
        const ticket = await lockTicket(db, unit.ticket_id);
        if (ticket.evento_id !== event.id) falhar(409, 'Credencial de outro evento.');
        valid(ticket);
        const conflict = await conflicts(db, ticket.id);
        if (conflict.invitation_id || conflict.order_id)
          falhar(409, 'Ingresso bloqueado por operação pendente.');
        if (conflict.listing_id)
          await rows(
            db,
            "UPDATE mvp_anuncio SET status='cancelled' WHERE id=? AND status='active'",
            [conflict.listing_id],
          );
        await rows(db, 'INSERT INTO mvp_entrada(ticket_id,operator_id) VALUES(?,?)', [
          ticket.id,
          user.id,
        ]);
        await rows(db, "UPDATE mvp_unidade SET state='used' WHERE ticket_id=?", [ticket.id]);
        await history(db, ticket.id, 'entered', null, ticket.dono_atual_id, 0);
        return { ticketId: ticket.id, accepted: true, academic: true };
      });
    },

    async cancelEvent(user, key, eventId, body) {
      campos(body, ['reason']);
      const reason = texto(body.reason, 'Motivo', 500);
      return run(user, key, `cancelEvent:${eventId}`, body, async (db) => {
        const event = await lockEvent(db, inteiro(eventId));
        if (event.organizador_id !== user.id && !user.admin)
          falhar(403, 'Evento de outro organizador.');
        if (event.status === 'cancelled')
          return { id: eventId, status: 'cancelled', academic: true };
        await rows(db, "UPDATE mvp_evento SET status='cancelled' WHERE evento_id=?", [eventId]);
        const orders = await rows(
          db,
          'SELECT * FROM mvp_pedido WHERE event_id=? ORDER BY id FOR UPDATE',
          [eventId],
        );
        for (const order of orders) await refund(db, order, `Cancelamento do evento: ${reason}`);
        const units = await rows(
          db,
          'SELECT i.id,i.dono_atual_id,u.credential,u.state FROM ingresso i JOIN mvp_unidade u ON u.ticket_id=i.id WHERE i.evento_id=? FOR UPDATE',
          [eventId],
        );
        for (const ticket of units) {
          if (ticket.state !== 'cancelled') {
            await revoke(db, ticket);
            await rows(db, "UPDATE mvp_unidade SET state='cancelled' WHERE ticket_id=?", [
              ticket.id,
            ]);
            await history(db, ticket.id, 'cancelled', null, ticket.dono_atual_id, 0);
          }
        }
        await rows(
          db,
          "UPDATE mvp_anuncio a JOIN ingresso i ON i.id=a.ticket_id SET a.status='cancelled' WHERE i.evento_id=? AND a.status IN ('active','reserved')",
          [eventId],
        );
        await rows(
          db,
          "UPDATE mvp_convite v JOIN ingresso i ON i.id=v.ticket_id SET v.status='cancelled' WHERE i.evento_id=? AND v.status='pending'",
          [eventId],
        );
        await rows(
          db,
          "UPDATE mvp_fila SET status='left' WHERE event_id=? AND status IN ('queued','reserved')",
          [eventId],
        );
        return { id: eventId, status: 'cancelled', academic: true };
      });
    },
  };
}
