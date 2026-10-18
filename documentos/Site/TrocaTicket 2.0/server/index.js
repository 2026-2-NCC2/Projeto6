import 'dotenv/config';
import { criarApp } from './src/app.js';
import { lerConfig } from './src/config.js';
import { criarPool } from './src/db.js';
import { migrar } from './src/migrations.js';

let pool, server, timer;
try {
  const config = lerConfig();
  pool = criarPool(config);
  // Confere checksums e estrutura; nenhuma base existente sem histórico é adotada.
  await migrar(pool);
  const app = criarApp({ pool, config });
  await app.locals.transacoes.expire();
  timer = setInterval(
    () =>
      app.locals.transacoes
        .expire()
        .catch(() =>
          console.error(
            'Reconciliação local indisponível; as requisições também verificam os prazos.',
          ),
        ),
    30000,
  );
  timer.unref();
  server = app.listen(config.port, '127.0.0.1', () =>
    console.log(`TrocaTicket acadêmico: http://127.0.0.1:${config.port}/api/saude`),
  );
  server.on('error', async () => {
    console.error('Não foi possível abrir a porta local da API.');
    clearInterval(timer);
    await pool.end();
    process.exitCode = 1;
  });
} catch (error) {
  console.error(
    error.code
      ? 'Não foi possível iniciar. Confira o serviço, a base nova e as credenciais locais.'
      : error.message,
  );
  if (pool) await pool.end();
  process.exitCode = 1;
}
let shuttingDown = false;
async function parar() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(timer);
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) await pool.end();
}
process.once('SIGINT', parar);
process.once('SIGTERM', parar);
