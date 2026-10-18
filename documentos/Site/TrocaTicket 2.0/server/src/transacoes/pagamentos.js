import { campos, falhar } from './regras.js';

// Pagamento e entrega são estados separados; estorno não recria ingresso usado.
export function criarPagamentos(contexto) {
  const {
    run,
    config,
    lockEvent,
    requireLimit,
    allocateQueue,
    deliver,
    refund,
    findOrderEvent,
    pagamento,
    rows,
    one,
    openOrder,
    orderDto,
  } = contexto;
  return {
    async pay(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `pay:${id}`, body, async (db) => {
        const event = await lockEvent(db, await findOrderEvent(db, id));
        const order = await one(db, 'SELECT * FROM mvp_pedido WHERE id=? FOR UPDATE', [id]);
        if (order.user_id !== user.id) falhar(403, 'Pedido de outra conta.');
        if (
          order.payment_state === 'approved' ||
          order.delivery_state === 'delivered' ||
          order.payment_state === 'refunded'
        )
          return orderDto(db, id, user);
        if (event.status !== 'published' || order.delivery_state !== 'reserved')
          falhar(409, 'Reserva expirada, cancelada ou indisponível.');
        await requireLimit(db, user.id, event.id, order.quantity, 0, order.id);
        const settings = await config(db);
        const result = pagamento.confirmar(settings.payment_scenario, order.amount_cents);
        await rows(
          db,
          'UPDATE mvp_pedido SET payment_state=?,updated_at=UTC_TIMESTAMP(3) WHERE id=?',
          [result.state, id],
        );
        order.payment_state = result.state;
        if (result.state !== 'approved') {
          await refund(db, order, `Pagamento ${result.state}`);
          await allocateQueue(db, event.id);
        } else await deliver(db, order, settings);
        return orderDto(db, id, user);
      });
    },

    async recover(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `recover:${id}`, body, async (db) => {
        const event = await lockEvent(db, await findOrderEvent(db, id));
        const order = await one(db, 'SELECT * FROM mvp_pedido WHERE id=? FOR UPDATE', [id]);
        if (order.user_id !== user.id && !user.admin) falhar(403, 'Pedido de outra conta.');
        if (order.delivery_state === 'delivered' || order.delivery_state === 'refunded')
          return orderDto(db, id, user);
        if (
          event.status === 'cancelled' ||
          order.payment_state !== 'approved' ||
          order.delivery_state !== 'pending'
        )
          falhar(409, 'Pedido não tem entrega pendente recuperável.');
        await deliver(db, order, await config(db));
        return orderDto(db, id, user);
      });
    },

    async refund(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `refund:${id}`, body, async (db) => {
        const event = await lockEvent(db, await findOrderEvent(db, id));
        const order = await one(db, 'SELECT * FROM mvp_pedido WHERE id=? FOR UPDATE', [id]);
        if (order.user_id !== user.id && !user.admin) falhar(403, 'Pedido de outra conta.');
        if (order.delivery_state === 'refunded' || order.delivery_state === 'cancelled')
          return orderDto(db, id, user);
        if (!openOrder(order))
          falhar(409, 'Estorno direto disponível apenas antes da entrega. Abra um atendimento.');
        await refund(db, order, 'Solicitação antes da entrega');
        await allocateQueue(db, event.id);
        return orderDto(db, id, user);
      });
    },

    async cancelOrder(user, key, id, body = {}) {
      campos(body, []);
      return run(user, key, `cancelOrder:${id}`, body, async (db) => {
        const event = await lockEvent(db, await findOrderEvent(db, id));
        const order = await one(db, 'SELECT * FROM mvp_pedido WHERE id=? FOR UPDATE', [id]);
        if (order.user_id !== user.id) falhar(403, 'Pedido de outra conta.');
        if (['cancelled', 'expired'].includes(order.delivery_state)) return orderDto(db, id, user);
        if (order.payment_state === 'approved' || order.delivery_state !== 'reserved')
          falhar(409, 'Pedido pago ou entregue precisa do fluxo de estorno/atendimento.');
        await refund(db, order, 'Desistência de reserva não paga');
        await allocateQueue(db, event.id);
        return orderDto(db, id, user);
      });
    },
  };
}
