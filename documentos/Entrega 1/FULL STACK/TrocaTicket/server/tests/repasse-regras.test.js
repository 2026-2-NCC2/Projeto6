// Regras da etapa 4 além do roteiro básico (repasse.test.js): concorrência, repetição, recusa e
// cancelamento de pagamento, limite por conta, teto de preço, convívio com trocas e estornos,
// privacidade e permissões. Banco temporário criado pelo runner (ver tests/apoio.js).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Cliente, SEM_MYSQL, aprovarConta, configMysql, conectar, criarBancoTemporario, iniciarApi } = require('./apoio');

describe('regras de revenda, fila e transferência (banco temporário)', { skip: !configMysql() && SEM_MYSQL }, () => {
  let banco;
  let api;
  let sql;
  const contas = {};

  async function cadastrar(nome, tipo = 1) {
    const cliente = new Cliente(api.url);
    const email = `${nome}.${randomUUID()}@example.test`;
    const dados = { nome, email, senha: randomUUID(), tipo_perfil: tipo };
    if (tipo === 2) Object.assign(dados, { documento: '12345678000199', nome_organizacao: 'Produtora Teste' });
    const r = await cliente.cadastrar(dados);
    assert.equal(r.status, 201);
    if (tipo !== 1) await aprovarConta(sql, r.json.usuarioId);
    return { cliente, email, id: r.json.usuarioId };
  }

  const gravar = (conta, metodo, caminho, corpo = {}, chave = randomUUID()) =>
    conta.cliente.req(metodo, caminho, corpo, { cabecalhos: { 'Idempotency-Key': chave } });

  async function evento({ capacidade = 10, preco = 50, status = 'Publicado' } = {}) {
    const [r] = await sql.execute(
      `INSERT INTO evento (organizador_id, titulo, categoria, formato, data_inicio, data_fim,
        horario_inicio, horario_termino, local, capacidade, preco_base, status)
       VALUES (?, 'Evento de regras', 'Música', 'Presencial', CURRENT_DATE + INTERVAL 7 DAY,
        CURRENT_DATE + INTERVAL 7 DAY, '15:00', '18:00', 'Auditório', ?, ?, ?)`,
      [contas.org.id, capacidade, preco, status],
    );
    return r.insertId;
  }

  async function comprar(conta, eventId, quantity = 1, type = 'Inteira') {
    const corpo = { eventId, type, quantity, ...(type === 'Meia-entrada' ? { halfDeclaration: true } : {}) };
    const reserva = await gravar(conta, 'POST', '/pedidos', corpo);
    assert.equal(reserva.status, 201, JSON.stringify(reserva.json));
    const pago = await gravar(conta, 'POST', `/pedidos/${reserva.json.id}/pagar`, { paymentMethod: 'pix' });
    assert.equal(pago.json.status, 'pago');
    return { pedidoId: reserva.json.id, ticketIds: pago.json.tickets.map((t) => t.id) };
  }

  const anunciar = (conta, ticketId, priceCents = 5000, chave) =>
    gravar(conta, 'POST', '/anuncios', { ticketId, priceCents }, chave);

  async function ingresso(ticketId) {
    const [[linha]] = await sql.execute(
      'SELECT dono_atual_id, preco, codigo_ingresso, status, disponivel_troca FROM ingresso WHERE id = ?',
      [ticketId],
    );
    return linha;
  }

  async function situacaoAnuncio(id) {
    const [[linha]] = await sql.execute('SELECT status FROM anuncio_ingresso WHERE id = ?', [id]);
    return linha.status;
  }

  async function reservaAberta(conta, eventId) {
    const r = await conta.cliente.req('GET', '/pedidos');
    return r.json.find((p) => p.eventId === eventId && p.status === 'reservado');
  }

  before(async () => {
    process.env.PAGAMENTO_SIMULADO = 'aprovado';
    banco = await criarBancoTemporario();
    api = await iniciarApi(banco.nome);
    sql = await conectar({ database: banco.nome });
    contas.org = await cadastrar('Organizador', 2);
    for (const nome of ['vendedor', 'ana', 'bruno', 'carla']) contas[nome] = await cadastrar(nome);
  });

  after(async () => {
    delete process.env.PAGAMENTO_SIMULADO;
    await sql?.end();
    await api?.fechar();
    await banco?.apagar();
  });

  it('duas contas reservando o mesmo anúncio ao mesmo tempo: só uma consegue', async () => {
    const eventId = await evento();
    const { ticketIds } = await comprar(contas.vendedor, eventId);
    const anuncio = await anunciar(contas.vendedor, ticketIds[0]);
    assert.equal(anuncio.status, 201);
    const respostas = await Promise.all(
      [contas.ana, contas.bruno].map((c) => gravar(c, 'POST', `/anuncios/${anuncio.json.id}/reservar`)),
    );
    assert.deepEqual(respostas.map((r) => r.status).sort(), [201, 409]);
    const [[{ n }]] = await sql.execute(
      "SELECT COUNT(*) AS n FROM pedido WHERE anuncio_id = ? AND status = 'reservado'",
      [anuncio.json.id],
    );
    assert.equal(Number(n), 1);
  });

  it('repetir a reserva com a mesma chave devolve o mesmo pedido', async () => {
    const eventId = await evento();
    const { ticketIds } = await comprar(contas.vendedor, eventId);
    const anuncio = await anunciar(contas.vendedor, ticketIds[0]);
    const chave = randomUUID();
    const primeira = await gravar(contas.ana, 'POST', `/anuncios/${anuncio.json.id}/reservar`, {}, chave);
    const segunda = await gravar(contas.ana, 'POST', `/anuncios/${anuncio.json.id}/reservar`, {}, chave);
    assert.equal(primeira.status, 201);
    assert.equal(segunda.status, 201);
    assert.equal(segunda.json.id, primeira.json.id);
    // A mesma chave com outro conteúdo é recusada.
    const outra = await gravar(contas.ana, 'POST', `/anuncios/${anuncio.json.id}/reservar`, { halfDeclaration: true }, chave);
    assert.equal(outra.status, 409);
  });

  it('pagamento recusado devolve o anúncio e chama o próximo da fila', async () => {
    const eventId = await evento();
    const { ticketIds } = await comprar(contas.vendedor, eventId);
    for (const conta of [contas.ana, contas.bruno]) {
      assert.equal((await gravar(conta, 'POST', '/fila', { eventId, type: 'Inteira' })).status, 201);
    }
    const anuncio = await anunciar(contas.vendedor, ticketIds[0]);
    assert.equal(anuncio.json.status, 'reserved', 'a fila recebeu o anúncio na hora');
    const daAna = await reservaAberta(contas.ana, eventId);
    assert.ok(daAna);
    assert.equal(daAna.resale, true);
    assert.deepEqual(daAna.tickets, [], 'antes de pagar o ingresso do vendedor não aparece');
    process.env.PAGAMENTO_SIMULADO = 'recusado';
    try {
      const recusa = await gravar(contas.ana, 'POST', `/pedidos/${daAna.id}/pagar`, { paymentMethod: 'cartao' });
      assert.equal(recusa.json.status, 'recusado');
    } finally {
      process.env.PAGAMENTO_SIMULADO = 'aprovado';
    }
    assert.equal((await ingresso(ticketIds[0])).dono_atual_id, contas.vendedor.id);
    const doBruno = await reservaAberta(contas.bruno, eventId);
    assert.ok(doBruno, 'a vez passou para o segundo da fila');
    const filaAna = (await contas.ana.cliente.req('GET', '/fila')).json.find((f) => f.eventId === eventId);
    assert.equal(filaAna.status, 'left');
    const pago = await gravar(contas.bruno, 'POST', `/pedidos/${doBruno.id}/pagar`, { paymentMethod: 'pix' });
    assert.equal(pago.json.status, 'pago');
    assert.equal(pago.json.tickets.length, 1);
    assert.equal(pago.json.canRefund, false, 'compra de revenda não tem estorno');
    assert.equal((await ingresso(ticketIds[0])).dono_atual_id, contas.bruno.id);
    const filaBruno = (await contas.bruno.cliente.req('GET', '/fila')).json.find((f) => f.eventId === eventId);
    assert.equal(filaBruno.status, 'completed');
    assert.equal(await situacaoAnuncio(anuncio.json.id), 'sold');
  });

  it('cancelar a reserva ou sair da fila devolve o anúncio para o próximo', async () => {
    const eventId = await evento();
    const { ticketIds } = await comprar(contas.vendedor, eventId);
    for (const conta of [contas.ana, contas.bruno, contas.carla]) {
      await gravar(conta, 'POST', '/fila', { eventId, type: 'Inteira' });
    }
    await anunciar(contas.vendedor, ticketIds[0]);
    const daAna = await reservaAberta(contas.ana, eventId);
    const cancelado = await gravar(contas.ana, 'POST', `/pedidos/${daAna.id}/cancelar`);
    assert.equal(cancelado.json.status, 'cancelado');
    assert.ok(await reservaAberta(contas.bruno, eventId), 'Bruno recebe após o cancelamento');
    const filaBruno = (await contas.bruno.cliente.req('GET', '/fila')).json.find((f) => f.eventId === eventId);
    const saida = await gravar(contas.bruno, 'DELETE', `/fila/${filaBruno.id}`);
    assert.equal(saida.json.status, 'left');
    assert.equal(await reservaAberta(contas.bruno, eventId), undefined);
    assert.ok(await reservaAberta(contas.carla, eventId), 'Carla recebe quando Bruno sai da fila');
    assert.equal((await ingresso(ticketIds[0])).dono_atual_id, contas.vendedor.id);
  });

  it('o código muda na revenda e o vendedor não vê o código novo', async () => {
    const eventId = await evento();
    const { pedidoId, ticketIds } = await comprar(contas.vendedor, eventId);
    const antes = await ingresso(ticketIds[0]);
    const anuncio = await anunciar(contas.vendedor, ticketIds[0], 4000);
    const reserva = await gravar(contas.ana, 'POST', `/anuncios/${anuncio.json.id}/reservar`);
    await gravar(contas.ana, 'POST', `/pedidos/${reserva.json.id}/pagar`, { paymentMethod: 'pix' });
    const depois = await ingresso(ticketIds[0]);
    assert.notEqual(depois.codigo_ingresso, antes.codigo_ingresso);
    assert.equal(Number(depois.preco), 40, 'o teto de quem comprou passa a ser o que pagou');
    const doVendedor = (await contas.vendedor.cliente.req('GET', `/pedidos/${pedidoId}`)).json;
    assert.equal(doVendedor.tickets[0].code, null);
    assert.equal(doVendedor.tickets[0].withBuyer, false);
    assert.equal(doVendedor.canRefund, false);
    const daAna = (await contas.ana.cliente.req('GET', `/usuarios/${contas.ana.id}/ingressos`)).json;
    assert.equal(daAna.find((t) => t.id === ticketIds[0]).code, depois.codigo_ingresso);
    // Quem comprou por R$ 40 não revende por mais.
    assert.equal((await anunciar(contas.ana, ticketIds[0], 4001)).status, 409);
    assert.equal((await anunciar(contas.ana, ticketIds[0], 4000)).status, 201);
  });

  it('teto de preço, ingresso recebido de graça e validações do anúncio', async () => {
    const eventId = await evento({ preco: 30 });
    const { ticketIds } = await comprar(contas.vendedor, eventId);
    assert.equal((await anunciar(contas.vendedor, ticketIds[0], 3001)).status, 409);
    assert.equal((await anunciar(contas.vendedor, ticketIds[0], 0)).status, 400);
    assert.equal((await anunciar(contas.ana, ticketIds[0], 1000)).status, 404, 'ingresso de outra conta');
    const convite = await gravar(contas.vendedor, 'POST', '/transferencias', { ticketId: ticketIds[0], email: contas.ana.email });
    assert.equal(convite.status, 201);
    assert.equal((await anunciar(contas.vendedor, ticketIds[0], 1000)).status, 409, 'convite pendente bloqueia anúncio');
    assert.equal((await gravar(contas.ana, 'POST', `/transferencias/${convite.json.id}/aceitar`)).status, 200);
    const recebido = await ingresso(ticketIds[0]);
    assert.equal(recebido.dono_atual_id, contas.ana.id);
    assert.equal(Number(recebido.preco), 0);
    assert.equal((await anunciar(contas.ana, ticketIds[0], 100)).status, 409, 'recebido de graça só transfere de graça');
    const reenvio = await gravar(contas.ana, 'POST', '/transferencias', { ticketId: ticketIds[0], email: contas.bruno.email });
    assert.equal(reenvio.status, 201);
  });

  it('meia-entrada exige declaração e evento fora de venda recusa novas operações', async () => {
    const eventId = await evento();
    const { ticketIds } = await comprar(contas.vendedor, eventId, 1, 'Meia-entrada');
    const anuncio = await anunciar(contas.vendedor, ticketIds[0], 2500);
    assert.equal(anuncio.status, 201);
    assert.equal(anuncio.json.type, 'Meia-entrada');
    assert.equal((await gravar(contas.ana, 'POST', `/anuncios/${anuncio.json.id}/reservar`)).status, 400);
    assert.equal((await gravar(contas.ana, 'POST', '/fila', { eventId, type: 'Meia-entrada' })).status, 400);
    const ok = await gravar(contas.ana, 'POST', `/anuncios/${anuncio.json.id}/reservar`, { halfDeclaration: true });
    assert.equal(ok.status, 201);
    const encerrado = await evento();
    const { ticketIds: outros } = await comprar(contas.vendedor, encerrado);
    await sql.execute("UPDATE evento SET status = 'Cancelado' WHERE id = ?", [encerrado]);
    assert.equal((await anunciar(contas.vendedor, outros[0])).status, 409);
    assert.equal((await gravar(contas.ana, 'POST', '/fila', { eventId: encerrado, type: 'Inteira' })).status, 409);
  });

  it('limite de 6 por conta e evento vale para revenda, fila e convite', async () => {
    const eventId = await evento({ capacidade: 20 });
    const { ticketIds } = await comprar(contas.vendedor, eventId, 2);
    await comprar(contas.carla, eventId, 6);
    const anuncio = await anunciar(contas.vendedor, ticketIds[0]);
    assert.equal((await gravar(contas.carla, 'POST', `/anuncios/${anuncio.json.id}/reservar`)).status, 409);
    const convite = await gravar(contas.vendedor, 'POST', '/transferencias', { ticketId: ticketIds[1], email: contas.carla.email });
    assert.equal(convite.status, 409);
    // Na fila, quem está no limite é pulado e continua esperando.
    assert.equal((await gravar(contas.vendedor, 'DELETE', `/anuncios/${anuncio.json.id}`)).status, 200);
    await gravar(contas.carla, 'POST', '/fila', { eventId, type: 'Inteira' });
    await gravar(contas.bruno, 'POST', '/fila', { eventId, type: 'Inteira' });
    const novo = await anunciar(contas.vendedor, ticketIds[0]);
    assert.equal(novo.json.status, 'reserved');
    assert.equal(await reservaAberta(contas.carla, eventId), undefined);
    assert.ok(await reservaAberta(contas.bruno, eventId));
    const filaCarla = (await contas.carla.cliente.req('GET', '/fila')).json.find((f) => f.eventId === eventId);
    assert.equal(filaCarla.status, 'queued');
  });

  it('revenda, convite, troca, cancelamento e estorno não acontecem juntos no mesmo ingresso', async () => {
    const eventId = await evento();
    const { pedidoId, ticketIds } = await comprar(contas.vendedor, eventId, 2);
    const [listado, trocavel] = ticketIds;
    const anuncio = await anunciar(contas.vendedor, listado);
    const userId = contas.vendedor.id;
    const troca = await contas.vendedor.cliente.req('PUT', `/ingressos/${listado}/troca`, { userId, available: true });
    assert.equal(troca.status, 409);
    const cancelar = await contas.vendedor.cliente.req('PUT', `/ingressos/${listado}/cancelar`, { userId });
    assert.equal(cancelar.status, 409);
    const lista = (await contas.vendedor.cliente.req('GET', `/usuarios/${userId}/ingressos`)).json;
    assert.equal(lista.find((t) => t.id === listado).inResale, true);
    assert.equal(lista.find((t) => t.id === trocavel).inResale, false);
    // O ingresso oferecido para troca não pode ser anunciado nem transferido.
    assert.equal((await contas.vendedor.cliente.req('PUT', `/ingressos/${trocavel}/troca`, { userId, available: true })).status, 204);
    assert.equal((await anunciar(contas.vendedor, trocavel)).status, 409);
    const convite = await gravar(contas.vendedor, 'POST', '/transferencias', { ticketId: trocavel, email: contas.ana.email });
    assert.equal(convite.status, 409);
    // Outra conta não oferece em troca um ingresso que está anunciado.
    const { ticketIds: daAna } = await comprar(contas.ana, eventId);
    const anuncioAna = await anunciar(contas.ana, daAna[0]);
    assert.equal(anuncioAna.status, 201);
    const proposta = await contas.ana.cliente.req('POST', '/trocas', {
      userId: contas.ana.id,
      requestedTicketId: trocavel,
      offeredTicketId: daAna[0],
    });
    assert.equal(proposta.status, 409);
    // O estorno ignora o ingresso anunciado e devolve só o outro.
    await contas.vendedor.cliente.req('PUT', `/ingressos/${trocavel}/troca`, { userId, available: false });
    const estorno = await gravar(contas.vendedor, 'POST', `/pedidos/${pedidoId}/estornar`);
    assert.equal(estorno.status, 200);
    assert.equal((await ingresso(listado)).status, 'A');
    assert.equal((await ingresso(trocavel)).status, 'C');
    assert.equal(await situacaoAnuncio(anuncio.json.id), 'active');
  });

  it('privacidade e permissões entre contas', async () => {
    const eventId = await evento();
    const { ticketIds } = await comprar(contas.vendedor, eventId, 2);
    const anuncio = await anunciar(contas.vendedor, ticketIds[0]);
    const visto = (await contas.ana.cliente.req('GET', `/anuncios?eventId=${eventId}`)).json.find(
      (a) => a.id === anuncio.json.id,
    );
    assert.equal(visto.sellerId, null);
    assert.equal(visto.ticketId, null);
    assert.equal(visto.mine, false);
    const meu = (await contas.vendedor.cliente.req('GET', '/anuncios')).json.find((a) => a.id === anuncio.json.id);
    assert.equal(meu.ticketId, ticketIds[0]);
    assert.equal(meu.mine, true);
    assert.equal((await gravar(contas.ana, 'DELETE', `/anuncios/${anuncio.json.id}`)).status, 404);
    assert.equal((await gravar(contas.vendedor, 'POST', `/anuncios/${anuncio.json.id}/reservar`)).status, 409);
    const convite = await gravar(contas.vendedor, 'POST', '/transferencias', { ticketId: ticketIds[1], email: contas.ana.email });
    assert.equal((await gravar(contas.vendedor, 'POST', `/transferencias/${convite.json.id}/aceitar`)).status, 403);
    assert.equal((await gravar(contas.bruno, 'POST', `/transferencias/${convite.json.id}/cancelar`)).status, 404);
    const recebidos = (await contas.ana.cliente.req('GET', '/transferencias')).json;
    assert.equal(recebidos.find((c) => c.id === convite.json.id).direction, 'recebido');
    assert.equal((await contas.bruno.cliente.req('GET', '/transferencias')).json.some((c) => c.id === convite.json.id), false);
    const filaAna = await gravar(contas.ana, 'POST', '/fila', { eventId, type: 'Meia-entrada', halfDeclaration: true });
    assert.equal((await gravar(contas.bruno, 'DELETE', `/fila/${filaAna.json.id}`)).status, 404);
    // Convite para si, para e-mail inexistente ou para conta que não é de usuário.
    const comum = { ticketId: ticketIds[1] };
    await gravar(contas.vendedor, 'POST', `/transferencias/${convite.json.id}/cancelar`);
    assert.equal((await gravar(contas.vendedor, 'POST', '/transferencias', { ...comum, email: contas.vendedor.email })).status, 400);
    assert.equal((await gravar(contas.vendedor, 'POST', '/transferencias', { ...comum, email: 'ninguem@example.test' })).status, 404);
    assert.equal((await gravar(contas.vendedor, 'POST', '/transferencias', { ...comum, email: contas.org.email })).status, 404);
    // Sem login: 401.
    assert.equal((await new Cliente(api.url).req('GET', '/anuncios')).status, 401);
  });
});
