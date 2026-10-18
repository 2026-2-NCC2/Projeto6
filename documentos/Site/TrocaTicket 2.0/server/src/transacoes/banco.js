// Pequenas consultas compartilhadas; todas recebem a conexão da transação.
export const rows = async (db, sql, params = []) => (await db.execute(sql, params))[0];
export const one = async (db, sql, params = []) => (await rows(db, sql, params))[0];
export const numeric = (value) => Number(value || 0);
export const openOrder = (order) => ['reserved', 'pending'].includes(order.delivery_state);
