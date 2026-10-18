import { campos, falhar, inteiro, texto } from './regras.js';

// Solicitações e configurações administrativas da demonstração.
export function criarAtendimentoConfiguracao(contexto) {
  const { run, config, pool, rows, one, orderDto, supportDto } = contexto;
  return {
    async getConfig(user) {
      if (!user.admin) falhar(403, 'Somente administrador.');
      const item = await config(pool);
      return {
        paymentScenario: item.payment_scenario,
        issuerScenario: item.issuer_scenario,
        reservationMinutes: item.reservation_minutes,
        invitationMinutes: item.invitation_minutes,
        accountLimit: item.account_limit,
      };
    },

    async configure(user, key, body) {
      campos(body, [
        'paymentScenario',
        'issuerScenario',
        'reservationMinutes',
        'invitationMinutes',
        'accountLimit',
      ]);
      if (!user.admin) falhar(403, 'Somente administrador.');
      return run(user, key, 'configure', body, async (db) => {
        const previous = await one(db, 'SELECT * FROM mvp_config WHERE id=1 FOR UPDATE');
        const setting = (key, column) => (Object.hasOwn(body, key) ? body[key] : previous[column]);
        const paymentScenario = setting('paymentScenario', 'payment_scenario'),
          issuerScenario = setting('issuerScenario', 'issuer_scenario');
        if (
          !['approved', 'rejected', 'unavailable'].includes(paymentScenario) ||
          !['success', 'temporary_failure'].includes(issuerScenario)
        )
          falhar(400, 'Cenário local inválido.');
        const reservationMinutes = inteiro(
          setting('reservationMinutes', 'reservation_minutes'),
          'Janela de reserva',
          1,
          60,
        );
        const invitationMinutes = inteiro(
          setting('invitationMinutes', 'invitation_minutes'),
          'Janela de convite',
          1,
          60,
        );
        const accountLimit = inteiro(
          setting('accountLimit', 'account_limit'),
          'Limite por conta',
          1,
          20,
        );
        await rows(
          db,
          'UPDATE mvp_config SET payment_scenario=?,issuer_scenario=?,reservation_minutes=?,invitation_minutes=?,account_limit=? WHERE id=1',
          [paymentScenario, issuerScenario, reservationMinutes, invitationMinutes, accountLimit],
        );
        return {
          paymentScenario,
          issuerScenario,
          reservationMinutes,
          invitationMinutes,
          accountLimit,
          academic: true,
        };
      });
    },

    async createSupport(user, key, body) {
      campos(body, ['orderId', 'listingId', 'subject', 'message']);
      const subject = texto(body.subject, 'Assunto', 150),
        message = texto(body.message, 'Mensagem', 2000);
      if (!body.orderId && !body.listingId) falhar(400, 'Vincule um pedido ou anúncio.');
      return run(user, key, 'support', body, async (db) => {
        if (body.orderId) await orderDto(db, inteiro(body.orderId), user);
        if (body.listingId) {
          const listing = await one(
            db,
            `SELECT a.id,a.seller_id,a.status,m.status event_status,
            EXISTS(SELECT 1 FROM mvp_pedido p WHERE p.listing_id=a.id AND p.user_id=?) buyer
            FROM mvp_anuncio a JOIN ingresso i ON i.id=a.ticket_id JOIN mvp_evento m ON m.evento_id=i.evento_id WHERE a.id=?`,
            [user.id, inteiro(body.listingId)],
          );
          if (!listing) falhar(404, 'Anúncio não encontrado.');
          if (
            !user.admin &&
            listing.seller_id !== user.id &&
            !listing.buyer &&
            !(listing.event_status !== 'draft' && ['active', 'reserved'].includes(listing.status))
          )
            falhar(403, 'Anúncio não acessível a esta conta.');
        }
        const inserted = await rows(
          db,
          'INSERT INTO mvp_atendimento(user_id,order_id,listing_id,subject) VALUES(?,?,?,?)',
          [user.id, body.orderId || null, body.listingId || null, subject],
        );
        await rows(
          db,
          'INSERT INTO mvp_atendimento_mensagem(support_id,user_id,message) VALUES(?,?,?)',
          [inserted.insertId, user.id, message],
        );
        return supportDto(db, inserted.insertId);
      });
    },

    async listSupport(user) {
      const items = await rows(
        pool,
        `SELECT id FROM mvp_atendimento ${user.admin ? '' : 'WHERE user_id=?'} ORDER BY id DESC`,
        user.admin ? [] : [user.id],
      );
      return Promise.all(items.map((item) => supportDto(pool, item.id)));
    },

    async answerSupport(user, key, id, body) {
      campos(body, ['message', 'status']);
      if (!user.admin) falhar(403, 'Somente administrador responde atendimento.');
      const message = texto(body.message, 'Resposta', 2000);
      if (!['open', 'reviewing', 'closed'].includes(body.status))
        falhar(400, 'Estado de atendimento inválido.');
      return run(user, key, `answerSupport:${id}`, body, async (db) => {
        const support = await one(db, 'SELECT id FROM mvp_atendimento WHERE id=? FOR UPDATE', [
          inteiro(id),
        ]);
        if (!support) falhar(404, 'Atendimento não encontrado.');
        await rows(
          db,
          'INSERT INTO mvp_atendimento_mensagem(support_id,user_id,message) VALUES(?,?,?)',
          [id, user.id, message],
        );
        await rows(db, 'UPDATE mvp_atendimento SET status=? WHERE id=?', [body.status, id]);
        return supportDto(db, id);
      });
    },
  };
}
