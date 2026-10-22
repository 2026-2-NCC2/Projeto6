import { one, rows, numeric } from './banco.js';
import { dataISO, falhar } from './regras.js';

// Conversão de linhas do MySQL para os formatos públicos usados pelas telas.
export async function orderDto(db, orderId, user) {
  const order = await one(
    db,
    'SELECT p.*,e.titulo FROM mvp_pedido p JOIN evento e ON e.id=p.event_id WHERE p.id=?',
    [orderId],
  );
  if (!order) falhar(404, 'Pedido não encontrado.');
  if (user && order.user_id !== user.id && !user.admin) falhar(403, 'Pedido de outra conta.');
  const units = await rows(
    db,
    'SELECT ticket_id FROM mvp_pedido_unidade WHERE order_id=? ORDER BY ticket_id',
    [orderId],
  );
  return {
    id: order.id,
    eventId: order.event_id,
    eventTitle: order.titulo,
    categoryId: order.category_id,
    quantity: order.quantity,
    kind: order.kind,
    amountCents: order.amount_cents,
    paymentState: order.payment_state,
    deliveryState: order.delivery_state,
    expiresAt: dataISO(order.expires_at),
    ticketIds: units.map((unit) => unit.ticket_id),
    createdAt: dataISO(order.created_at),
    academic: true,
    realChargeCents: 0,
  };
}

export async function queueDto(db, id) {
  const item = await one(
    db,
    `SELECT f.*,(SELECT COUNT(*) FROM mvp_fila q WHERE q.event_id=f.event_id AND q.category_id=f.category_id AND q.status='queued' AND (q.created_at<f.created_at OR(q.created_at=f.created_at AND q.id<=f.id))) position FROM mvp_fila f WHERE f.id=?`,
    [id],
  );
  return {
    id: item.id,
    eventId: item.event_id,
    categoryId: item.category_id,
    status: item.status,
    position: item.status === 'queued' ? numeric(item.position) : null,
    orderId: item.order_id,
    createdAt: dataISO(item.created_at),
  };
}

export async function invitationDto(db, id) {
  const item = await one(
    db,
    'SELECT v.*,e.titulo FROM mvp_convite v JOIN ingresso i ON i.id=v.ticket_id JOIN evento e ON e.id=i.evento_id WHERE v.id=?',
    [id],
  );
  return {
    id: item.id,
    ticketId: item.ticket_id,
    fromUserId: item.from_user_id,
    toUserId: item.to_user_id,
    status: item.status,
    expiresAt: dataISO(item.expires_at),
    eventTitle: item.titulo,
  };
}

export async function supportDto(db, id) {
  const item = await one(db, 'SELECT * FROM mvp_atendimento WHERE id=?', [id]);
  const messages = await rows(
    db,
    'SELECT id,user_id,message,created_at FROM mvp_atendimento_mensagem WHERE support_id=? ORDER BY id',
    [id],
  );
  return {
    id: item.id,
    userId: item.user_id,
    orderId: item.order_id,
    listingId: item.listing_id,
    subject: item.subject,
    status: item.status,
    createdAt: dataISO(item.created_at),
    messages: messages.map((message) => ({
      id: message.id,
      userId: message.user_id,
      message: message.message,
      createdAt: dataISO(message.created_at),
    })),
  };
}
