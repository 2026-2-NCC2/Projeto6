import 'dotenv/config';
import { lerConfig } from '../src/config.js';
import { criarPool } from '../src/db.js';
import { migrar } from '../src/migrations.js';
import { seed } from '../src/seed.js';
let pool;
try {
  pool = criarPool(lerConfig());
  await migrar(pool);
  console.log(
    JSON.stringify(await seed(pool, { password: process.env.DEMO_PASSWORD || undefined })),
  );
  console.log(
    'Contas exclusivamente fictícias. Consulte o roteiro local para os emails de demonstração.',
  );
} catch (error) {
  console.error(
    error.code
      ? 'Seed não concluído. Confira o serviço, as credenciais e o histórico da base nova.'
      : error.message,
  );
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
