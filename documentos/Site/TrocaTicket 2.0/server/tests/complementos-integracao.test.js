import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';

const enabled = process.env.TESTE_MYSQL_ISOLADO === '1';
const password = 'Demo-Academica-2026!'; // Somente contas fictícias da QA.
const normalized = (path) => path.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
const successful = (response) => response.status >= 200 && response.status < 300;

test(
  'Complementos de aceite: fila, convites e idempotência no MySQL exclusivo',
  { skip: !enabled, timeout: 180000 },
  async (t) => {
    const { default: mysql } = await import('mysql2/promise');
    const { criarApp } = await import('../src/app.js');
    const port = Number(process.env.TESTE_MYSQL_PORTA);
    const dataDir = resolve(process.env.TESTE_MYSQL_DIRETORIO || '.');
    const caPath = resolve(process.env.TESTE_MYSQL_CA || '.');
    assert.equal(port, 34763, 'Esta suíte é limitada à porta QA autorizada, nunca 3306.');
    assert.equal(basename(dataDir), 'mysql-qa-mvp-20261018');
    assert.equal(basename(dirname(dataDir)), 'tmp');
    assert.equal(dirname(caPath), dataDir);
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port,
      user: 'root',
      password: '',
      database: 'trocaticket_mvp_academico',
      charset: 'utf8mb4',
      timezone: 'Z',
      dateStrings: true,
      connectionLimit: 12,
      ssl: { ca: await readFile(caPath), rejectUnauthorized: true },
    });
    const evidence = [];
    let identity, server, base, originalConfig;

    async function start() {
      const app = criarApp({
        pool,
        config: { origins: ['http://127.0.0.1:5173'], sessionHours: 8 },
      });
      // Mesmo passo de reconciliação do index.js, sem tocar na API existente na 3333.
      await app.locals.transacoes.expire();
      server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      base = `http://127.0.0.1:${server.address().port}/api`;
    }
    async function stop() {
      if (server) {
        await new Promise((done) => server.close(done));
        server = null;
      }
    }
    function must(response) {
      assert.ok(successful(response), `HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      return response.data;
    }
    function rejected(response, status = 409) {
      assert.equal(response.status, status, JSON.stringify(response.data));
    }
    class Client {
      constructor() {
        this.cookie = '';
        this.csrf = '';
        this.user = null;
      }
      async request(path, method = 'GET', body, key) {
        const headers = { Origin: 'http://127.0.0.1:5173' };
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
        const data = text ? JSON.parse(text) : null;
        if (successful(response) && data && Object.hasOwn(data, 'csrfToken')) {
          this.csrf = data.csrfToken;
          this.user = data.user;
        }
        return { status: response.status, data };
      }
      async login(email) {
        return must(await this.request('/auth/login', 'POST', { email, password }));
      }
    }
    const admin = new Client(),
      organizer = new Client();
    async function person() {
      const client = new Client();
      must(
        await client.request('/auth/register', 'POST', {
          name: 'Pessoa Demo Complementar',
          email: `complemento.${randomUUID()}@example.com`,
          password,
          role: 'comprador',
        }),
      );
      return client;
    }
    async function event(label, half = false) {
      return must(
        await organizer.request('/eventos', 'POST', {
          title: `Complemento Fictício ${label} ${randomUUID().slice(0, 8)}`,
          description: 'Fixture acadêmica exclusiva dos testes complementares.',
          venue: 'Auditório fictício de ensaio',
          category: 'Cultural',
          dateISO: '2030-10-20T21:00:00Z',
          endsAt: '2030-10-21T02:00:00Z',
          capacity: 12,
          status: 'published',
          categories: [
            {
              name: half ? 'Meia fictícia' : 'Inteira fictícia',
              kind: half ? 'half' : 'full',
              priceCents: 10000,
              stock: 12,
              salesOpen: true,
            },
          ],
        }),
      );
    }
    async function reserve(client, item, quantity = 1, key) {
      return client.request(
        '/pedidos',
        'POST',
        {
          categoryId: item.categories[0].id,
          quantity,
          ...(item.categories[0].kind === 'half' ? { halfDeclaration: true } : {}),
        },
        key,
      );
    }
    async function purchase(client, item, quantity = 1) {
      const order = must(await reserve(client, item, quantity));
      return must(await client.request(`/pedidos/${order.id}/pagar`, 'POST', {}));
    }
    async function scenario(id, description, work) {
      await t.test(`${id}: ${description}`, async () => {
        try {
          await work();
          evidence.push({
            id,
            teste: description,
            resultado: 'aprovado',
            observado: 'Asserções executadas com HTTP, sessões independentes e MySQL real.',
          });
        } catch (error) {
          evidence.push({
            id,
            teste: description,
            resultado: 'reprovado',
            observado: String(error.message).slice(0, 1000),
          });
          throw error;
        }
      });
    }

    try {
      [[identity]] = await pool.query(
        'SELECT VERSION() AS version,@@datadir AS dir,DATABASE() AS banco',
      );
      assert.equal(identity.version, '8.0.46');
      assert.equal(identity.banco, 'trocaticket_mvp_academico');
      assert.equal(
        normalized(identity.dir),
        normalized(dataDir),
        'Diretório da QA identificado antes de qualquer escrita.',
      );
      await start();
      await admin.login('admin.demo@example.com');
      await organizer.login('organizador.demo@example.com');
      originalConfig = must(await admin.request('/demo/config'));
      must(
        await admin.request('/demo/config', 'PATCH', {
          paymentScenario: 'approved',
          issuerScenario: 'success',
          accountLimit: 4,
        }),
      );

      await scenario(
        'C01',
        'Reserva secundária expirada avança a fila após reinicialização da aplicação',
        async () => {
          const item = await event('Fila Expirada'),
            seller = await person(),
            first = await person(),
            second = await person();
          const initial = await purchase(seller, item),
            ticketId = initial.ticketIds[0];
          const body = { eventId: item.id, categoryId: item.categories[0].id };
          const firstQueue = must(await first.request('/fila', 'POST', body));
          const secondQueue = must(await second.request('/fila', 'POST', body));
          assert.ok(firstQueue.id < secondQueue.id);
          const listing = must(
            await seller.request('/anuncios', 'POST', { ticketId, priceCents: 7000 }),
          );
          const assigned = must(await first.request('/fila')).find(
            (row) => row.id === firstQueue.id,
          );
          assert.equal(assigned.status, 'reserved');
          assert.equal(
            must(await second.request('/fila')).find((row) => row.id === secondQueue.id).status,
            'queued',
          );
          // Somente o relógio da fixture recém-criada é avançado, sem esperar dez minutos.
          await pool.execute(
            'UPDATE mvp_pedido SET expires_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(3)) WHERE id=? AND user_id=?',
            [assigned.orderId, first.user.id],
          );
          await stop();
          await start();
          const expired = must(await first.request(`/pedidos/${assigned.orderId}`));
          assert.equal(expired.deliveryState, 'expired');
          const next = must(await second.request('/fila')).find((row) => row.id === secondQueue.id);
          assert.equal(next.status, 'reserved');
          assert.notEqual(next.orderId, assigned.orderId);
          const reserved = must(await second.request(`/pedidos/${next.orderId}`));
          assert.equal(reserved.amountCents, 7000);
          const [[active]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM mvp_pedido WHERE ticket_id=? AND delivery_state IN ('reserved','pending')",
            [ticketId],
          );
          assert.equal(active.total, 1);
          rejected(await first.request(`/pedidos/${assigned.orderId}/pagar`, 'POST', {}));
          const delivered = must(
            await second.request(`/pedidos/${next.orderId}/pagar`, 'POST', {}),
          );
          assert.deepEqual(delivered.ticketIds, [ticketId]);
          const [[ownership]] = await pool.execute(
            'SELECT dono_atual_id FROM ingresso WHERE id=?',
            [ticketId],
          );
          assert.equal(ownership.dono_atual_id, second.user.id);
          const [[currentListing]] = await pool.execute(
            'SELECT status FROM mvp_anuncio WHERE id=?',
            [listing.id],
          );
          assert.equal(currentListing.status, 'sold');
        },
      );

      await scenario(
        'C02',
        'Convite pendente entra no limite e o aceite não conta a mesma unidade duas vezes',
        async () => {
          const item = await event('Limite e Convite'),
            sender = await person(),
            recipient = await person();
          await purchase(recipient, item, 3);
          const acquired = await purchase(sender, item);
          const invitation = must(
            await sender.request('/transferencias', 'POST', {
              ticketId: acquired.ticketIds[0],
              email: recipient.user.email,
            }),
          );
          rejected(await reserve(recipient, item, 1));
          must(await recipient.request(`/transferencias/${invitation.id}/aceitar`, 'POST', {}));
          const tickets = must(await recipient.request('/ingressos')).filter(
            (ticket) => ticket.eventId === item.id,
          );
          assert.equal(tickets.length, 4);
          rejected(await reserve(recipient, item, 1));
        },
      );

      await scenario(
        'C03',
        'Aceite repetido é idempotente, preserva meia-entrada e recusa reuso incompatível da chave',
        async () => {
          const item = await event('Aceite Idempotente', true),
            sender = await person(),
            recipient = await person();
          const acquired = await purchase(sender, item),
            ticketId = acquired.ticketIds[0];
          const previous = must(
            await sender.request(`/ingressos/${ticketId}/credencial`),
          ).credential;
          const invitation = must(
            await sender.request('/transferencias', 'POST', {
              ticketId,
              email: recipient.user.email,
            }),
          );
          const key = randomUUID();
          const responses = await Promise.all([
            recipient.request(`/transferencias/${invitation.id}/aceitar`, 'POST', {}, key),
            recipient.request(`/transferencias/${invitation.id}/aceitar`, 'POST', {}, key),
          ]);
          assert.deepEqual(must(responses[0]), must(responses[1]));
          const ticket = must(await recipient.request('/ingressos')).find(
            (unit) => unit.id === ticketId,
          );
          assert.equal(ticket.kind, 'half');
          assert.equal(ticket.categoryId, item.categories[0].id);
          assert.equal(ticket.costCents, 0);
          assert.equal(ticket.ceilingCents, 0);
          assert.notEqual(ticket.credential, previous);
          const [[history]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM mvp_historico WHERE ticket_id=? AND kind='gifted'",
            [ticketId],
          );
          assert.equal(history.total, 1);
          rejected(
            await recipient.request(
              '/transferencias',
              'POST',
              { ticketId, email: sender.user.email },
              key,
            ),
          );
          const [[pending]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM mvp_convite WHERE ticket_id=? AND status='pending'",
            [ticketId],
          );
          assert.equal(pending.total, 0);
        },
      );

      await scenario(
        'C04',
        'Entrada repetida com a mesma chave cria somente uma entrada e um histórico',
        async () => {
          const item = await event('Entrada Idempotente'),
            holder = await person();
          const acquired = await purchase(holder, item),
            ticketId = acquired.ticketIds[0];
          const credential = must(
            await holder.request(`/ingressos/${ticketId}/credencial`),
          ).credential;
          const key = randomUUID(),
            body = { eventId: item.id, credential };
          const responses = await Promise.all([
            organizer.request('/portaria', 'POST', body, key),
            organizer.request('/portaria', 'POST', body, key),
          ]);
          assert.deepEqual(must(responses[0]), must(responses[1]));
          assert.equal(responses[0].data.accepted, true);
          rejected(await organizer.request('/portaria', 'POST', body));
          rejected(
            await organizer.request(
              '/portaria',
              'POST',
              { ...body, credential: '0'.repeat(64) },
              key,
            ),
          );
          const [[entries]] = await pool.execute(
            'SELECT COUNT(*) AS total FROM mvp_entrada WHERE ticket_id=?',
            [ticketId],
          );
          const [[history]] = await pool.execute(
            "SELECT COUNT(*) AS total FROM mvp_historico WHERE ticket_id=? AND kind='entered'",
            [ticketId],
          );
          assert.equal(entries.total, 1);
          assert.equal(history.total, 1);
        },
      );

      await scenario(
        'C05',
        'Estorno repetido não duplica registro e uma chave não pode virar nova reserva',
        async () => {
          must(
            await admin.request('/demo/config', 'PATCH', {
              paymentScenario: 'approved',
              issuerScenario: 'temporary_failure',
            }),
          );
          const item = await event('Estorno Idempotente'),
            buyer = await person();
          const order = await purchase(buyer, item);
          assert.equal(order.paymentState, 'approved');
          assert.equal(order.deliveryState, 'pending');
          assert.equal(order.ticketIds.length, 0);
          const key = randomUUID();
          const responses = await Promise.all([
            buyer.request(`/pedidos/${order.id}/estornar`, 'POST', {}, key),
            buyer.request(`/pedidos/${order.id}/estornar`, 'POST', {}, key),
          ]);
          assert.deepEqual(must(responses[0]), must(responses[1]));
          assert.equal(responses[0].data.deliveryState, 'refunded');
          assert.equal(responses[0].data.paymentState, 'refunded');
          must(await buyer.request(`/pedidos/${order.id}/estornar`, 'POST', {}));
          rejected(await reserve(buyer, item, 1, key));
          const [[refunds]] = await pool.execute(
            'SELECT COUNT(*) AS total,MAX(amount_cents) AS amount FROM mvp_estorno WHERE order_id=?',
            [order.id],
          );
          assert.equal(refunds.total, 1);
          assert.equal(refunds.amount, 10000);
          const [[orders]] = await pool.execute(
            'SELECT COUNT(*) AS total FROM mvp_pedido WHERE user_id=? AND event_id=?',
            [buyer.user.id, item.id],
          );
          assert.equal(orders.total, 1);
          assert.equal(must(await buyer.request('/ingressos')).length, 0);
        },
      );
    } finally {
      if (originalConfig && server)
        must(await admin.request('/demo/config', 'PATCH', originalConfig));
      await stop();
      await pool.end();
      const output = new URL('../../docs/validacao/polimento/', import.meta.url);
      await mkdir(output, { recursive: true });
      await writeFile(
        new URL('complementos-mysql.json', output),
        JSON.stringify(
          {
            dataUtc: new Date().toISOString(),
            instance: {
              version: identity?.version || null,
              port,
              database: 'trocaticket_mvp_academico',
              isolation:
                'Porta e diretório exclusivos conferidos antes de escrita; conexão pessoal não acessada.',
            },
            scope:
              'Novas fixtures fictícias; reinicialização da aplicação HTTP e reconciliação do servidor, sem reiniciar o processo MySQL.',
            resultados: evidence,
          },
          null,
          2,
        ) + '\n',
      );
    }
  },
);
