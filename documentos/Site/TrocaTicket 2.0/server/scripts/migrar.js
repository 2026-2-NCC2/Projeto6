import 'dotenv/config';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { lerConfig, DATABASE } from '../src/config.js';
import { criarPool } from '../src/db.js';
import { migrar, versaoCompativel } from '../src/migrations.js';

export async function prepararBanco(config) {
  const { database, connectionLimit, ...base } = config.db;
  const db = await mysql.createConnection(base);
  try {
    const [[env]] = await db.query(
      'SELECT VERSION() AS version,@@foreign_key_checks AS fk,@@unique_checks AS uq',
    );
    if (!versaoCompativel(env.version) || env.fk !== 1 || env.uq !== 1)
      throw new Error('Requer MySQL 8.0.16+ com integridade ativa.');
    const [rows] = await db.execute(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name=?',
      [DATABASE],
    );
    if (!rows.length)
      await db.query(
        `CREATE DATABASE \`${DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
  } finally {
    await db.end();
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()
) {
  let pool;
  try {
    const config = lerConfig();
    await prepararBanco(config);
    pool = criarPool(config);
    console.log(JSON.stringify(await migrar(pool)));
  } catch (error) {
    console.error(
      error.code
        ? 'Não foi possível conectar/aplicar. Confira o serviço, as credenciais locais e a integridade da migração.'
        : error.message,
    );
    process.exitCode = 1;
  } finally {
    if (pool) await pool.end();
  }
}
