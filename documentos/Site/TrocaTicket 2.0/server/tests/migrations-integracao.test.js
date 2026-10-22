import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname } from 'node:path';

const enabled = process.env.TESTE_MYSQL_ISOLADO === '1';
const normalize = (path) => path.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();

test(
  'Migração recusa metadados divergentes sem DDL e preserva o histórico após rollback',
  { skip: !enabled, timeout: 60000 },
  async (t) => {
    const { default: mysql } = await import('mysql2/promise');
    const { migrar, estruturaHash } = await import('../src/migrations.js');
    const port = Number(process.env.TESTE_MYSQL_PORTA),
      dataDir = resolve(process.env.TESTE_MYSQL_DIRETORIO || '.'),
      ca = resolve(process.env.TESTE_MYSQL_CA || '.');
    assert.ok(port > 1024 && port !== 3306 && port <= 65535);
    assert.ok(basename(dataDir).startsWith('mysql-qa-') && basename(dirname(dataDir)) === 'tmp');
    assert.equal(dirname(ca), dataDir);
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      port,
      user: 'root',
      password: '',
      database: 'trocaticket_mvp_academico',
      dateStrings: true,
      timezone: 'Z',
      ssl: { ca: await readFile(ca), rejectUnauthorized: true },
    });
    const evidence = [];
    let identity;
    // O runner deve enxergar a alteração da própria transação sem fechar esta conexão.
    const adapter = {
      getConnection: async () => ({
        query: db.query.bind(db),
        execute: db.execute.bind(db),
        release() {},
      }),
    };
    async function history() {
      return (
        await db.execute(
          'SELECT versao,checksum,estrutura_hash,aplicada_em FROM mvp_migracao ORDER BY versao',
        )
      )[0];
    }
    async function counts() {
      const [tables] = await db.execute(
        "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name",
      );
      const result = {};
      for (const table of tables) {
        assert.match(table.name, /^[a-z0-9_]+$/);
        const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM \`${table.name}\``);
        result[table.name] = Number(count.total);
      }
      return result;
    }
    try {
      [[identity]] = await db.query(
        'SELECT VERSION() AS version,@@datadir AS dir,DATABASE() AS banco,@@foreign_key_checks AS fk,@@unique_checks AS uq',
      );
      assert.equal(identity.version, '8.0.46');
      assert.equal(identity.banco, 'trocaticket_mvp_academico');
      assert.equal(normalize(identity.dir), normalize(dataDir));
      assert.equal(identity.fk, 1);
      assert.equal(identity.uq, 1);
      const beforeHistory = await history(),
        beforeStructure = await estruturaHash(db),
        beforeCounts = await counts();
      assert.ok(
        beforeHistory.length >= 3,
        'Histórico válido previamente aplicado pelo ensaio principal',
      );
      const last = beforeHistory.at(-1);
      assert.equal(last.estrutura_hash, beforeStructure);
      for (const [field, message, id] of [
        ['checksum', /Histórico\/checksum divergente/, 'M01'],
        ['estrutura_hash', /Estrutura divergente do histórico/, 'M02'],
      ]) {
        await t.test(
          `${id} Recusa de ${field} divergente em transação não confirmada`,
          async () => {
            let refusal;
            await db.beginTransaction();
            try {
              const changed = last[field] === '0'.repeat(64) ? '1'.repeat(64) : '0'.repeat(64);
              // Campo fechado pela lista acima; valor e identificador continuam parametrizados.
              await db.execute(`UPDATE mvp_migracao SET ${field}=? WHERE versao=?`, [
                changed,
                last.versao,
              ]);
              await assert.rejects(migrar(adapter), (error) => {
                refusal = error.message;
                return message.test(error.message);
              });
            } finally {
              // Mesmo se o runner não recusar como esperado, não confirmar a corrupção de teste.
              await db.rollback();
            }
            assert.deepEqual(
              await history(),
              beforeHistory,
              'Metadados originais restaurados por rollback',
            );
            assert.equal(
              await estruturaHash(db),
              beforeStructure,
              'Nenhuma definição de tabela alterada',
            );
            assert.deepEqual(
              await counts(),
              beforeCounts,
              'Nenhuma linha de negócio criada, removida ou alterada pelo ensaio',
            );
            evidence.push({
              id,
              teste: `Recusa de ${field} divergente`,
              esperado:
                'Runner recusa antes de DDL; ROLLBACK restaura os metadados; estrutura e contagens iguais.',
              observado: {
                recusa: refusal,
                rollback: 'Histórico idêntico ao original',
                estrutura: 'Fingerprint idêntico',
                contagens: 'Todas as tabelas com contagem preservada',
              },
              resultado: 'aprovado',
            });
          },
        );
      }
      await t.test('M03 Histórico íntegro permite reaplicação sem DDL', async () => {
        const result = await migrar(adapter);
        assert.deepEqual(result.applied, []);
        assert.equal(result.unchanged, beforeHistory.length);
        assert.deepEqual(await history(), beforeHistory);
        assert.equal(await estruturaHash(db), beforeStructure);
        assert.deepEqual(await counts(), beforeCounts);
        evidence.push({
          id: 'M03',
          teste: 'Reaplicação com histórico restaurado',
          esperado: 'Zero migrações novas e nenhum dado/DDL alterado.',
          observado: {
            applied: result.applied,
            unchanged: result.unchanged,
            estrutura: 'Fingerprint idêntico',
            contagens: 'Preservadas',
          },
          resultado: 'aprovado',
        });
      });
    } finally {
      // Proteção adicional de encerramento; não há COMMIT de metadados neste arquivo.
      await db.rollback();
      await db.end();
      const output = new URL('../../docs/validacao/polimento/', import.meta.url);
      await mkdir(output, { recursive: true });
      await writeFile(
        new URL('migrations-mysql.json', output),
        JSON.stringify(
          {
            dataUtc: new Date().toISOString(),
            instance: {
              version: identity?.version || null,
              port,
              isolation: 'Instância exclusiva conferida; M1 e conexão pessoal não acessados',
            },
            escopo:
              'Corrupção temporária de checksum e estrutura_hash em metadados, revertida com ROLLBACK. Não foi feito ALTER de esquema real.',
            resultados: evidence,
          },
          null,
          2,
        ) + '\n',
      );
    }
  },
);
