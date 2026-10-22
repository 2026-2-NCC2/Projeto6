import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';

const enabled = process.env.TESTE_MYSQL_ISOLADO === '1';
const password = 'Demo-Academica-2026!'; // Exclusivamente contas fictícias desta demonstração.
const normalize = (path) => path.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
const successful = (response) => response.status >= 200 && response.status < 300;

test(
  'Aceite do MVP: HTTP e transações no MySQL exclusivo',
  { skip: !enabled, timeout: 180000 },
  async (t) => {
    const { default: mysql } = await import('mysql2/promise');
    const { criarApp } = await import('../src/app.js');
    const { migrar, estruturaHash } = await import('../src/migrations.js');
    const { seed } = await import('../src/seed.js');
    const port = Number(process.env.TESTE_MYSQL_PORTA);
    const dataDir = resolve(process.env.TESTE_MYSQL_DIRETORIO || '.');
    const ca = resolve(process.env.TESTE_MYSQL_CA || '.');
    assert.ok(port > 1024 && port !== 3306 && port <= 65535, 'Somente porta exclusiva de ensaio');
    assert.ok(basename(dataDir).startsWith('mysql-qa-') && basename(dirname(dataDir)) === 'tmp');
    assert.equal(dirname(ca), dataDir);
    const dbOptions = {
      host: '127.0.0.1',
      port,
      user: 'root',
      password: '',
      charset: 'utf8mb4',
      timezone: 'Z',
      dateStrings: true,
      ssl: { ca: await readFile(ca), rejectUnauthorized: true },
      connectionLimit: 12,
    };
    const bootstrap = await mysql.createConnection(dbOptions);
    const [[identity]] = await bootstrap.query('SELECT VERSION() AS version,@@datadir AS dir');
    assert.equal(identity.version, '8.0.46');
    assert.equal(
      normalize(identity.dir),
      normalize(dataDir),
      'Identidade da instância antes de escrita',
    );
    const database = 'trocaticket_mvp_academico';
    const [[exists]] = await bootstrap.execute(
      'SELECT COUNT(*) AS total FROM information_schema.schemata WHERE schema_name=?',
      [database],
    );
    if (!exists.total)
      await bootstrap.query(
        'CREATE DATABASE trocaticket_mvp_academico CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      );
    await bootstrap.end();
    const pool = mysql.createPool({ ...dbOptions, database });
    const evidence = [];
    let server;
    let base;
    const config = { database, origins: ['http://127.0.0.1:5173'], sessionHours: 8 };
    async function start() {
      const app = criarApp({ pool, config });
      server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      base = `http://127.0.0.1:${server.address().port}/api`;
      return app;
    }
    async function stop() {
      if (server) {
        await new Promise((done) => server.close(done));
        server = null;
      }
    }
    class Client {
      constructor() {
        this.cookie = '';
        this.csrf = '';
        this.user = null;
      }
      async request(path, method = 'GET', body, key, extraHeaders = {}) {
        const headers = { Origin: 'http://127.0.0.1:5173', ...extraHeaders };
        if (this.cookie) headers.Cookie = this.cookie;
        if (this.csrf) headers['X-CSRF-Token'] = this.csrf;
        if (method !== 'GET') {
          headers['Content-Type'] = 'application/json';
          headers['Idempotency-Key'] = key || randomUUID();
        }
        const response = await fetch(base + path, {
          method,
          headers,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const cookie = response.headers.get('set-cookie');
        if (cookie) this.cookie = cookie.split(';')[0];
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = { invalidJson: true };
        }
        if (successful(response) && data && Object.hasOwn(data, 'csrfToken')) {
          this.csrf = data.csrfToken;
          this.user = data.user;
        }
        return { status: response.status, data, cookie, headers: response.headers };
      }
      async login(email) {
        return must(await this.request('/auth/login', 'POST', { email, password }));
      }
    }
    function must(response, expected) {
      assert.ok(
        expected ? response.status === expected : successful(response),
        `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    }
    function denied(response) {
      assert.ok(
        [400, 401, 403, 404, 409].includes(response.status),
        `Operação deveria ser recusada: ${response.status}`,
      );
    }
    async function scenario(id, name, work) {
      await t.test(`${id} ${name}`, async () => {
        try {
          await work();
          evidence.push({
            id,
            teste: name,
            esperado: 'Asserções do caso satisfeitas',
            observado: 'Executado com HTTP, sessões e MySQL real',
            resultado: 'aprovado',
          });
        } catch (error) {
          evidence.push({
            id,
            teste: name,
            esperado: 'Asserções do caso satisfeitas',
            observado: String(error.message).slice(0, 800),
            resultado: 'reprovado',
          });
          throw error;
        }
      });
    }
    async function newUser(role = 'comprador') {
      const client = new Client();
      const email = `fixture.${role}.${randomUUID()}@example.com`;
      must(
        await client.request('/auth/register', 'POST', {
          name: 'Pessoa Fictícia de Ensaio',
          email,
          password,
          role,
        }),
        201,
      );
      if (role !== 'comprador')
        must(
          await admin.request(`/admin/usuarios/${client.user.id}/aprovacao`, 'PATCH', {
            approval: 'A',
          }),
        );
      return client;
    }
    async function newEvent(label, capacity = 10, price = 10000, half = false) {
      return must(
        await org.request('/eventos', 'POST', {
          title: `Evento Fictício ${label} ${randomUUID().slice(0, 8)}`,
          description: 'Somente ensaio acadêmico.',
          dateISO: '2030-11-20T21:00:00Z',
          endsAt: '2030-11-21T02:00:00Z',
          venue: 'Auditório Fictício',
          category: 'Cultural',
          capacity,
          status: 'published',
          categories: [
            {
              name: half ? 'Meia-entrada fictícia' : 'Inteira',
              kind: half ? 'half' : 'full',
              priceCents: price,
              stock: capacity,
              salesOpen: true,
            },
          ],
        }),
        201,
      );
    }
    async function purchase(client, event, quantity = 1) {
      const order = must(
        await client.request('/pedidos', 'POST', {
          categoryId: event.categories[0].id,
          quantity,
          ...(event.categories[0].kind === 'half' ? { halfDeclaration: true } : {}),
        }),
      );
      return must(await client.request(`/pedidos/${order.id}/pagar`, 'POST', {}));
    }
    async function wallet(client) {
      return must(await client.request('/ingressos'));
    }
    async function configDemo(values) {
      return must(await admin.request('/demo/config', 'PATCH', values));
    }
    const admin = new Client(),
      org = new Client(),
      ana = new Client(),
      bruna = new Client(),
      caio = new Client();
    let chain;
    try {
      await migrar(pool);
      await seed(pool, { password });
      await start();
      await admin.login('admin.demo@example.com');
      await org.login('organizador.demo@example.com');
      await ana.login('ana.demo@example.com');
      await bruna.login('bruna.demo@example.com');
      await caio.login('caio.demo@example.com');
      await configDemo({ paymentScenario: 'approved', issuerScenario: 'success' });

      await scenario('T01', 'Cadastro, hash, sessão, logout e proteção CSRF', async () => {
        const person = await newUser();
        const [[stored]] = await pool.execute('SELECT senha_hash FROM usuario WHERE id=?', [
          person.user.id,
        ]);
        assert.notEqual(stored.senha_hash, password);
        assert.match(stored.senha_hash, /scrypt/);
        const session = await person.request('/auth/session');
        assert.equal(session.data.user.id, person.user.id);
        assert.ok(!JSON.stringify(session.data).includes('senha_hash'));
        const noCsrf = new Client();
        noCsrf.cookie = person.cookie;
        denied(await noCsrf.request('/perfil', 'PUT', { name: 'Alteração Fictícia' }));
        const external = await person.request(
          '/perfil',
          'PUT',
          { name: 'Alteração Fictícia' },
          undefined,
          { Origin: 'https://example.com' },
        );
        assert.equal(external.status, 403);
        const login = await person.request('/auth/login', 'POST', {
          email: person.user.email,
          password,
        });
        assert.match(login.cookie, /HttpOnly/i);
        assert.match(login.cookie, /SameSite=Lax/i);
        must(await person.request('/auth/logout', 'POST', {}), 204);
        denied(await person.request('/perfil'));
      });
      await scenario('T02', 'Permissões, aprovação e isolamento entre contas', async () => {
        denied(
          await ana.request('/auth/register', 'POST', {
            name: 'Administrador Fictício',
            email: `nao.admin.${randomUUID()}@example.com`,
            password,
            role: 'admin',
            admin: true,
          }),
        );
        denied(await ana.request('/demo/config', 'PATCH', { paymentScenario: 'approved' }));
        denied(await ana.request('/perfil', 'PUT', { admin: true, role: 'organizador' }));
        const pending = new Client();
        must(
          await pending.request('/auth/register', 'POST', {
            name: 'Fornecedor Fictício Pendente',
            email: `pending.${randomUUID()}@example.com`,
            password,
            role: 'fornecedor',
          }),
        );
        assert.equal(pending.user.approval, 'P');
        denied(
          await pending.request('/produtos', 'POST', {
            name: 'Item Fictício',
            description: 'Teste',
            type: 'P',
            priceCents: 100,
            stock: 1,
            active: true,
          }),
        );
        const event = await newEvent('Propriedade');
        const otherOrg = await newUser('organizador');
        denied(
          await otherOrg.request(`/eventos/${event.id}`, 'PUT', {
            title: 'Alteração não autorizada',
          }),
        );
        const order = await purchase(ana, event);
        denied(await bruna.request(`/pedidos/${order.id}`));
        assert.ok(!(await wallet(bruna)).some((ticket) => order.ticketIds.includes(ticket.id)));
      });
      await scenario(
        'T03',
        'Reaplicação de migrações e seed preserva definições e dados',
        async () => {
          const db = await pool.getConnection();
          const hashBefore = await estruturaHash(db);
          db.release();
          const [[before]] = await pool.execute('SELECT COUNT(*) AS total FROM usuario');
          const result = await migrar(pool);
          assert.equal(result.applied.length, 0);
          await seed(pool, { password });
          const [[after]] = await pool.execute('SELECT COUNT(*) AS total FROM usuario');
          assert.equal(after.total, before.total);
          const next = await pool.getConnection();
          assert.equal(await estruturaHash(next), hashBefore);
          next.release();
          const [[active]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND constraint_type='CHECK' AND enforced<>'YES'",
          );
          assert.equal(active.total, 0);
        },
      );
      await scenario('T04', 'Duas reservas simultâneas para a última vaga', async () => {
        const event = await newEvent('Última Vaga', 1);
        const results = await Promise.all(
          [ana, bruna].map((client) =>
            client.request('/pedidos', 'POST', { categoryId: event.categories[0].id, quantity: 1 }),
          ),
        );
        assert.equal(results.filter(successful).length, 1);
        const index = results.findIndex(successful),
          client = [ana, bruna][index],
          order = results[index].data;
        const paid = await Promise.all([
          client.request(`/pedidos/${order.id}/pagar`, 'POST', {}),
          client.request(`/pedidos/${order.id}/pagar`, 'POST', {}),
        ]);
        assert.ok(paid.some(successful));
        const [[units]] = await pool.execute(
          'SELECT COUNT(*) AS total FROM ingresso WHERE evento_id=?',
          [event.id],
        );
        assert.equal(units.total, 1);
      });
      await scenario('T05', 'Limite considera posse, reservas e fila estável', async () => {
        const event = await newEvent('Limite', 10),
          person = await newUser();
        await purchase(person, event, 1);
        must(
          await person.request('/pedidos', 'POST', {
            categoryId: event.categories[0].id,
            quantity: 3,
          }),
        );
        denied(
          await person.request('/pedidos', 'POST', {
            categoryId: event.categories[0].id,
            quantity: 1,
          }),
        );
        const queueEvent = await newEvent('Fila', 10);
        const first = must(
          await bruna.request('/fila', 'POST', {
            eventId: queueEvent.id,
            categoryId: queueEvent.categories[0].id,
          }),
        );
        const second = must(
          await caio.request('/fila', 'POST', {
            eventId: queueEvent.id,
            categoryId: queueEvent.categories[0].id,
          }),
        );
        assert.ok(first.id < second.id);
        denied(
          await bruna.request('/fila', 'POST', {
            eventId: queueEvent.id,
            categoryId: queueEvent.categories[0].id,
            priceCents: 99999,
          }),
        );
        const bought = await purchase(ana, queueEvent);
        must(
          await ana.request('/anuncios', 'POST', {
            ticketId: bought.ticketIds[0],
            priceCents: 7000,
          }),
        );
        const list = must(await bruna.request('/fila'));
        assert.equal(list.find((q) => q.id === first.id).status, 'reserved');
        const next = must(await caio.request('/fila'));
        assert.equal(next.find((q) => q.id === second.id).status, 'queued');
      });
      await scenario(
        'T06',
        'Preço adulterado, repasse 100 para 70 e teto do adquirente',
        async () => {
          const event = await newEvent('Repasse', 10),
            initial = await purchase(ana, event),
            ticketId = initial.ticketIds[0];
          const previousCredential = must(
            await ana.request(`/ingressos/${ticketId}/credencial`),
          ).credential;
          denied(await ana.request('/anuncios', 'POST', { ticketId, priceCents: 40000 }));
          denied(await ana.request('/anuncios', 'POST', { ticketId, priceCents: -1 }));
          const listing = must(
            await ana.request('/anuncios', 'POST', { ticketId, priceCents: 7000 }),
          );
          const reserved = must(
            await bruna.request(`/anuncios/${listing.id}/reservar`, 'POST', {}),
          );
          const delivered = must(await bruna.request(`/pedidos/${reserved.id}/pagar`, 'POST', {}));
          assert.equal(delivered.amountCents, 7000);
          const ticket = (await wallet(bruna)).find((unit) => unit.id === ticketId);
          assert.equal(ticket.ceilingCents, 7000);
          denied(await bruna.request('/anuncios', 'POST', { ticketId, priceCents: 7001 }));
          denied(await ana.request(`/ingressos/${ticketId}/credencial`));
          denied(
            await org.request('/portaria', 'POST', {
              eventId: event.id,
              credential: previousCredential,
            }),
          );
          chain = {
            event,
            ticketId,
            previousCredential,
            primaryOrder: initial.id,
            resaleOrder: reserved.id,
          };
        },
      );
      await scenario('T07', 'Um anúncio/reserva ativo e recusa de compra própria', async () => {
        const event = await newEvent('Conflitos'),
          order = await purchase(ana, event),
          ticketId = order.ticketIds[0];
        const listing = must(
          await ana.request('/anuncios', 'POST', { ticketId, priceCents: 9000 }),
        );
        denied(await ana.request('/anuncios', 'POST', { ticketId, priceCents: 8000 }));
        denied(await ana.request(`/anuncios/${listing.id}/reservar`, 'POST', {}));
        const reservations = await Promise.all(
          [bruna, caio].map((client) =>
            client.request(`/anuncios/${listing.id}/reservar`, 'POST', {}),
          ),
        );
        assert.equal(reservations.filter(successful).length, 1);
        denied(await ana.request(`/anuncios/${listing.id}`, 'DELETE', {}));
      });
      await scenario(
        'T08',
        'Expiração no servidor e estado persistente após reinício',
        async () => {
          const event = await newEvent('Expiração'),
            reserved = must(
              await ana.request('/pedidos', 'POST', {
                categoryId: event.categories[0].id,
                quantity: 1,
              }),
            );
          // Somente timestamp da fixture exclusiva: simula o relógio após o vencimento sem esperar dez minutos.
          await pool.execute(
            'UPDATE mvp_pedido SET expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(3)) WHERE id=?',
            [reserved.id],
          );
          await stop();
          await start();
          const list = must(await ana.request('/pedidos'));
          assert.equal(list.find((p) => p.id === reserved.id).deliveryState, 'expired');
          denied(await ana.request(`/pedidos/${reserved.id}/pagar`, 'POST', {}));
          const purchased = await purchase(ana, event),
            invite = must(
              await ana.request('/transferencias', 'POST', {
                ticketId: purchased.ticketIds[0],
                email: bruna.user.email,
              }),
            );
          await pool.execute(
            'UPDATE mvp_convite SET expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(3)) WHERE id=?',
            [invite.id],
          );
          await stop();
          await start();
          const invites = must(await bruna.request('/transferencias'));
          assert.equal(invites.find((item) => item.id === invite.id).status, 'expired');
          assert.ok((await wallet(ana)).some((ticket) => ticket.id === purchased.ticketIds[0]));
        },
      );
      await scenario('T09', 'Idempotência de reserva/pagamento e payload divergente', async () => {
        const event = await newEvent('Idempotência'),
          key = randomUUID(),
          body = { categoryId: event.categories[0].id, quantity: 1 };
        const one = must(await ana.request('/pedidos', 'POST', body, key));
        const two = must(await ana.request('/pedidos', 'POST', body, key));
        assert.equal(one.id, two.id);
        assert.equal(
          (await ana.request('/pedidos', 'POST', { ...body, quantity: 2 }, key)).status,
          409,
        );
        const payKey = randomUUID(),
          paid = must(await ana.request(`/pedidos/${one.id}/pagar`, 'POST', {}, payKey));
        const repeated = must(await ana.request(`/pedidos/${one.id}/pagar`, 'POST', {}, payKey));
        assert.deepEqual(repeated.ticketIds, paid.ticketIds);
        const [[units]] = await pool.execute(
          'SELECT COUNT(*) AS total FROM mvp_pedido_unidade WHERE order_id=?',
          [one.id],
        );
        assert.equal(units.total, 1);
      });
      await scenario(
        'T10',
        'Aceite somente pelo destinatário e revogação da credencial anterior',
        async () => {
          assert.ok(chain);
          const old = must(
            await bruna.request(`/ingressos/${chain.ticketId}/credencial`),
          ).credential;
          const invitation = must(
            await bruna.request('/transferencias', 'POST', {
              ticketId: chain.ticketId,
              email: caio.user.email,
            }),
          );
          const [[before]] = await pool.execute('SELECT dono_atual_id FROM ingresso WHERE id=?', [
            chain.ticketId,
          ]);
          assert.equal(before.dono_atual_id, bruna.user.id);
          denied(await ana.request(`/transferencias/${invitation.id}/aceitar`, 'POST', {}));
          denied(
            await org.request('/portaria', 'POST', { eventId: chain.event.id, credential: old }),
          );
          must(await caio.request(`/transferencias/${invitation.id}/aceitar`, 'POST', {}));
          const current = must(
            await caio.request(`/ingressos/${chain.ticketId}/credencial`),
          ).credential;
          assert.notEqual(current, old);
          denied(await bruna.request(`/ingressos/${chain.ticketId}/credencial`));
          const history = must(await caio.request(`/ingressos/${chain.ticketId}/historico`));
          assert.ok(history.some((item) => item.kind === 'gifted'));
          chain.currentCredential = current;
        },
      );
      await scenario('T11', 'Gratuidade, custo zero, recusa e preservação do titular', async () => {
        const ticket = (await wallet(caio)).find((item) => item.id === chain.ticketId);
        assert.equal(ticket.costCents, 0);
        assert.equal(ticket.ceilingCents, 0);
        denied(
          await caio.request('/anuncios', 'POST', { ticketId: chain.ticketId, priceCents: 1 }),
        );
        const invite = must(
          await caio.request('/transferencias', 'POST', {
            ticketId: chain.ticketId,
            email: ana.user.email,
          }),
        );
        must(await ana.request(`/transferencias/${invite.id}/recusar`, 'POST', {}));
        assert.ok(
          (await wallet(caio)).some((item) => item.id === chain.ticketId && item.costCents === 0),
        );
      });
      await scenario(
        'T12',
        'Duas leituras simultâneas autorizam somente a primeira entrada',
        async () => {
          denied(
            await ana.request('/portaria', 'POST', {
              eventId: chain.event.id,
              credential: chain.currentCredential,
            }),
          );
          const otherEvent = await newEvent('Evento Errado');
          denied(
            await org.request('/portaria', 'POST', {
              eventId: otherEvent.id,
              credential: chain.currentCredential,
            }),
          );
          const reads = await Promise.all([
            org.request('/portaria', 'POST', {
              eventId: chain.event.id,
              credential: chain.currentCredential,
            }),
            org.request('/portaria', 'POST', {
              eventId: chain.event.id,
              credential: chain.currentCredential,
            }),
          ]);
          assert.equal(reads.filter(successful).length, 1);
          const [[count]] = await pool.execute(
            'SELECT COUNT(*) AS total FROM mvp_entrada WHERE ticket_id=?',
            [chain.ticketId],
          );
          assert.equal(count.total, 1);
          assert.equal(
            (await wallet(caio)).find((item) => item.id === chain.ticketId).state,
            'used',
          );
        },
      );
      await scenario(
        'T13',
        'Falhas simuladas, entrega pendente, recuperação e estorno único',
        async () => {
          const event = await newEvent('Emissor Indisponível');
          await configDemo({ paymentScenario: 'approved', issuerScenario: 'temporary_failure' });
          const order = await purchase(ana, event);
          assert.equal(order.paymentState, 'approved');
          assert.equal(order.deliveryState, 'pending');
          assert.equal(order.ticketIds.length, 0);
          await configDemo({ paymentScenario: 'approved', issuerScenario: 'success' });
          const recovered = must(await ana.request(`/pedidos/${order.id}/recuperar`, 'POST', {}));
          assert.equal(recovered.ticketIds.length, 1);
          must(await ana.request(`/pedidos/${order.id}/recuperar`, 'POST', {}));
          await configDemo({ paymentScenario: 'approved', issuerScenario: 'temporary_failure' });
          const pending = await purchase(bruna, event);
          must(await bruna.request(`/pedidos/${pending.id}/estornar`, 'POST', {}));
          must(await bruna.request(`/pedidos/${pending.id}/estornar`, 'POST', {}));
          const [[refunds]] = await pool.execute(
            'SELECT COUNT(*) AS total FROM mvp_estorno WHERE order_id=?',
            [pending.id],
          );
          assert.equal(refunds.total, 1);
          await configDemo({ paymentScenario: 'rejected', issuerScenario: 'success' });
          const reserved = must(
            await caio.request('/pedidos', 'POST', {
              categoryId: event.categories[0].id,
              quantity: 1,
            }),
          );
          denied(
            await caio.request(`/pedidos/${reserved.id}/pagar`, 'POST', { status: 'approved' }),
          );
          const rejected = must(await caio.request(`/pedidos/${reserved.id}/pagar`, 'POST', {}));
          assert.equal(rejected.paymentState, 'rejected');
          assert.equal(rejected.ticketIds.length, 0);
          await configDemo({ paymentScenario: 'approved', issuerScenario: 'success' });
        },
      );
      await scenario(
        'T14',
        'Cancelamento após repasses reconcilia a cadeia sem duplicar estornos',
        async () => {
          const event = await newEvent('Cancelamento'),
            primary = await purchase(ana, event),
            ticketId = primary.ticketIds[0],
            orders = [primary.id];
          for (const [seller, buyer, value] of [
            [ana, bruna, 7000],
            [bruna, caio, 6000],
          ]) {
            const listing = must(
              await seller.request('/anuncios', 'POST', { ticketId, priceCents: value }),
            );
            const order = must(await buyer.request(`/anuncios/${listing.id}/reservar`, 'POST', {}));
            orders.push(order.id);
            must(await buyer.request(`/pedidos/${order.id}/pagar`, 'POST', {}));
          }
          const credential = must(
            await caio.request(`/ingressos/${ticketId}/credencial`),
          ).credential;
          must(
            await org.request(`/eventos/${event.id}/cancelar`, 'POST', {
              reason: 'Cancelamento fictício de ensaio.',
            }),
          );
          must(
            await org.request(`/eventos/${event.id}/cancelar`, 'POST', {
              reason: 'Cancelamento fictício de ensaio.',
            }),
          );
          const [refunds] = await pool.execute(
            'SELECT order_id FROM mvp_estorno WHERE order_id IN (?,?,?)',
            orders,
          );
          assert.equal(refunds.length, 3);
          denied(await org.request('/portaria', 'POST', { eventId: event.id, credential }));
          denied(
            await ana.request('/pedidos', 'POST', {
              categoryId: event.categories[0].id,
              quantity: 1,
            }),
          );
        },
      );
      await scenario(
        'T15',
        'Atendimento restrito, resposta persistida e unidade usada não recriada',
        async () => {
          const support = must(
            await bruna.request('/atendimentos', 'POST', {
              orderId: chain.resaleOrder,
              subject: 'Dúvida acadêmica',
              message: 'Solicitação fictícia sobre meu pedido.',
            }),
          );
          assert.ok(
            !must(await ana.request('/atendimentos')).some((item) => item.id === support.id),
          );
          denied(
            await ana.request(`/atendimentos/${support.id}/respostas`, 'POST', {
              message: 'Tentativa não autorizada',
              status: 'closed',
            }),
          );
          must(
            await admin.request(`/atendimentos/${support.id}/respostas`, 'POST', {
              message: 'Resposta fictícia registrada.',
              status: 'reviewing',
            }),
          );
          const own = must(await bruna.request('/atendimentos')).find(
            (item) => item.id === support.id,
          );
          assert.equal(own.status, 'reviewing');
          denied(await caio.request(`/pedidos/${chain.resaleOrder}/estornar`, 'POST', {}));
          assert.equal(
            (await wallet(caio)).find((item) => item.id === chain.ticketId).state,
            'used',
          );
        },
      );
    } finally {
      await stop();
      await pool.end();
      const output = new URL('../../docs/validacao/polimento/', import.meta.url);
      await mkdir(output, { recursive: true });
      await writeFile(
        new URL('aceite-mysql.json', output),
        JSON.stringify(
          {
            dataUtc: new Date().toISOString(),
            instance: {
              version: identity.version,
              port,
              isolation: 'Diretório exclusivo conferido; conexão pessoal não acessada',
            },
            resultados: evidence,
          },
          null,
          2,
        ) + '\n',
      );
    }
  },
);
