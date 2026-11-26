// Testes da etapa 6: aprovação de contas, administração ligada ao banco, cancelamento de evento
// com estorno e o script que cria contas de administração. Banco temporário (ver tests/apoio.js).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomInt, randomUUID } = require('node:crypto');
const { Cliente, SEM_MYSQL, aprovarConta, configMysql, conectar, criarBancoTemporario, iniciarApi } = require('./apoio');
const { ErroAdmin, criarAdministrador, validarDadosAdmin } = require('../scripts/criar-admin');

describe('administração, aprovação de contas e cancelamento de evento (banco temporário)', { skip: !configMysql() && SEM_MYSQL }, () => {
  let banco;
  let api;
  let sql;
  const contas = {};

  async function cadastrar(nome, tipo = 1) {
    const cliente = new Cliente(api.url);
    const email = `${nome}.${randomUUID()}@example.test`;
    const dados = { nome: `${nome} Teste`, email, senha: randomUUID(), tipo_perfil: tipo };
    if (tipo === 2 || tipo === 3) {
      // CNPJ fictício diferente para cada conta (o documento é único).
      Object.assign(dados, { documento: String(randomInt(1e13, 1e14 - 1)), nome_organizacao: `Empresa ${nome}` });
    }
    const r = await cliente.cadastrar(dados);
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return { cliente, email, nome: dados.nome, id: r.json.usuarioId };
  }

  // Conta de administração: só pelo script do servidor (aqui, a mesma função que o script usa).
  async function criarAdmin(nome) {
    const email = `${nome}.${randomUUID()}@example.test`;
    const senha = `Adm-${randomUUID()}`;
    const conta = await criarAdministrador({ ...configMysql(), database: banco.nome }, { nome: `${nome} Admin`, email, senha });
    const cliente = new Cliente(api.url);
    assert.equal((await cliente.entrar(email, senha)).status, 200);
    return { cliente, email, nome: `${nome} Admin`, id: conta.id };
  }

  const gravar = (conta, metodo, caminho, corpo = {}, chave = randomUUID()) =>
    conta.cliente.req(metodo, caminho, corpo, { cabecalhos: { 'Idempotency-Key': chave } });
  const ler = (conta, caminho) => conta.cliente.req('GET', caminho);
  const decidir = (admin, conta, corpo, chave) => gravar(admin, 'POST', `/admin/contas/${conta.id}/aprovacao`, corpo, chave);
  const cancelar = (conta, eventoId, motivo, chave) => gravar(conta, 'POST', `/eventos/${eventoId}/cancelar`, { motivo }, chave);

  const dataFutura = (dias) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);
  const dadosEvento = (organizador, extra = {}) => ({
    organizadorId: organizador.id, title: 'Festival da Aprovação', category: 'Música', date: dataFutura(20),
    endDate: dataFutura(20), time: '18:00', endTime: '22:00', location: 'São Paulo, SP', capacity: 100, price: 60,
    status: 'Rascunho', description: 'Evento fictício.', image: '/images/coldplay.jpg', ...extra,
  });

  async function evento({ organizador = contas.org, preco = 40, capacidade = 50 } = {}) {
    const [r] = await sql.execute(
      `INSERT INTO evento (organizador_id, titulo, categoria, formato, data_inicio, data_fim,
        horario_inicio, horario_termino, local, capacidade, preco_base, status)
       VALUES (?, 'Show da administração', 'Música', 'Presencial', CURRENT_DATE + INTERVAL 10 DAY,
        CURRENT_DATE + INTERVAL 10 DAY, '15:00', '18:00', 'Arena', ?, ?, 'Publicado')`,
      [organizador.id, capacidade, preco],
    );
    return r.insertId;
  }

  async function comprar(conta, eventId, quantity = 1) {
    const reserva = await gravar(conta, 'POST', '/pedidos', { eventId, type: 'Inteira', quantity });
    assert.equal(reserva.status, 201, JSON.stringify(reserva.json));
    const pago = await gravar(conta, 'POST', `/pedidos/${reserva.json.id}/pagar`, { paymentMethod: 'pix' });
    assert.equal(pago.json.status, 'pago', JSON.stringify(pago.json));
    return { pedidoId: reserva.json.id, tickets: pago.json.tickets };
  }

  async function valor(consulta, params) {
    const [[linha]] = await sql.execute(consulta, params);
    return linha;
  }

  before(async () => {
    process.env.PAGAMENTO_SIMULADO = 'aprovado';
    banco = await criarBancoTemporario();
    api = await iniciarApi(banco.nome);
    sql = await conectar({ database: banco.nome });
    contas.admin = await criarAdmin('Alice');
    contas.org = await cadastrar('Olga', 2);
    contas.outroOrg = await cadastrar('Otto', 2);
    for (const conta of [contas.org, contas.outroOrg]) await aprovarConta(sql, conta.id);
    for (const nome of ['ana', 'bruno', 'carla', 'dora', 'ella']) contas[nome] = await cadastrar(nome);
  });

  after(async () => {
    delete process.env.PAGAMENTO_SIMULADO;
    await sql?.end();
    await api?.fechar();
    await banco?.apagar();
  });

  it('cadastro: usuário já nasce aprovado; organizador e fornecedor aguardam; ninguém se cadastra como administração', async () => {
    const usuario = await cadastrar('paula');
    assert.equal((await ler(usuario, '/sessao')).json.user.aprovacao, 'A');
    const organizador = await cadastrar('pedro', 2);
    const fornecedor = await cadastrar('fabio', 3);
    for (const conta of [organizador, fornecedor]) {
      assert.equal((await ler(conta, '/sessao')).json.user.aprovacao, 'P');
      const situacao = (await ler(conta, '/conta/aprovacao')).json;
      assert.equal(situacao.approval, 'P');
      assert.equal(situacao.lastDecision, null);
    }
    for (const tipo of [4, '4', 0, 9, 'admin']) {
      const email = `intruso.${randomUUID()}@example.test`;
      const r = await new Cliente(api.url).cadastrar({ nome: 'Intruso Teste', email, senha: randomUUID(), tipo_perfil: tipo });
      assert.equal(r.status, 400, `tipo_perfil ${tipo}`);
      assert.equal((await valor('SELECT COUNT(*) AS n FROM usuario WHERE email = ?', [email])).n, 0);
    }
    assert.equal((await new Cliente(api.url).req('GET', '/conta/aprovacao')).status, 401);
  });

  it('conta pendente: rascunho e perfil liberados; publicar, vincular fornecedor, portaria e propostas bloqueados', async () => {
    const org = await cadastrar('quiteria', 2);
    const forn = await cadastrar('rui', 3);
    const rascunho = await org.cliente.req('POST', '/eventos', dadosEvento(org));
    assert.equal(rascunho.status, 201, JSON.stringify(rascunho.json));
    const publicar = await org.cliente.req('POST', '/eventos', dadosEvento(org, { status: 'Publicado' }));
    assert.equal(publicar.status, 403);
    assert.equal(publicar.json.code, 'APPROVAL_REQUIRED');
    assert.match(publicar.json.error, /aguarda aprovação/);
    const eventoId = rascunho.json.id;
    assert.equal((await org.cliente.req('PUT', `/eventos/${eventoId}`, dadosEvento(org, { status: 'Publicado' }))).status, 403);
    assert.equal((await org.cliente.req('PUT', `/eventos/${eventoId}`, dadosEvento(org, { title: 'Rascunho editado' }))).status, 200);
    assert.equal((await org.cliente.req('POST', `/organizadores/${org.id}/eventos/${eventoId}/fornecedores/${forn.id}`)).status, 403);
    const portaria = await gravar(org, 'POST', '/portaria/entradas', { eventId: eventoId, code: 'ABCD-1234' });
    assert.equal(portaria.json.code, 'APPROVAL_REQUIRED');

    const perfil = { name: 'Rui Teste', email: forn.email, tradeName: 'Rui Som', phone: '11999990000', address: {}, notifications: {}, twoFactor: false };
    assert.equal((await forn.cliente.req('PUT', `/fornecedores/${forn.id}/perfil`, perfil)).status, 200, 'perfil continua editável');
    const produto = { name: 'Caixa de som', category: 'Som', type: 'Equipamento', unit: 'unidade', price: 150 };
    const bloqueado = await forn.cliente.req('POST', `/fornecedores/${forn.id}/produtos`, produto);
    assert.equal(bloqueado.status, 403);
    assert.equal(bloqueado.json.code, 'APPROVAL_REQUIRED');
    assert.equal((await ler(forn, `/fornecedores/${forn.id}/produtos`)).status, 200, 'leitura continua liberada');
    const proposta = { eventId: await evento(), status: 'Em análise', items: [{ productId: 1, qty: 1, price: 10 }] };
    assert.equal((await forn.cliente.req('POST', `/fornecedores/${forn.id}/propostas`, proposta)).status, 403);
  });

  it('a administração lista, recusa com motivo e aprova; cada decisão fica no histórico', async () => {
    const { admin } = contas;
    const org = await cadastrar('sergio', 2);
    const forn = await cadastrar('tania', 3);
    const pendentes = (await ler(admin, '/admin/contas?situacao=P')).json;
    for (const conta of [org, forn]) assert.ok(pendentes.some((c) => c.id === conta.id && c.approval === 'P'));
    assert.ok(pendentes.every((c) => c.approval === 'P'));
    const todas = (await ler(admin, '/admin/contas')).json;
    const primeiraNaoPendente = todas.findIndex((c) => c.approval !== 'P');
    assert.ok(todas.slice(primeiraNaoPendente).every((c) => c.approval !== 'P'), 'pendentes primeiro');
    const achada = (await ler(admin, `/admin/contas?busca=${encodeURIComponent('Empresa sergio')}`)).json;
    assert.deepEqual(achada.map((c) => [c.id, c.profile, c.organization]), [[org.id, 'organizador', 'Empresa sergio']]);
    assert.deepEqual((await ler(admin, '/admin/contas?busca=%25')).json, [], 'o % da busca não vira curinga');
    assert.ok((await ler(admin, '/admin/contas?perfil=4')).json.some((c) => c.id === admin.id));
    assert.equal((await ler(admin, '/admin/contas?situacao=X')).status, 400);
    assert.equal((await ler(admin, '/admin/contas?perfil=9')).status, 400);

    assert.equal((await decidir(admin, org, { situacao: 'R' })).status, 400, 'recusa exige motivo');
    assert.equal((await decidir(admin, org, { situacao: 'Z', motivo: 'Teste' })).status, 400);
    assert.equal((await decidir(admin, org, { situacao: 'A', motivo: 'x'.repeat(501) })).status, 400);
    const recusa = await decidir(admin, org, { situacao: 'R', motivo: 'Documento ilegível' });
    assert.equal(recusa.status, 200, JSON.stringify(recusa.json));
    assert.equal(recusa.json.approval, 'R');
    assert.deepEqual([recusa.json.lastDecision.reason, recusa.json.lastDecision.by], ['Documento ilegível', admin.nome]);
    const vista = (await ler(org, '/conta/aprovacao')).json;
    assert.equal(vista.approval, 'R');
    assert.equal(vista.lastDecision.reason, 'Documento ilegível');
    assert.equal('by' in vista.lastDecision, false, 'a conta não vê quem decidiu');
    const publicar = await org.cliente.req('POST', '/eventos', dadosEvento(org, { status: 'Publicado' }));
    assert.equal(publicar.status, 403);
    assert.match(publicar.json.error, /recusada/);

    const chave = randomUUID();
    const aprovacao = await decidir(admin, org, { situacao: 'A' }, chave);
    assert.equal(aprovacao.json.approval, 'A');
    assert.deepEqual((await decidir(admin, org, { situacao: 'A' }, chave)).json, aprovacao.json, 'mesma chave, mesma resposta');
    assert.equal((await decidir(admin, org, { situacao: 'A' })).json.approval, 'A', 'repetir a decisão não muda nada');
    const historico = (await sql.execute('SELECT situacao, motivo, admin_id FROM aprovacao_conta WHERE usuario_id = ? ORDER BY id', [org.id]))[0];
    assert.deepEqual(historico.map((h) => [h.situacao, h.motivo, h.admin_id]), [['R', 'Documento ilegível', admin.id], ['A', null, admin.id]]);
    assert.equal((await org.cliente.req('POST', '/eventos', dadosEvento(org, { status: 'Publicado' }))).status, 201, 'aprovada, publica');
    assert.equal((await ler(org, '/sessao')).json.user.aprovacao, 'A', 'a sessão aberta já vê a aprovação');

    await decidir(admin, forn, { situacao: 'A', motivo: 'Cadastro conferido' });
    const produto = { name: 'Painel de LED', category: 'Luz', type: 'Equipamento', unit: 'unidade', price: 300 };
    assert.equal((await forn.cliente.req('POST', `/fornecedores/${forn.id}/produtos`, produto)).status, 201);
  });

  it('a administração não muda a própria conta nem outra conta de administração; outros perfis não entram', async () => {
    const { admin } = contas;
    const outroAdmin = await criarAdmin('Beatriz');
    assert.equal((await decidir(admin, admin, { situacao: 'R', motivo: 'Teste' })).status, 409);
    assert.equal((await decidir(admin, outroAdmin, { situacao: 'R', motivo: 'Teste' })).status, 409);
    assert.equal((await decidir(admin, { id: 99999999 }, { situacao: 'A' })).status, 404);
    for (const caminho of ['/admin/resumo', '/admin/contas', '/admin/eventos', '/admin/eventos/1']) {
      assert.equal((await ler(contas.org, caminho)).status, 403, caminho);
      assert.equal((await ler(contas.ana, caminho)).status, 403, caminho);
      assert.equal((await new Cliente(api.url).req('GET', caminho)).status, 401, caminho);
    }
    assert.equal((await decidir(contas.org, contas.ana, { situacao: 'R', motivo: 'Teste' })).status, 403);
    assert.equal((await valor('SELECT status_aprovacao AS s FROM usuario WHERE id = ?', [contas.ana.id])).s, 'A');
  });

  it('conta de usuário recusada continua lendo, mas não compra, não favorita e não publica na comunidade', async () => {
    const rita = await cadastrar('rita');
    const eventoId = await evento();
    assert.equal((await decidir(contas.admin, rita, { situacao: 'R', motivo: 'Uso indevido da comunidade' })).status, 200);
    const compra = await gravar(rita, 'POST', '/pedidos', { eventId: eventoId, type: 'Inteira', quantity: 1 });
    assert.equal(compra.status, 403);
    assert.equal(compra.json.code, 'APPROVAL_REQUIRED');
    assert.equal((await rita.cliente.req('POST', `/usuarios/${rita.id}/favoritos/${eventoId}`)).status, 403);
    const mensagem = await rita.cliente.req('POST', '/comunidade/mensagens', { userId: rita.id, text: 'Oi' });
    assert.equal(mensagem.status, 403);
    assert.equal((await ler(rita, '/pedidos')).status, 200);
    assert.equal((await ler(rita, `/usuarios/${rita.id}/ingressos`)).status, 200);
    await decidir(contas.admin, rita, { situacao: 'A', motivo: 'Recurso aceito' });
    assert.equal((await gravar(rita, 'POST', '/pedidos', { eventId: eventoId, type: 'Inteira', quantity: 1 })).status, 201);
  });

  it('cancelar evento: estorna quem pagou por último e encerra reservas, anúncios, fila, convites e trocas', async () => {
    const { org, ana, bruno, carla, dora, ella } = contas;
    const eventoId = await evento({ preco: 40, capacidade: 50 });
    const { pedidoId: pedidoAna, tickets: daAna } = await comprar(ana, eventoId, 3);
    const { pedidoId: pedidoBruno, tickets: doBruno } = await comprar(bruno, eventoId, 2);
    const { pedidoId: pedidoElla, tickets: daElla } = await comprar(ella, eventoId, 1);
    // a1: revendido para a Carla por R$ 30,00.
    const vendido = await gravar(ana, 'POST', '/anuncios', { ticketId: daAna[0].id, priceCents: 3000 });
    const reservaCarla = await gravar(carla, 'POST', `/anuncios/${vendido.json.id}/reservar`);
    assert.equal(reservaCarla.status, 201, JSON.stringify(reservaCarla.json));
    const pedidoCarla = reservaCarla.json.id;
    assert.equal((await gravar(carla, 'POST', `/pedidos/${pedidoCarla}/pagar`, { paymentMethod: 'pix' })).json.status, 'pago');
    // a2: anunciado (ativo); a3: disponível para troca, com proposta pendente da Dora.
    const ativo = await gravar(ana, 'POST', '/anuncios', { ticketId: daAna[1].id, priceCents: 3500 });
    assert.equal(ativo.status, 201);
    // b1: transferido (aceito) para a Dora; b2: convite pendente para a Carla.
    const presente = await gravar(bruno, 'POST', '/transferencias', { ticketId: doBruno[0].id, email: dora.email });
    assert.equal((await gravar(dora, 'POST', `/transferencias/${presente.json.id}/aceitar`)).status, 200);
    const pendente = await gravar(bruno, 'POST', '/transferencias', { ticketId: doBruno[1].id, email: carla.email });
    assert.equal(pendente.status, 201);
    assert.equal((await ana.cliente.req('PUT', `/ingressos/${daAna[2].id}/troca`, { userId: ana.id, available: true })).status, 204);
    const troca = await dora.cliente.req('POST', '/trocas', {
      userId: dora.id, requestedTicketId: daAna[2].id, offeredTicketId: doBruno[0].id,
    });
    assert.equal(troca.status, 201, JSON.stringify(troca.json));
    // Fila de espera: a da Carla (inteira) já reserva o anúncio ativo a2; a da Ella (meia) só espera.
    assert.equal((await gravar(carla, 'POST', '/fila', { eventId: eventoId, type: 'Inteira' })).status, 201);
    assert.equal((await valor('SELECT status FROM anuncio_ingresso WHERE id = ?', [ativo.json.id])).status, 'reserved');
    const reservaFila = await valor("SELECT id FROM pedido WHERE anuncio_id = ? AND usuario_id = ? AND status = 'reservado'", [ativo.json.id, carla.id]);
    assert.ok(reservaFila, 'a fila reservou o anúncio para a Carla');
    const filaElla = await gravar(ella, 'POST', '/fila', { eventId: eventoId, type: 'Meia-entrada', halfDeclaration: true });
    assert.equal(filaElla.status, 201, JSON.stringify(filaElla.json));
    // Reserva em aberto da Dora na venda original.
    const reservaDora = await gravar(dora, 'POST', '/pedidos', { eventId: eventoId, type: 'Inteira', quantity: 1 });
    assert.equal(reservaDora.status, 201);
    // e1: usado na portaria (não é estornado).
    assert.equal((await gravar(org, 'POST', '/portaria/entradas', { eventId: eventoId, code: daElla[0].code })).status, 201);

    assert.equal((await cancelar(contas.outroOrg, eventoId, 'Tentativa de outro organizador')).status, 404);
    assert.equal((await cancelar(ana, eventoId, 'Conta de usuário tentando')).status, 403);
    assert.equal((await cancelar(org, eventoId, 'Oi')).status, 400, 'motivo curto');
    const chave = randomUUID();
    const motivo = 'Chuva forte no local';
    const cancelado = await cancelar(org, eventoId, motivo, chave);
    assert.equal(cancelado.status, 200, JSON.stringify(cancelado.json));
    assert.deepEqual(cancelado.json, {
      eventId: eventoId, status: 'Cancelado', reason: motivo, ticketsCancelled: 5, refunds: 5, refundedAmount: 190,
      reservationsCancelled: 2,
    });
    assert.deepEqual((await cancelar(org, eventoId, motivo, chave)).json, cancelado.json, 'mesma chave, mesma resposta');
    assert.equal((await cancelar(org, eventoId, motivo)).status, 409, 'já cancelado');

    const ev = await valor('SELECT status, motivo_cancelamento, cancelado_por, cancelado_em FROM evento WHERE id = ?', [eventoId]);
    assert.deepEqual([ev.status, ev.motivo_cancelamento, ev.cancelado_por], ['Cancelado', motivo, org.id]);
    assert.ok(ev.cancelado_em);
    const situacoes = Object.fromEntries((await sql.execute('SELECT id, status FROM ingresso WHERE evento_id = ?', [eventoId]))[0].map((i) => [i.id, i.status]));
    for (const t of [...daAna, ...doBruno]) assert.equal(situacoes[t.id], 'C', `ingresso ${t.id}`);
    assert.equal(situacoes[daElla[0].id], 'V', 'o ingresso usado continua utilizado');
    const pedidos = Object.fromEntries((await sql.execute('SELECT id, status FROM pedido WHERE evento_id = ?', [eventoId]))[0].map((p) => [p.id, p.status]));
    assert.deepEqual(
      [pedidos[pedidoAna], pedidos[pedidoBruno], pedidos[pedidoElla], pedidos[pedidoCarla], pedidos[reservaDora.json.id], pedidos[reservaFila.id]],
      ['estornado_parcial', 'estornado', 'pago', 'estornado', 'cancelado', 'cancelado'],
    );
    const estornos = (await sql.execute(
      'SELECT s.pedido_id, s.ingresso_id, s.valor, s.motivo FROM estorno s JOIN pedido p ON p.id = s.pedido_id WHERE p.evento_id = ? ORDER BY s.ingresso_id',
      [eventoId],
    ))[0];
    assert.deepEqual(estornos.map((s) => [s.pedido_id, s.ingresso_id, Number(s.valor)]), [
      [pedidoCarla, daAna[0].id, 30], [pedidoAna, daAna[1].id, 40], [pedidoAna, daAna[2].id, 40],
      [pedidoBruno, doBruno[0].id, 40], [pedidoBruno, doBruno[1].id, 40],
    ]);
    assert.ok(estornos.every((s) => s.motivo === `Cancelamento do evento: ${motivo}`));
    assert.equal((await valor('SELECT status FROM anuncio_ingresso WHERE id = ?', [vendido.json.id])).status, 'sold');
    assert.equal((await valor('SELECT status FROM anuncio_ingresso WHERE id = ?', [ativo.json.id])).status, 'cancelled');
    assert.equal((await valor('SELECT status FROM convite_ingresso WHERE id = ?', [pendente.json.id])).status, 'cancelled');
    assert.equal((await valor('SELECT status FROM convite_ingresso WHERE id = ?', [presente.json.id])).status, 'accepted');
    assert.equal((await valor('SELECT status FROM troca_ingresso WHERE id = ?', [troca.json.id])).status, 'Cancelada');
    const filas = (await sql.execute('SELECT usuario_id, status FROM fila_repasse WHERE evento_id = ? ORDER BY id', [eventoId]))[0];
    assert.deepEqual(filas.map((f) => [f.usuario_id, f.status]), [[carla.id, 'left'], [ella.id, 'left']]);

    // Quem comprou vê o cancelamento e o valor estornado no pedido.
    const vistoAna = (await ler(ana, `/pedidos/${pedidoAna}`)).json;
    assert.deepEqual([vistoAna.eventCancelled, vistoAna.cancelReason, vistoAna.refundedAmount], [true, motivo, 80]);
    const vistoCarla = (await ler(carla, `/pedidos/${pedidoCarla}`)).json;
    assert.deepEqual([vistoCarla.status, vistoCarla.refundedAmount, vistoCarla.eventCancelled], ['estornado', 30, true]);
    // Portaria, vendas e edição fechadas.
    const portaria = await gravar(org, 'POST', '/portaria/entradas', { eventId: eventoId, code: daAna[2].code });
    assert.equal(portaria.status, 409);
    assert.equal((await gravar(bruno, 'POST', '/pedidos', { eventId: eventoId, type: 'Inteira', quantity: 1 })).status, 409);
    const edicao = await org.cliente.req('PUT', `/eventos/${eventoId}`, dadosEvento(org, { status: 'Publicado' }));
    assert.equal(edicao.status, 409);
  });

  it('a administração cancela qualquer evento; "Cancelado" não passa pela criação nem pela edição comum', async () => {
    const { org, admin, ana } = contas;
    const criado = await org.cliente.req('POST', '/eventos', dadosEvento(org, { status: 'Publicado' }));
    assert.equal(criado.status, 201);
    assert.equal((await org.cliente.req('POST', '/eventos', dadosEvento(org, { status: 'Cancelado' }))).status, 409);
    assert.equal((await org.cliente.req('PUT', `/eventos/${criado.json.id}`, dadosEvento(org, { status: 'Cancelado' }))).status, 409);
    assert.equal((await valor('SELECT status FROM evento WHERE id = ?', [criado.json.id])).status, 'Publicado');
    const { pedidoId } = await comprar(ana, criado.json.id, 2);
    const r = await cancelar(admin, criado.json.id, 'Evento suspenso pela administração');
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual([r.json.ticketsCancelled, r.json.refunds, r.json.refundedAmount], [2, 2, 120]);
    assert.equal((await valor('SELECT cancelado_por FROM evento WHERE id = ?', [criado.json.id])).cancelado_por, admin.id);
    assert.equal((await valor('SELECT status FROM pedido WHERE id = ?', [pedidoId])).status, 'estornado');
  });

  it('painel da administração: resumo, eventos e relatório com números do banco', async () => {
    const { admin, org, ana, bruno } = contas;
    const eventoId = await evento({ preco: 40, capacidade: 50 });
    await comprar(ana, eventoId, 2);
    const { tickets } = await comprar(bruno, eventoId, 1);
    assert.equal((await gravar(org, 'POST', '/portaria/entradas', { eventId: eventoId, code: tickets[0].code })).status, 201);

    const resumo = (await ler(admin, '/admin/resumo')).json;
    const conta = await valor(
      `SELECT (SELECT COUNT(*) FROM usuario WHERE status_aprovacao = 'P') AS p,
              (SELECT COUNT(*) FROM usuario WHERE status_aprovacao = 'R') AS r,
              (SELECT COUNT(*) FROM evento WHERE status = 'Cancelado') AS c,
              (SELECT COUNT(*) FROM ingresso WHERE status = 'A') AS a`,
    );
    assert.deepEqual(
      [resumo.pendingAccounts, resumo.rejectedAccounts, resumo.cancelledEvents, resumo.activeTickets],
      [Number(conta.p), Number(conta.r), Number(conta.c), Number(conta.a)],
    );
    assert.ok(resumo.publishedEvents >= 1);

    const lista = (await ler(admin, '/admin/eventos')).json;
    const doEvento = lista.find((e) => e.id === eventoId);
    assert.deepEqual(doEvento.tickets, { active: 2, used: 1, cancelled: 0, sold: 3 });
    assert.deepEqual([doEvento.occupancy, doEvento.grossRevenue, doEvento.organizer], [6, 120, 'Empresa Olga']);
    const cancelados = lista.filter((e) => e.status === 'Cancelado');
    assert.ok(cancelados.length >= 2 && cancelados.every((e) => e.cancelReason));

    const relatorio = (await ler(admin, `/admin/eventos/${eventoId}`)).json;
    assert.deepEqual(relatorio.byType, [{ type: 'Inteira', total: 3, active: 2, used: 1, cancelled: 0 }]);
    assert.deepEqual(relatorio.orders.map((p) => [p.buyer, p.quantity, p.total, p.status]), [
      ['bruno Teste', 1, 40, 'pago'], ['ana Teste', 2, 80, 'pago'],
    ]);
    assert.equal((await ler(admin, '/admin/eventos/abc')).status, 400);
    assert.equal((await ler(admin, '/admin/eventos/99999999')).status, 404);
  });

  it('atendimento: a administração vê todos e responde como administração', async () => {
    const { admin, org, outroOrg, carla } = contas;
    const eventoId = await evento();
    const { pedidoId } = await comprar(carla, eventoId);
    const aberto = await gravar(carla, 'POST', '/atendimentos', { orderId: pedidoId, subject: 'Ajuda da administração', message: 'O evento mudou de local?' });
    assert.equal(aberto.status, 201);
    const id = aberto.json.id;
    const daAdministracao = (await ler(admin, '/atendimentos')).json.find((a) => a.id === id);
    assert.ok(daAdministracao, 'a administração vê atendimentos de qualquer evento');
    assert.equal(daAdministracao.canChangeStatus, true);
    const resposta = await gravar(admin, 'POST', `/atendimentos/${id}/mensagens`, { message: 'Verificamos com a organização.', status: 'em_analise' });
    assert.equal(resposta.status, 200, JSON.stringify(resposta.json));
    assert.deepEqual(resposta.json.messages.map((m) => m.author), ['solicitante', 'administracao']);
    assert.equal(resposta.json.status, 'em_analise');
    assert.ok((await ler(org, '/atendimentos')).json.some((a) => a.id === id));
    assert.equal((await ler(outroOrg, '/atendimentos')).json.some((a) => a.id === id), false);
    const daCarla = (await ler(carla, '/atendimentos')).json.find((a) => a.id === id);
    assert.deepEqual(daCarla.messages.map((m) => m.author), ['solicitante', 'administracao']);
  });

  it('script criar-admin: valida os dados, recusa e-mail repetido e guarda só o hash da senha', async () => {
    const valido = { nome: 'Admin Teste', email: 'admin@example.test', senha: 'senha-forte-123' };
    for (const errado of [{ nome: 'Ad' }, { email: 'sem-arroba' }, { senha: 'curta1' }, { senha: 'somente-letras' }, { senha: '12345678901' }]) {
      assert.throws(() => validarDadosAdmin({ ...valido, ...errado }), ErroAdmin, JSON.stringify(errado));
    }
    const config = { ...configMysql(), database: banco.nome };
    await assert.rejects(criarAdministrador(config, { ...valido, email: contas.ana.email }), /Já existe uma conta/);
    const senha = `Adm-${randomUUID()}`;
    const email = `Maiusculo.${randomUUID()}@Example.TEST`;
    const conta = await criarAdministrador(config, { nome: '  Carlos Admin  ', email, senha });
    const linha = await valor('SELECT nome, email, senha_hash, tipo_perfil, status_aprovacao FROM usuario WHERE id = ?', [conta.id]);
    assert.deepEqual([linha.nome, linha.email, linha.tipo_perfil, linha.status_aprovacao], ['Carlos Admin', email.toLowerCase(), 4, 'A']);
    assert.match(linha.senha_hash, /^\$2[aby]\$10\$/);
    assert.equal(linha.senha_hash.includes(senha), false);
    assert.equal((await valor('SELECT COUNT(*) AS n FROM administrador_detalhes WHERE usuario_id = ?', [conta.id])).n, 1);
    assert.equal((await valor("SELECT COUNT(*) AS n FROM aprovacao_conta WHERE usuario_id = ? AND situacao = 'A'", [conta.id])).n, 1);
    const login = await new Cliente(api.url).entrar(email.toLowerCase(), senha);
    assert.deepEqual([login.status, login.json.user.role, login.json.user.aprovacao], [200, 'admin', 'A']);
  });
});
