import { campos, falhar, inteiro, texto } from './regras.js';

// Convite gratuito: o dono só muda no aceite e o custo passa a zero.
export function criarTransferencias(contexto) {
  const {
    run,
    config,
    lockEvent,
    lockTicket,
    own,
    valid,
    conflicts,
    requireLimit,
    allocateQueue,
    revoke,
    history,
    findTicketEvent,
    pool,
    emissor,
    rows,
    one,
    expire,
    invitationDto,
  } = contexto;
  return {
    async invite(user, key, body) {
      campos(body, ['ticketId', 'email']);
      inteiro(body.ticketId);
      const email = texto(body.email, 'Email fictício', 255).toLowerCase();
      return run(user, key, 'invite', body, async (db) => {
        const event = await lockEvent(db, await findTicketEvent(db, body.ticketId), {
          sales: true,
        });
        const ticket = await lockTicket(db, body.ticketId);
        own(ticket, user);
        valid(ticket);
        const recipient = await one(db, 'SELECT id,status_aprovacao FROM usuario WHERE email=?', [
          email,
        ]);
        if (!recipient) falhar(404, 'Conta destinatária não encontrada.');
        if (recipient.id === user.id) falhar(400, 'Escolha outra conta destinatária.');
        if (recipient.status_aprovacao !== 'A')
          falhar(409, 'Conta destinatária ainda não aprovada.');
        const conflict = await conflicts(db, ticket.id);
        if (conflict.listing_id || conflict.invitation_id || conflict.order_id)
          falhar(409, 'Cancele o anúncio ou resolva a operação pendente antes de transferir.');
        await requireLimit(db, recipient.id, event.id, 1);
        const settings = await config(db);
        const inserted = await rows(
          db,
          `INSERT INTO mvp_convite(ticket_id,from_user_id,to_user_id,expires_at) VALUES(?,?,?,TIMESTAMPADD(MINUTE,?,UTC_TIMESTAMP(3)))`,
          [ticket.id, user.id, recipient.id, settings.invitation_minutes],
        );
        return invitationDto(db, inserted.insertId);
      });
    },

    async listInvitations(user) {
      await expire();
      const invites = await rows(
        pool,
        'SELECT id FROM mvp_convite WHERE from_user_id=? OR to_user_id=? ORDER BY id DESC',
        [user.id, user.id],
      );
      return Promise.all(invites.map((item) => invitationDto(pool, item.id)));
    },

    async respondInvitation(user, key, id, action, body = {}) {
      campos(body, []);
      if (!['accept', 'reject', 'cancel'].includes(action)) falhar(400, 'Ação inválida.');
      return run(user, key, `invitation:${id}:${action}`, body, async (db) => {
        const initial = await one(db, 'SELECT ticket_id FROM mvp_convite WHERE id=?', [
          inteiro(id),
        ]);
        if (!initial) falhar(404, 'Convite não encontrado.');
        const event = await lockEvent(db, await findTicketEvent(db, initial.ticket_id));
        const invite = await one(db, 'SELECT * FROM mvp_convite WHERE id=? FOR UPDATE', [id]);
        const expected = action === 'cancel' ? invite.from_user_id : invite.to_user_id;
        if (expected !== user.id) falhar(403, 'Esta conta não pode responder ao convite.');
        if (invite.status !== 'pending') falhar(409, 'Convite já encerrado ou expirado.');
        const ticket = await lockTicket(db, invite.ticket_id);
        valid(ticket);
        if (ticket.dono_atual_id !== invite.from_user_id) falhar(409, 'Titularidade mudou.');
        if (action === 'accept') {
          if (event.status !== 'published') falhar(409, 'Evento não aceita transferência.');
          const recipient = await one(db, 'SELECT status_aprovacao FROM usuario WHERE id=?', [
            user.id,
          ]);
          if (recipient?.status_aprovacao !== 'A')
            falhar(403, 'Conta destinatária ainda não aprovada.');
          if (!emissor.emitir((await config(db)).issuer_scenario).delivered)
            falhar(
              503,
              'Emissor simulado indisponível. Convite continua pendente; tente novamente ou recuse.',
            );
          await requireLimit(db, user.id, event.id, 1, invite.id);
          await revoke(db, ticket);
          await rows(db, 'UPDATE ingresso SET dono_atual_id=? WHERE id=?', [user.id, ticket.id]);
          await rows(db, 'UPDATE mvp_unidade SET cost_cents=0 WHERE ticket_id=?', [ticket.id]);
          await history(db, ticket.id, 'gifted', invite.from_user_id, user.id, 0);
        }
        const status = { accept: 'accepted', reject: 'rejected', cancel: 'cancelled' }[action];
        await rows(db, 'UPDATE mvp_convite SET status=? WHERE id=?', [status, id]);
        await allocateQueue(db, event.id);
        return invitationDto(db, id);
      });
    },
  };
}
