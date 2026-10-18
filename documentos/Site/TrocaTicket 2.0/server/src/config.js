import { readFileSync } from 'node:fs';

export const DATABASE = 'trocaticket_mvp_academico';

export function lerConfig(env = process.env) {
  const host = env.DB_HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Use uma instância MySQL local.');
  if (env.DB_NAME && env.DB_NAME !== DATABASE)
    throw new Error('O MVP usa uma base nova exclusiva.');
  if (!env.DB_USER?.trim()) throw new Error('Informe DB_USER no ambiente local.');
  const password =
    typeof env.DB_PASSWORD === 'string'
      ? env.DB_PASSWORD
      : env.DB_PASSWORD_EMPTY === '1'
        ? ''
        : undefined;
  if (password === undefined) throw new Error('Informe DB_PASSWORD no ambiente local.');
  const port = Number(env.DB_PORT || 3306);
  const httpPort = Number(env.PORT || env.PORTA || 3333);
  if (![port, httpPort].every((p) => Number.isInteger(p) && p > 0 && p <= 65535))
    throw new Error('Porta inválida.');
  return {
    database: DATABASE,
    port: httpPort,
    sessionHours: 8,
    secureCookies: env.SECURE_COOKIES === 'true',
    origins: [
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:4173',
      'http://localhost:4173',
      `http://127.0.0.1:${httpPort}`,
      `http://localhost:${httpPort}`,
    ],
    db: {
      host,
      port,
      user: env.DB_USER.trim(),
      password,
      database: DATABASE,
      charset: 'utf8mb4',
      timezone: 'Z',
      dateStrings: true,
      connectionLimit: 10,
      ...(env.DB_SSL_CA
        ? { ssl: { ca: readFileSync(env.DB_SSL_CA, 'utf8'), rejectUnauthorized: true } }
        : {}),
    },
  };
}
