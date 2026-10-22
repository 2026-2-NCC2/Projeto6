import mysql from 'mysql2/promise';

export function criarPool(config) {
  return mysql.createPool(config.db);
}

export async function transacao(pool, callback) {
  const connection = await pool.getConnection();
  try {
    // Leituras após esperar um lock observam a decisão já confirmada pela outra operação.
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
