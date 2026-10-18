import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const enabled = process.env.TESTE_MYSQL_ISOLADO === '1';
const password = 'Demo-Academica-2026!'; // Somente contas fictícias novas deste teste.
const normalize = (path) => path.replaceAll('\\', '/').replace(/\/+$/, '').toLowerCase();
const origin = 'http://127.0.0.1:5173';

test(
  'Módulos existentes: perfil, eventos e B2B no MySQL exclusivo',
  { skip: !enabled, timeout: 120000 },
  async (t) => {
    const { default: mysql } = await import('mysql2/promise');
    const { criarApp } = await import('../src/app.js');
    const port = Number(process.env.TESTE_MYSQL_PORTA),
      dataDir = resolve(process.env.TESTE_MYSQL_DIRETORIO || '.'),
      ca = resolve(process.env.TESTE_MYSQL_CA || '.');
    assert.ok(port > 1024 && port !== 3306 && port <= 65535);
    assert.ok(basename(dataDir).startsWith('mysql-qa-') && basename(dirname(dataDir)) === 'tmp');
    assert.equal(dirname(ca), dataDir);
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port,
      user: 'root',
      password: '',
      database: 'trocaticket_mvp_academico',
      dateStrings: true,
      timezone: 'Z',
      connectionLimit: 10,
      ssl: { ca: await readFile(ca), rejectUnauthorized: true },
    });
    let server, base;
    const evidence = [];
    const [[identity]] = await pool.query(
      'SELECT VERSION() AS version,@@datadir AS dir,DATABASE() AS banco',
    );
    assert.equal(identity.version, '8.0.46');
    assert.equal(identity.banco, 'trocaticket_mvp_academico');
    assert.equal(normalize(identity.dir), normalize(dataDir));
    function must(response, expected = 200) {
      assert.equal(
        response.status,
        expected,
        `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    }
    class Client {
      constructor() {
        this.cookie = '';
        this.csrf = '';
        this.user = null;
      }
      async request(path, method = 'GET', body, headers = {}) {
        const requestHeaders = {
          Origin: origin,
          ...(this.cookie ? { Cookie: this.cookie } : {}),
          ...(this.csrf ? { 'X-CSRF-Token': this.csrf } : {}),
          ...headers,
        };
        if (method !== 'GET') {
          requestHeaders['Content-Type'] = 'application/json';
          requestHeaders['Idempotency-Key'] = randomUUID();
        }
        const response = await fetch(base + path, {
          method,
          headers: requestHeaders,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const cookie = response.headers.get('set-cookie');
        if (cookie) this.cookie = cookie.split(';')[0];
        const text = await response.text(),
          data = text ? JSON.parse(text) : null;
        if (response.ok && data && Object.hasOwn(data, 'csrfToken')) {
          this.csrf = data.csrfToken;
          this.user = data.user;
        }
        return { status: response.status, data };
      }
    }
    async function group(id, name, expected, work) {
      await t.test(`${id} ${name}`, async () => {
        try {
          const observed = await work();
          evidence.push({
            id,
            teste: name,
            esperado: expected,
            observado: observed,
            resultado: 'aprovado',
          });
        } catch (error) {
          evidence.push({
            id,
            teste: name,
            esperado: expected,
            observado: String(error.message).slice(0, 1000),
            resultado: 'reprovado',
          });
          throw error;
        }
      });
    }
    const admin = new Client(),
      guest = new Client();
    async function newUser(role) {
      const client = new Client();
      must(
        await client.request('/auth/register', 'POST', {
          name: 'Pessoa Fictícia B2B',
          email: `b2b.${randomUUID()}@example.com`,
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
    async function newEvent(org, status = 'published', capacity = 3) {
      return must(
        await org.request('/eventos', 'POST', {
          title: `B2B Evento Fictício ${randomUUID()}`,
          description: 'Ensaio acadêmico sem compra real.',
          dateISO: '2030-12-12T19:00:00-03:00',
          endsAt: '2030-12-13T02:00:00Z',
          venue: 'Local fictício',
          capacity,
          status,
          categories: [
            {
              name: 'Inteira fictícia',
              kind: 'full',
              priceCents: 10000,
              stock: capacity,
              salesOpen: true,
            },
          ],
        }),
        201,
      );
    }
    async function product(supplier, stock = 3) {
      return must(
        await supplier.request('/produtos', 'POST', {
          name: `Som fictício ${randomUUID()}`,
          description: 'Somente demonstração.',
          type: 'S',
          priceCents: 12345,
          stock,
          active: true,
        }),
        201,
      );
    }
    let org, otherOrg, supplier, otherSupplier, person, stranger, event, item;
    try {
      server = criarApp({ pool, config: { origins: [origin] } }).listen(0, '127.0.0.1');
      await once(server, 'listening');
      base = `http://127.0.0.1:${server.address().port}/api`;
      must(
        await admin.request('/auth/login', 'POST', { email: 'admin.demo@example.com', password }),
      );
      [org, otherOrg, supplier, otherSupplier, person, stranger] = await Promise.all(
        ['organizador', 'organizador', 'fornecedor', 'fornecedor', 'comprador', 'comprador'].map(
          newUser,
        ),
      );

      await group(
        'B01',
        'Perfil persistente, senha e isolamento',
        'Alterações próprias persistem; senha atual obrigatória; promoção e leitura alheia recusadas.',
        async () => {
          const profile = must(
            await person.request('/perfil', 'PUT', {
              name: 'Nome Fictício Atualizado',
              phone: '(11) 00000-0000',
              description: 'Biografia fictícia de ensaio.',
              photo: '/images/evento-placeholder.svg',
            }),
          );
          assert.equal(profile.name, 'Nome Fictício Atualizado');
          assert.equal(profile.phone, '(11) 00000-0000');
          assert.equal(
            must(await person.request('/perfil')).description,
            'Biografia fictícia de ensaio.',
          );
          assert.notEqual(must(await stranger.request('/perfil')).id, profile.id);
          must(await stranger.request(`/perfil/${person.user.id}`), 404);
          must(await person.request('/perfil', 'PUT', { role: 'organizador', admin: true }), 403);
          must(
            await person.request('/perfil', 'PUT', {
              currentPassword: 'incorreta',
              password: 'Nova-Senha-Ficticia-2026!',
            }),
            403,
          );
          must(
            await person.request('/perfil', 'PUT', {
              currentPassword: password,
              password: 'Nova-Senha-Ficticia-2026!',
            }),
          );
          const fresh = new Client();
          must(await fresh.request('/auth/login', 'POST', { email: profile.email, password }), 401);
          must(
            await fresh.request('/auth/login', 'POST', {
              email: profile.email,
              password: 'Nova-Senha-Ficticia-2026!',
            }),
          );
          return 'GET/PUT próprios persistidos; acesso por id404; promoção403; senha antiga401 e nova200.';
        },
      );

      await group(
        'B02',
        'Rascunhos privados e criação validada',
        'Rascunho visível só ao dono/admin; publicação sem estoque e capacidade incoerente recusadas.',
        async () => {
          const draft = await newEvent(org, 'draft');
          must(await org.request(`/eventos/${draft.id}`));
          must(await admin.request(`/eventos/${draft.id}`));
          must(await guest.request(`/eventos/${draft.id}`), 404);
          must(await otherOrg.request(`/eventos/${draft.id}`), 404);
          assert.ok(!must(await guest.request('/eventos')).some((e) => e.id === draft.id));
          const body = {
            title: `Inválido ${randomUUID()}`,
            dateISO: '2030-12-12T22:00:00Z',
            venue: 'Local fictício',
            capacity: 1,
            status: 'published',
          };
          must(await org.request('/eventos', 'POST', body), 400);
          must(
            await org.request('/eventos', 'POST', {
              ...body,
              categories: [{ name: 'Inteira', kind: 'full', priceCents: 10000, stock: 2 }],
            }),
            400,
          );
          const [[count]] = await pool.execute(
            'SELECT COUNT(*) AS total FROM evento WHERE titulo=?',
            [body.title],
          );
          assert.equal(count.total, 0);
          return 'Dono/admin200, visitante/outro404; sem estoque400; estoque acima da capacidade400 com rollback sem evento parcial.';
        },
      );

      await group(
        'B03',
        'Edição própria do evento e categoria',
        'PUT persiste campos e categorias; outro organizador403; capacidade menor que estoque400.',
        async () => {
          event = await newEvent(org);
          event = must(
            await org.request(`/eventos/${event.id}`, 'PUT', {
              title: `${event.title} atualizado`,
              image: '/images/evento-placeholder.svg',
              categories: [{ ...event.categories[0], priceCents: 12000 }],
            }),
          );
          assert.equal(event.categories[0].priceCents, 12000);
          assert.equal(new Date(event.dateISO).toISOString(), '2030-12-12T22:00:00.000Z');
          assert.equal(must(await guest.request(`/eventos/${event.id}`)).title, event.title);
          must(
            await otherOrg.request(`/eventos/${event.id}`, 'PUT', { title: 'Alteração alheia' }),
            403,
          );
          must(await org.request(`/eventos/${event.id}`, 'PUT', { capacity: 2 }), 400);
          assert.equal(must(await org.request(`/eventos/${event.id}`)).capacity, 3);
          return 'Título/imagem/preço atualizados e relidos; data UTC correta; outro403; redução inválida400 preserva capacidade3.';
        },
      );

      await group(
        'B04',
        'Inventário de fornecedor e diretório',
        'Produto próprio persiste; outro fornecedor403; desativado sai do catálogo e fica no inventário.',
        async () => {
          item = await product(supplier);
          item = must(
            await supplier.request(`/produtos/${item.id}`, 'PUT', {
              name: 'Equipamento fictício atualizado',
              active: false,
            }),
          );
          assert.equal(item.active, false);
          assert.ok(!must(await guest.request('/produtos')).some((p) => p.id === item.id));
          assert.ok(
            must(await supplier.request('/fornecedor/produtos')).some((p) => p.id === item.id),
          );
          must(await otherSupplier.request(`/produtos/${item.id}`, 'PUT', { stock: 10 }), 403);
          must(await guest.request('/fornecedor/produtos'), 401);
          item = must(await supplier.request(`/produtos/${item.id}`, 'PUT', { active: true }));
          const directory = must(await guest.request('/fornecedores')).find(
            (p) => p.id === supplier.user.id,
          );
          assert.ok(directory.items.some((p) => p.id === item.id));
          return 'Produto desativado fora do público e mantido no inventário; proprietário correto; reativado aparece no diretório.';
        },
      );

      await group(
        'B05',
        'Propostas, propriedade e orçamento exato',
        'Somente fornecedor dono propõe; dono do evento aceita; orçamento soma centavos das aceitas.',
        async () => {
          const data = {
            eventId: event.id,
            productId: item.id,
            quantity: 2,
            unitCents: 12345,
            description: 'Proposta acadêmica.',
          };
          must(await otherSupplier.request('/propostas', 'POST', data), 403);
          const proposal = must(await supplier.request('/propostas', 'POST', data), 201);
          assert.equal(proposal.totalCents, 24690);
          must(
            await otherOrg.request(`/propostas/${proposal.id}/status`, 'PATCH', { status: 'A' }),
            403,
          );
          assert.equal(
            must(await org.request(`/propostas/${proposal.id}/status`, 'PATCH', { status: 'A' }))
              .status,
            'A',
          );
          const budget = must(await org.request(`/eventos/${event.id}/orcamento`));
          assert.equal(budget.totalCents, 24690);
          must(await otherOrg.request(`/eventos/${event.id}/orcamento`), 403);
          must(await person.request(`/eventos/${event.id}/orcamento`), 403);
          assert.ok(
            !must(await otherSupplier.request('/propostas')).some((p) => p.id === proposal.id),
          );
          const [[decimal]] = await pool.execute('SELECT valor FROM oferta WHERE id=?', [
            proposal.id,
          ]);
          assert.equal(decimal.valor, '246.90');
          return 'Fornecedor alheio403; organizador alheio403; orçamento próprio24690centavos; DECIMAL246.90 e consultas restritas.';
        },
      );

      await group(
        'B06',
        'Aceitação concorrente e estoque contratado',
        'Duas propostas para última unidade produzem somente uma aceitação; estoque contratado não pode ser reduzido.',
        async () => {
          const exclusive = await product(supplier, 1),
            event2 = await newEvent(otherOrg);
          const a = must(
            await supplier.request('/propostas', 'POST', {
              eventId: event.id,
              productId: exclusive.id,
              quantity: 1,
              unitCents: 1000,
            }),
            201,
          );
          const b = must(
            await supplier.request('/propostas', 'POST', {
              eventId: event2.id,
              productId: exclusive.id,
              quantity: 1,
              unitCents: 1000,
            }),
            201,
          );
          const answers = await Promise.all([
            org.request(`/propostas/${a.id}/status`, 'PATCH', { status: 'A' }),
            otherOrg.request(`/propostas/${b.id}/status`, 'PATCH', { status: 'A' }),
          ]);
          assert.deepEqual(answers.map((r) => r.status).sort(), [200, 409]);
          const [[total]] = await pool.execute(
            "SELECT COUNT(*) AS accepted FROM oferta WHERE produto_servico_id=? AND status='A'",
            [exclusive.id],
          );
          assert.equal(total.accepted, 1);
          must(await supplier.request(`/produtos/${exclusive.id}`, 'PUT', { stock: 0 }), 409);
          const current = must(await supplier.request('/fornecedor/produtos')).find(
            (p) => p.id === exclusive.id,
          );
          assert.equal(current.stock, 1);
          assert.equal(current.available, 0);
          return 'Concorrência HTTP200+409; uma ofertaA no MySQL; estoque0 recusado409; estoque1/disponível0 preservados.';
        },
      );

      await group(
        'B07',
        'Estados finais e validação de escrita',
        'Recusa e cancelamento persistem; estado final não é reaberto; JSON inválido não vaza conteúdo.',
        async () => {
          const available = await product(supplier, 2),
            data = { eventId: event.id, productId: available.id, quantity: 1, unitCents: 1000 };
          const rejected = must(await supplier.request('/propostas', 'POST', data), 201),
            cancelled = must(await supplier.request('/propostas', 'POST', data), 201);
          assert.equal(
            must(await org.request(`/propostas/${rejected.id}/status`, 'PATCH', { status: 'R' }))
              .status,
            'R',
          );
          assert.equal(
            must(
              await supplier.request(`/propostas/${cancelled.id}/status`, 'PATCH', { status: 'C' }),
            ).status,
            'C',
          );
          must(
            await org.request(`/propostas/${rejected.id}/status`, 'PATCH', { status: 'A' }),
            409,
          );
          must(
            await supplier.request('/produtos', 'POST', {
              name: 'Inválido fictício',
              description: 'Teste',
              type: 'P',
              priceCents: -1,
              stock: 1,
            }),
            400,
          );
          must(
            await supplier.request(
              `/produtos/${item.id}`,
              'PUT',
              { stock: 3 },
              { Origin: 'https://example.com' },
            ),
            403,
          );
          const malformed = await fetch(base + '/auth/login', {
            method: 'POST',
            headers: { Origin: origin, 'Content-Type': 'application/json' },
            body: '{"password":"segredo-ficticio-nao-ecoar"',
          });
          assert.equal(malformed.status, 400);
          assert.ok(!(await malformed.text()).includes('segredo-ficticio-nao-ecoar'));
          return 'Propostas R/C persistem; reabrir409; valor negativo400; origem externa403; JSON400 genérico sem senha.';
        },
      );

      await group(
        'B08',
        'Avaliação somente após uso e término',
        'Sem uso403; após entrada e término fictícios201; repetição409; tipo com emissão não muda.',
        async () => {
          const reviewEvent = await newEvent(org);
          must(
            await person.request(`/eventos/${reviewEvent.id}/avaliacoes`, 'POST', {
              rating: 5,
              comment: 'Ensaio fictício.',
            }),
            403,
          );
          const config = must(await admin.request('/demo/config'));
          assert.equal(config.paymentScenario, 'approved');
          assert.equal(config.issuerScenario, 'success');
          const reservation = must(
            await person.request('/pedidos', 'POST', {
              categoryId: reviewEvent.categories[0].id,
              quantity: 1,
            }),
          );
          const order = must(await person.request(`/pedidos/${reservation.id}/pagar`, 'POST', {}));
          assert.equal(order.deliveryState, 'delivered');
          const credential = must(
            await person.request(`/ingressos/${order.ticketIds[0]}/credencial`),
          ).credential;
          must(await org.request('/portaria', 'POST', { eventId: reviewEvent.id, credential }));
          must(
            await org.request(`/eventos/${reviewEvent.id}`, 'PUT', {
              categories: [{ ...reviewEvent.categories[0], kind: 'half' }],
            }),
            409,
          );
          // Relógio de término exclusivamente da fixture criada acima; nenhum evento pessoal/seed é alterado.
          await pool.execute(
            'UPDATE mvp_evento SET ends_at=TIMESTAMPADD(SECOND,-1,UTC_TIMESTAMP(3)) WHERE evento_id=?',
            [reviewEvent.id],
          );
          must(
            await stranger.request(`/eventos/${reviewEvent.id}/avaliacoes`, 'POST', {
              rating: 5,
              comment: 'Sem ingresso.',
            }),
            403,
          );
          must(
            await person.request(`/eventos/${reviewEvent.id}/avaliacoes`, 'POST', {
              rating: 5,
              comment: 'Avaliação fictícia após uso.',
            }),
            201,
          );
          must(
            await person.request(`/eventos/${reviewEvent.id}/avaliacoes`, 'POST', {
              rating: 4,
              comment: 'Duplicada.',
            }),
            409,
          );
          const reviews = must(await guest.request(`/eventos/${reviewEvent.id}/avaliacoes`));
          assert.equal(reviews.filter((r) => r.userId === person.user.id).length, 1);
          return 'Sem uso403; emissão e entrada reais no ensaio; categoria alterada409; término da fixture; avaliação201/duplicata409 e uma linha persistida.';
        },
      );
    } finally {
      if (server) await new Promise((done) => server.close(done));
      await pool.end();
      const output = new URL('../../docs/validacao/polimento/', import.meta.url);
      await mkdir(output, { recursive: true });
      await writeFile(
        new URL('b2b-mysql.json', output),
        JSON.stringify(
          {
            dataUtc: new Date().toISOString(),
            instance: {
              version: identity.version,
              port,
              isolation: 'Diretório exclusivo conferido; banco pessoal e M1 não acessados',
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
