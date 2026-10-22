import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { DATABASE } from './config.js';

const pasta = new URL('../migrations/', import.meta.url);
const hash = (value) => createHash('sha256').update(value).digest('hex');

export function versaoCompativel(value) {
  const version = /^(\d+)\.(\d+)\.(\d+)/.exec(String(value));
  return Boolean(
    version &&
    !/MariaDB/i.test(value) &&
    Number(version[1]) === 8 &&
    (Number(version[2]) > 0 || Number(version[3]) >= 16),
  );
}

// Separador pequeno que respeita literais e comentários SQL. Não ativa multipleStatements.
export function separarSql(source) {
  const result = [];
  let current = '',
    quote = null,
    comment = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i],
      next = source[i + 1];
    if (comment === 'line') {
      if (ch === '\n') {
        comment = null;
        current += '\n';
      }
      continue;
    }
    if (comment === 'block') {
      if (ch === '*' && next === '/') {
        comment = null;
        i++;
      }
      continue;
    }
    if (quote) {
      current += ch;
      if (ch === '\\' && next) {
        current += next;
        i++;
      } else if (ch === quote) {
        if (next === quote) {
          current += next;
          i++;
        } else quote = null;
      }
      continue;
    }
    if (ch === '-' && next === '-' && /\s/.test(source[i + 2] || ' ')) {
      comment = 'line';
      i++;
      continue;
    }
    if (ch === '#') {
      comment = 'line';
      continue;
    }
    if (ch === '/' && next === '*') {
      comment = 'block';
      i++;
      continue;
    }
    if (["'", '"', '`'].includes(ch)) {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ';') {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (quote || comment === 'block') throw new Error('SQL incompleto.');
  if (current.trim()) result.push(current.trim());
  return result;
}

export async function estruturaHash(db) {
  const [tables] = await db.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name",
  );
  const definitions = [];
  for (const table of tables) {
    const name = table.TABLE_NAME || table.table_name;
    if (name === 'mvp_migracao') continue;
    if (!/^[a-z0-9_]+$/.test(name)) throw new Error('Tabela inesperada no destino do MVP.');
    const [[row]] = await db.query(`SHOW CREATE TABLE \`${name}\``);
    definitions.push(String(row['Create Table']).replace(/ AUTO_INCREMENT=\d+/g, ''));
  }
  const [extras] =
    await db.execute(`SELECT 'routine' AS kind,routine_name AS name FROM information_schema.routines WHERE routine_schema=DATABASE()
    UNION ALL SELECT 'trigger',trigger_name FROM information_schema.triggers WHERE trigger_schema=DATABASE()
    UNION ALL SELECT 'event',event_name FROM information_schema.events WHERE event_schema=DATABASE()
    UNION ALL SELECT 'view',table_name FROM information_schema.views WHERE table_schema=DATABASE() ORDER BY kind,name`);
  if (extras.length)
    throw new Error('Objetos inesperados na base do MVP; diagnostique a divergência.');
  return hash(definitions.join('\n'));
}

export async function migrar(pool) {
  const db = await pool.getConnection();
  let locked = false;
  try {
    const [[env]] = await db.query(
      'SELECT DATABASE() AS banco,VERSION() AS versao,@@foreign_key_checks AS fk,@@unique_checks AS uq,@@sql_mode AS mode',
    );
    if (
      env.banco !== DATABASE ||
      !versaoCompativel(env.versao) ||
      env.fk !== 1 ||
      env.uq !== 1 ||
      !String(env.mode).includes('STRICT_TRANS_TABLES')
    )
      throw new Error('Destino, versão ou integridade incompatíveis. O M1 não é destino do MVP.');
    const [[lock]] = await db.query("SELECT GET_LOCK('trocaticket_mvp_migracoes',10) AS acquired");
    if (lock.acquired !== 1) throw new Error('Outra migração está em andamento.');
    locked = true;
    const [tables] = await db.execute(
      'SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()',
    );
    const historyExists = tables.some((v) => (v.TABLE_NAME || v.table_name) === 'mvp_migracao');
    if (!historyExists) {
      if (tables.length)
        throw new Error('Base existente sem histórico: nenhuma tabela foi adotada ou alterada.');
      await db.query(
        `CREATE TABLE mvp_migracao(versao VARCHAR(80) NOT NULL PRIMARY KEY,checksum CHAR(64) NOT NULL,estrutura_hash CHAR(64) NOT NULL,aplicada_em DATETIME(3) NOT NULL DEFAULT(UTC_TIMESTAMP(3))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    }
    const [applied] = await db.execute(
      'SELECT versao,checksum,estrutura_hash FROM mvp_migracao ORDER BY versao',
    );
    const files = (await readdir(pasta)).filter((v) => /^\d{3}_[a-z0-9_]+\.sql$/.test(v)).sort();
    const migrations = await Promise.all(
      files.map(async (name) => {
        const sql = await readFile(new URL(name, pasta), 'utf8');
        return { name, sql, checksum: hash(sql) };
      }),
    );
    for (let i = 0; i < applied.length; i++) {
      if (
        !migrations[i] ||
        applied[i].versao !== migrations[i].name ||
        applied[i].checksum !== migrations[i].checksum
      )
        throw new Error('Histórico/checksum divergente. Não edite migração já aplicada.');
    }
    if (applied.length && (await estruturaHash(db)) !== applied.at(-1).estrutura_hash)
      throw new Error('Estrutura divergente do histórico: nenhuma migração foi aplicada.');
    if (!applied.length && tables.length > (historyExists ? 1 : 0))
      throw new Error('Migração anterior incompleta; preservar e diagnosticar o destino.');
    const executed = [];
    for (const migration of migrations.slice(applied.length)) {
      for (const statement of separarSql(migration.sql)) await db.query(statement);
      await db.execute('INSERT INTO mvp_migracao(versao,checksum,estrutura_hash) VALUES(?,?,?)', [
        migration.name,
        migration.checksum,
        await estruturaHash(db),
      ]);
      executed.push(migration.name);
    }
    return { database: DATABASE, applied: executed, unchanged: applied.length };
  } finally {
    if (locked) await db.query("SELECT RELEASE_LOCK('trocaticket_mvp_migracoes')");
    db.release();
  }
}
