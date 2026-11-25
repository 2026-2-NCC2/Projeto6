// Testes de integração dos pedidos (etapa 3) num banco temporário (ver tests/apoio.js).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Cliente, SEM_MYSQL, conectar, configMysql, criarBancoTemporario, iniciarApi } = require('./apoio');

const novaChave = () => `teste-${crypto.randomUUID()}`;
const senha = () => `Teste-${crypto.randomBytes(9).toString('base64url')}`;

describe('pedidos, pagamento simulado e estorno (banco temporário)', { skip: !configMysql() && SEM_MYSQL }, () => {
  let banco;
  let api;
  let sql;
  const contas = {};
  const c = {};
  const eventos = {};

  // Gravação de pedido: sempre com Idempotency-Key, como o site faz.
  const pedir = (cliente, metodo, caminho, corpo, chave = novaChave()) =>
    cliente.req(metodo, caminho, corpo, { cabecalhos: { 'Idempotency-Key': chave } });
  const reservar = (cliente, eventId, quantity = 1, type = 'Inteira', extra = {}, chave = undefined) =>
    pedir(cliente, 'POST', '/pedidos', { eventId, type, quantity, ...extra }, chave);
  const pagar = (cliente, id, paymentMethod = 'pix') => pedir(cliente, 'POST', `/pedidos/${id}/pagar`, { paymentMethod });
  async function contar(tabela, where = '1=1', params = []) {
    const [[{ n }]] = await sql.query(`SELECT COUNT(*) AS n FROM ${tabela} WHERE ${where}`, params);
    return Number(n);
  }

  before(async () => {
    process.env.PAGAMENTO_SIMULADO = 'aprovado';
    banco = await criarBancoTemporario();
    api = await iniciarApi(banco.nome);
    sql = await conectar({ database: banco.nome });
    // Datas relativas ao dia do banco (é ele que decide "antes do evento").
    const [[{ hoje }]] = await sql.query("SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d') AS hoje");
    const dia = (dias) => new Date(Date.parse(`${hoje}T12:00:00Z`) + dias * 864e5).toISOString().slice(0, 10);
    for (const [chave, tipo] of [['ana', 1], ['bruno', 1], ['org', 2]]) {
      const conta = { nome: `${chave} Teste`, email: `${chave}.${Date.now()}@example.test`, senha: senha(), tipo_perfil: tipo };
      if (tipo === 2) Object.assign(conta, { documento: '12345678000199', nome_organizacao: 'Produtora Teste' });
      c[chave] = new Cliente(api.url);
      const r = await c[chave].cadastrar(conta);
      assert.equal(r.status, 201);
      contas[chave] = { ...conta, id: r.json.usuarioId };
    }
    const criar = async (nome, { inicio = 30, preco = 80, capacidade = 50 } = {}) => {
      const r = await c.org.req('POST', '/eventos', {
        organizadorId: contas.org.id, title: nome, category: 'Música', date: dia(inicio), endDate: dia(inicio + 1),
        time: '18:00', endTime: '22:00', location: 'São Paulo, SP', capacity: capacidade, price: preco,
        status: 'Publicado', description: 'Evento fictício.', image: '/images/coldplay.jpg',
      });
      assert.equal(r.status, 201, nome);
      return r.json.id;
    };
    eventos.principal = await criar('Festival Principal');
    eventos.pequeno = await criar('Show Pequeno', { capacidade: 3, preco: 50 });
    eventos.gratis = await criar('Palestra Gratuita', { preco: 0 });
    eventos.hoje = await criar('Evento de Hoje', { inicio: 0 });
    eventos.disputado = await criar('Últimos Lugares', { capacidade: 2 });
  });

  after(async () => {
    delete process.env.PAGAMENTO_SIMULADO;
    await sql?.end();
    await api?.fechar();
    await banco?.apagar();
  });

  let pedidoAna;

  it('reserva cria o pedido com prazo, total e sem ingressos ainda', async () => {
    const r = await reservar(c.ana, eventos.principal, 2);
    assert.equal(r.status, 201);
    assert.equal(r.json.status, 'reservado');
    assert.equal(r.json.total, 160);
    assert.equal(r.json.tickets.length, 0);
    assert.ok(r.json.secondsToExpire > 800 && r.json.secondsToExpire <= 900, String(r.json.secondsToExpire));
    assert.match(r.json.expiresAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.equal(r.json.canPay, true);
    pedidoAna = r.json.id;
  });

  it('pagamento aprovado emite os ingressos ligados ao pedido', async () => {
    const r = await pagar(c.ana, pedidoAna, 'pix');
    assert.equal(r.status, 200);
    assert.equal(r.json.status, 'pago');
    assert.equal(r.json.paymentMethod, 'pix');
    assert.equal(r.json.tickets.length, 2);
    assert.ok(r.json.tickets.every((t) => t.status === 'Ativo' && /^TT-\d+-[0-9A-F]{16}$/.test(t.code)));
    const ingressos = (await c.ana.req('GET', `/usuarios/${contas.ana.id}/ingressos`)).json;
    assert.equal(ingressos.filter((t) => t.orderId === pedidoAna).length, 2);
    const lista = (await c.ana.req('GET', '/pedidos')).json;
    assert.equal(lista[0].id, pedidoAna);
  });

  it('repetir a mesma ação não paga nem reserva em dobro', async () => {
    const chave = novaChave();
    const antes = await contar('pedido');
    const primeira = await reservar(c.bruno, eventos.principal, 1, 'Inteira', {}, chave);
    const corpo = { eventId: eventos.principal, type: 'Inteira', quantity: 1 };
    const repetida = await pedir(c.bruno, 'POST', '/pedidos', corpo, chave);
    assert.equal(repetida.status, 201);
    assert.equal(repetida.json.id, primeira.json.id);
    assert.equal(await contar('pedido'), antes + 1);
    const outroConteudo = await pedir(c.bruno, 'POST', '/pedidos', { ...corpo, quantity: 2 }, chave);
    assert.equal(outroConteudo.status, 409);

    const chavePagamento = novaChave();
    await pedir(c.bruno, 'POST', `/pedidos/${primeira.json.id}/pagar`, { paymentMethod: 'cartao' }, chavePagamento);
    await pedir(c.bruno, 'POST', `/pedidos/${primeira.json.id}/pagar`, { paymentMethod: 'cartao' }, chavePagamento);
    await pagar(c.bruno, primeira.json.id, 'cartao');
    assert.equal(await contar('ingresso', 'pedido_id = ?', [primeira.json.id]), 1);
    assert.equal((await c.bruno.req('POST', '/pedidos', corpo)).status, 400, 'sem Idempotency-Key');
  });

  it('cliques simultâneos com a mesma chave criam um pedido só', async () => {
    const chave = novaChave();
    const antes = await contar('pedido');
    const respostas = await Promise.all(Array.from({ length: 5 }, () =>
      pedir(c.bruno, 'POST', '/pedidos', { eventId: eventos.gratis, type: 'Inteira', quantity: 1 }, chave)));
    assert.equal(new Set(respostas.map((r) => r.json.id)).size, 1);
    assert.ok(respostas.every((r) => r.status === 201));
    assert.equal(await contar('pedido'), antes + 1);
    await pedir(c.bruno, 'POST', `/pedidos/${respostas[0].json.id}/cancelar`, {});
  });

  it('pedidos simultâneos pelos últimos lugares nunca vendem além da lotação', async () => {
    const respostas = await Promise.all(Array.from({ length: 4 }, () => reservar(c.ana, eventos.disputado, 1)));
    const codigos = respostas.map((r) => r.status).sort();
    assert.deepEqual(codigos, [201, 201, 409, 409]);
    for (const r of respostas.filter((x) => x.status === 201)) await pedir(c.ana, 'POST', `/pedidos/${r.json.id}/cancelar`, {});
  });

  it('meia-entrada exige a declaração e custa metade', async () => {
    assert.equal((await reservar(c.bruno, eventos.principal, 1, 'Meia-entrada')).status, 400);
    const r = await reservar(c.bruno, eventos.principal, 1, 'Meia-entrada', { halfDeclaration: true });
    assert.equal(r.status, 201);
    assert.equal(r.json.unitPrice, 40);
    await pedir(c.bruno, 'POST', `/pedidos/${r.json.id}/cancelar`, {});
  });

  it('respeita a lotação do evento e o limite de 6 por conta', async () => {
    const ana = await reservar(c.ana, eventos.pequeno, 2);
    assert.equal(ana.status, 201);
    assert.equal((await reservar(c.bruno, eventos.pequeno, 2)).status, 409, 'só resta 1 lugar');
    const bruno = await reservar(c.bruno, eventos.pequeno, 1);
    assert.equal(bruno.status, 201);
    const cancelado = await pedir(c.bruno, 'POST', `/pedidos/${bruno.json.id}/cancelar`, {});
    assert.equal(cancelado.json.status, 'cancelado');
    assert.equal((await reservar(c.bruno, eventos.pequeno, 1)).status, 201, 'cancelar libera o lugar');

    const quatro = await reservar(c.ana, eventos.principal, 4);
    assert.equal(quatro.status, 201, 'Ana tem 2 ingressos + 4 reservados = 6');
    const setimo = await reservar(c.ana, eventos.principal, 1);
    assert.equal(setimo.status, 409);
    assert.match(setimo.json.error, /até 6 ingressos/);
    await pedir(c.ana, 'POST', `/pedidos/${quatro.json.id}/cancelar`, {});
  });

  it('pedido pago não é cancelado (só estornado)', async () => {
    const r = await pedir(c.ana, 'POST', `/pedidos/${pedidoAna}/cancelar`, {});
    assert.equal(r.status, 409);
  });

  it('reserva vencida expira e não pode mais ser paga', async () => {
    const r = await reservar(c.bruno, eventos.principal, 1);
    await sql.query('UPDATE pedido SET expira_em = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = ?', [r.json.id]);
    assert.equal((await c.bruno.req('GET', `/pedidos/${r.json.id}`)).json.status, 'expirado');
    assert.equal((await pagar(c.bruno, r.json.id)).status, 409);
  });

  it('pagamento recusado ou indisponível libera a reserva', async () => {
    for (const [cenario, texto] of [['recusado', /recusado/], ['indisponivel', /indisponível/]]) {
      process.env.PAGAMENTO_SIMULADO = cenario;
      const r = await reservar(c.bruno, eventos.principal, 1);
      const pago = await pagar(c.bruno, r.json.id, 'cartao');
      assert.equal(pago.status, 200);
      assert.equal(pago.json.status, 'recusado');
      assert.match(pago.json.reason, texto);
      assert.equal(await contar('ingresso', 'pedido_id = ?', [r.json.id]), 0);
    }
    process.env.PAGAMENTO_SIMULADO = 'aprovado';
  });

  it('pagamento exige Pix ou cartão, mas evento gratuito dispensa', async () => {
    const r = await reservar(c.bruno, eventos.principal, 1);
    assert.equal((await pagar(c.bruno, r.json.id, 'boleto')).status, 400);
    await pedir(c.bruno, 'POST', `/pedidos/${r.json.id}/cancelar`, {});
    const gratis = await reservar(c.bruno, eventos.gratis, 1);
    const pago = await pedir(c.bruno, 'POST', `/pedidos/${gratis.json.id}/pagar`, {});
    assert.equal(pago.json.status, 'pago');
    assert.equal(pago.json.paymentMethod, 'gratuito');
  });

  it('estorno devolve só os ingressos que continuam com quem comprou', async () => {
    const [t1, t2] = (await c.ana.req('GET', `/pedidos/${pedidoAna}`)).json.tickets.map((t) => t.id);
    const compraBruno = await reservar(c.bruno, eventos.principal, 1);
    const pagoBruno = await pagar(c.bruno, compraBruno.json.id);
    const ticketBruno = pagoBruno.json.tickets[0].id;
    assert.equal((await c.ana.req('PUT', `/ingressos/${t1}/troca`, { userId: contas.ana.id, available: true })).status, 204);
    const proposta = await c.bruno.req('POST', '/trocas', { userId: contas.bruno.id, requestedTicketId: t1, offeredTicketId: ticketBruno });
    assert.equal((await c.ana.req('PUT', `/trocas/${proposta.json.id}`, { userId: contas.ana.id, action: 'aceitar' })).status, 200);

    const estorno = await pedir(c.ana, 'POST', `/pedidos/${pedidoAna}/estornar`, {});
    assert.equal(estorno.status, 200);
    assert.equal(estorno.json.status, 'estornado_parcial');
    assert.equal(estorno.json.refundedAmount, 80);
    assert.deepEqual(estorno.json.tickets.map((t) => [t.id, t.status, t.refunded]), [[t1, 'Ativo', false], [t2, 'Cancelado', true]]);
    assert.equal((await pedir(c.ana, 'POST', `/pedidos/${pedidoAna}/estornar`, {})).status, 409, 'nada mais a estornar');

    // Ingresso recebido em troca é cancelado sem estorno para o pedido de origem.
    assert.equal((await c.ana.req('PUT', `/ingressos/${ticketBruno}/cancelar`, { userId: contas.ana.id })).status, 204);
    assert.equal(await contar('estorno', 'pedido_id = ?', [compraBruno.json.id]), 0);
    assert.equal((await c.bruno.req('GET', `/pedidos/${compraBruno.json.id}`)).json.status, 'pago');
  });

  it('cancelar um ingresso comprado pela própria conta (inclusive pela rota antiga) gera estorno', async () => {
    const direta = await c.bruno.req('POST', `/eventos/${eventos.principal}/ingressos`, { userId: contas.bruno.id, quantity: 1, type: 'Inteira' });
    assert.equal(direta.status, 201);
    assert.equal(direta.json.simulated, true);
    const ticket = direta.json.tickets[0];
    assert.ok(ticket.orderId, 'compra direta vira pedido pago');
    assert.equal((await c.bruno.req('PUT', `/ingressos/${ticket.id}/cancelar`, { userId: contas.bruno.id })).status, 204);
    const pedido = (await c.bruno.req('GET', `/pedidos/${ticket.orderId}`)).json;
    assert.equal(pedido.status, 'estornado');
    assert.equal(pedido.paymentMethod, 'direto');
    assert.equal(pedido.refundedAmount, 80);
  });

  it('depois que o evento começa, não há estorno nem cancelamento', async () => {
    const r = await reservar(c.ana, eventos.hoje, 1);
    const pago = await pagar(c.ana, r.json.id);
    assert.equal(pago.json.canRefund, false);
    const estorno = await pedir(c.ana, 'POST', `/pedidos/${r.json.id}/estornar`, {});
    assert.equal(estorno.status, 409);
    assert.match(estorno.json.error, /véspera/);
    const cancelar = await c.ana.req('PUT', `/ingressos/${pago.json.tickets[0].id}/cancelar`, { userId: contas.ana.id });
    assert.equal(cancelar.status, 409);
  });

  it('pedido de outra conta não aparece e só participantes compram', async () => {
    assert.equal((await c.bruno.req('GET', `/pedidos/${pedidoAna}`)).status, 404);
    for (const acao of ['pagar', 'cancelar', 'estornar']) {
      assert.equal((await pedir(c.bruno, 'POST', `/pedidos/${pedidoAna}/${acao}`, {})).status, 404, acao);
    }
    assert.ok(!(await c.bruno.req('GET', '/pedidos')).json.some((p) => p.id === pedidoAna));
    assert.equal((await reservar(c.org, eventos.principal, 1)).status, 403);
    assert.equal((await new Cliente(api.url).req('GET', '/pedidos')).status, 401);
  });
});
