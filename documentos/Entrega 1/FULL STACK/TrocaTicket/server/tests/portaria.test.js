// Portaria e atendimento (etapa 5) num banco temporário criado pelo runner (ver tests/apoio.js).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Cliente, SEM_MYSQL, configMysql, conectar, criarBancoTemporario, iniciarApi } = require('./apoio');

describe('portaria e atendimento (banco temporário)', { skip: !configMysql() && SEM_MYSQL }, () => {
  let banco;
  let api;
  let sql;
  const contas = {};

  async function cadastrar(nome, tipo = 1) {
    const cliente = new Cliente(api.url);
    const email = `${nome}.${randomUUID()}@example.test`;
    const dados = { nome: `${nome} Teste`, email, senha: randomUUID(), tipo_perfil: tipo };
    if (tipo === 2) {
      // CNPJ fictício diferente para cada organizador (o documento é único por conta).
      const documento = String(Date.now() * 10 + Math.floor(Math.random() * 10)).slice(-14).padStart(14, '1');
      Object.assign(dados, { documento, nome_organizacao: `Produtora ${nome}` });
    }
    const r = await cliente.cadastrar(dados);
    assert.equal(r.status, 201);
    return { cliente, email, id: r.json.usuarioId };
  }

  const gravar = (conta, metodo, caminho, corpo = {}, chave = randomUUID()) =>
    conta.cliente.req(metodo, caminho, corpo, { cabecalhos: { 'Idempotency-Key': chave } });

  async function evento({ organizador = contas.org, status = 'Publicado', inicio = 7, fim = 7 } = {}) {
    const [r] = await sql.execute(
      `INSERT INTO evento (organizador_id, titulo, categoria, formato, data_inicio, data_fim,
        horario_inicio, horario_termino, local, capacidade, preco_base, status)
       VALUES (?, 'Show da portaria', 'Música', 'Presencial', CURRENT_DATE + INTERVAL ? DAY,
        CURRENT_DATE + INTERVAL ? DAY, '15:00', '18:00', 'Arena', 50, 40, ?)`,
      [organizador.id, inicio, fim, status],
    );
    return r.insertId;
  }

  async function comprar(conta, eventId, quantity = 1) {
    const reserva = await gravar(conta, 'POST', '/pedidos', { eventId, type: 'Inteira', quantity });
    assert.equal(reserva.status, 201, JSON.stringify(reserva.json));
    const pago = await gravar(conta, 'POST', `/pedidos/${reserva.json.id}/pagar`, { paymentMethod: 'pix' });
    assert.equal(pago.json.status, 'pago');
    return { pedidoId: reserva.json.id, tickets: pago.json.tickets };
  }

  const validar = (conta, eventId, code, chave) => gravar(conta, 'POST', '/portaria/entradas', { eventId, code }, chave);

  async function situacao(ticketId) {
    const [[linha]] = await sql.execute('SELECT status, codigo_ingresso, disponivel_troca FROM ingresso WHERE id = ?', [ticketId]);
    return linha;
  }

  before(async () => {
    process.env.PAGAMENTO_SIMULADO = 'aprovado';
    banco = await criarBancoTemporario();
    api = await iniciarApi(banco.nome);
    sql = await conectar({ database: banco.nome });
    contas.org = await cadastrar('Olga', 2);
    contas.outroOrg = await cadastrar('Otto', 2);
    for (const nome of ['ana', 'bruno', 'carla']) contas[nome] = await cadastrar(nome);
  });

  after(async () => {
    delete process.env.PAGAMENTO_SIMULADO;
    await sql?.end();
    await api?.fechar();
    await banco?.apagar();
  });

  it('o organizador valida o código uma vez só; repetir a mesma leitura devolve o mesmo resultado', async () => {
    const eventId = await evento();
    const { tickets } = await comprar(contas.ana, eventId);
    const chave = randomUUID();
    const entrada = await validar(contas.org, eventId, tickets[0].code.toLowerCase(), chave);
    assert.equal(entrada.status, 201, JSON.stringify(entrada.json));
    assert.equal(entrada.json.accepted, true);
    assert.equal(entrada.json.holderName, 'ana');
    assert.equal((await situacao(tickets[0].id)).status, 'V');
    const repetida = await validar(contas.org, eventId, tickets[0].code.toLowerCase(), chave);
    assert.equal(repetida.status, 201, 'mesma leitura (clique duplo) devolve o mesmo resultado');
    const segunda = await validar(contas.org, eventId, tickets[0].code);
    assert.equal(segunda.status, 409);
    assert.match(segunda.json.error, /já foi utilizado/);
    const lista = (await contas.ana.cliente.req('GET', `/usuarios/${contas.ana.id}/ingressos`)).json;
    const usado = lista.find((t) => t.id === tickets[0].id);
    assert.equal(usado.status, 'Utilizado');
    assert.match(usado.usedAt, /^\d{4}-\d{2}-\d{2}T/);
    const resumo = (await contas.org.cliente.req('GET', `/portaria/eventos/${eventId}`)).json;
    assert.equal(resumo.entered, 1);
    assert.equal(resumo.lastEntries[0].ticketId, tickets[0].id);
    const eventos = (await contas.org.cliente.req('GET', '/portaria/eventos')).json;
    assert.equal(eventos.find((e) => e.id === eventId).entered, 1);
  });

  it('duas leituras simultâneas do mesmo código: só uma entra', async () => {
    const eventId = await evento();
    const { tickets } = await comprar(contas.bruno, eventId);
    const respostas = await Promise.all([validar(contas.org, eventId, tickets[0].code), validar(contas.org, eventId, tickets[0].code)]);
    assert.deepEqual(respostas.map((r) => r.status).sort(), [201, 409]);
    const [[{ n }]] = await sql.execute('SELECT COUNT(*) AS n FROM entrada_portaria WHERE ingresso_id = ?', [tickets[0].id]);
    assert.equal(Number(n), 1);
  });

  it('só o organizador do evento usa a portaria, e só com evento publicado e vigente', async () => {
    const eventId = await evento();
    const { tickets } = await comprar(contas.carla, eventId);
    assert.equal((await validar(contas.outroOrg, eventId, tickets[0].code)).status, 404);
    assert.equal((await validar(contas.carla, eventId, tickets[0].code)).status, 403);
    assert.equal((await new Cliente(api.url).req('GET', '/portaria/eventos')).status, 401);
    assert.equal((await contas.ana.cliente.req('GET', '/portaria/eventos')).status, 403);
    assert.equal((await validar(contas.org, eventId, 'TT-1-NAOEXISTE')).status, 404);
    assert.equal((await validar(contas.org, eventId, 'x')).status, 400);
    const outro = await evento();
    assert.equal((await validar(contas.org, outro, tickets[0].code)).status, 409, 'código de outro evento');
    await sql.execute("UPDATE evento SET status = 'Rascunho' WHERE id = ?", [eventId]);
    assert.equal((await validar(contas.org, eventId, tickets[0].code)).status, 409);
    await sql.execute("UPDATE evento SET status = 'Publicado', data_inicio = CURRENT_DATE - INTERVAL 3 DAY, data_fim = CURRENT_DATE - INTERVAL 1 DAY WHERE id = ?", [eventId]);
    assert.equal((await validar(contas.org, eventId, tickets[0].code)).status, 409, 'evento encerrado');
    assert.equal((await situacao(tickets[0].id)).status, 'A');
  });

  it('na entrada, anúncio ativo é encerrado e trocas pendentes são canceladas; reserva e convite bloqueiam', async () => {
    const eventId = await evento();
    const { tickets } = await comprar(contas.ana, eventId, 3);
    const [anunciado, reservado, convidado] = tickets;
    const anuncio = await gravar(contas.ana, 'POST', '/anuncios', { ticketId: anunciado.id, priceCents: 3000 });
    assert.equal(anuncio.status, 201);
    assert.equal((await validar(contas.org, eventId, anunciado.code)).status, 201);
    const [[{ status: situacaoAnuncio }]] = await sql.execute('SELECT status FROM anuncio_ingresso WHERE id = ?', [anuncio.json.id]);
    assert.equal(situacaoAnuncio, 'cancelled');
    const anuncio2 = await gravar(contas.ana, 'POST', '/anuncios', { ticketId: reservado.id, priceCents: 3000 });
    assert.equal((await gravar(contas.bruno, 'POST', `/anuncios/${anuncio2.json.id}/reservar`)).status, 201);
    assert.equal((await validar(contas.org, eventId, reservado.code)).status, 409, 'reservado para revenda');
    const convite = await gravar(contas.ana, 'POST', '/transferencias', { ticketId: convidado.id, email: contas.carla.email });
    assert.equal(convite.status, 201);
    assert.equal((await validar(contas.org, eventId, convidado.code)).status, 409, 'convite pendente');
    // Oferta de troca pendente é cancelada quando o ingresso entra.
    const { tickets: daCarla } = await comprar(contas.carla, eventId);
    await gravar(contas.ana, 'POST', `/transferencias/${convite.json.id}/cancelar`);
    const userId = contas.ana.id;
    assert.equal((await contas.ana.cliente.req('PUT', `/ingressos/${convidado.id}/troca`, { userId, available: true })).status, 204);
    const proposta = await contas.carla.cliente.req('POST', '/trocas', {
      userId: contas.carla.id,
      requestedTicketId: convidado.id,
      offeredTicketId: daCarla[0].id,
    });
    assert.equal(proposta.status, 201);
    assert.equal((await validar(contas.org, eventId, convidado.code)).status, 201);
    const [[troca]] = await sql.execute('SELECT status FROM troca_ingresso WHERE id = ?', [proposta.json.id]);
    assert.equal(troca.status, 'Cancelada');
    assert.equal(Number((await situacao(convidado.id)).disponivel_troca), 0);
  });

  it('o código antigo não entra depois de revenda, transferência ou troca', async () => {
    const eventId = await evento();
    const { tickets: daAna } = await comprar(contas.ana, eventId, 2);
    const { tickets: doBruno } = await comprar(contas.bruno, eventId);
    // Revenda
    const anuncio = await gravar(contas.ana, 'POST', '/anuncios', { ticketId: daAna[0].id, priceCents: 4000 });
    const reserva = await gravar(contas.carla, 'POST', `/anuncios/${anuncio.json.id}/reservar`);
    await gravar(contas.carla, 'POST', `/pedidos/${reserva.json.id}/pagar`, { paymentMethod: 'pix' });
    assert.equal((await validar(contas.org, eventId, daAna[0].code)).status, 404);
    // Troca: os dois códigos mudam
    const userId = contas.ana.id;
    await contas.ana.cliente.req('PUT', `/ingressos/${daAna[1].id}/troca`, { userId, available: true });
    const proposta = await contas.bruno.cliente.req('POST', '/trocas', {
      userId: contas.bruno.id,
      requestedTicketId: daAna[1].id,
      offeredTicketId: doBruno[0].id,
    });
    const aceite = await contas.ana.cliente.req('PUT', `/trocas/${proposta.json.id}`, { userId, action: 'aceitar' });
    assert.equal(aceite.status, 200);
    for (const antigo of [daAna[1], doBruno[0]]) {
      const atual = await situacao(antigo.id);
      assert.notEqual(atual.codigo_ingresso, antigo.code);
      assert.match(atual.codigo_ingresso, new RegExp(`^TT-${eventId}-[0-9A-F]{16}$`));
      assert.equal((await validar(contas.org, eventId, antigo.code)).status, 404);
    }
    // Transferência
    const { tickets: daCarla } = await comprar(contas.carla, eventId);
    const convite = await gravar(contas.carla, 'POST', '/transferencias', { ticketId: daCarla[0].id, email: contas.ana.email });
    assert.equal((await gravar(contas.ana, 'POST', `/transferencias/${convite.json.id}/aceitar`)).status, 200);
    assert.equal((await validar(contas.org, eventId, daCarla[0].code)).status, 404);
    const novo = await situacao(daCarla[0].id);
    assert.equal((await validar(contas.org, eventId, novo.codigo_ingresso)).status, 201);
  });

  it('ingresso utilizado não é revendido, transferido, cancelado nem estornado', async () => {
    const eventId = await evento();
    const { pedidoId, tickets } = await comprar(contas.bruno, eventId);
    assert.equal((await validar(contas.org, eventId, tickets[0].code)).status, 201);
    assert.equal((await gravar(contas.bruno, 'POST', '/anuncios', { ticketId: tickets[0].id, priceCents: 1000 })).status, 409);
    assert.equal((await gravar(contas.bruno, 'POST', '/transferencias', { ticketId: tickets[0].id, email: contas.ana.email })).status, 409);
    const cancelar = await contas.bruno.cliente.req('PUT', `/ingressos/${tickets[0].id}/cancelar`, { userId: contas.bruno.id });
    assert.equal(cancelar.status, 409);
    assert.equal((await gravar(contas.bruno, 'POST', `/pedidos/${pedidoId}/estornar`)).status, 409);
  });

  it('atendimento: pedido da própria conta, denúncia de anúncio e validações', async () => {
    const eventId = await evento();
    const { pedidoId, tickets } = await comprar(contas.ana, eventId);
    const abrir = (conta, corpo, chave) => gravar(conta, 'POST', '/atendimentos', corpo, chave);
    const chave = randomUUID();
    const corpo = { orderId: pedidoId, subject: 'Dúvida sobre o pedido', message: 'Posso levar acompanhante?' };
    const aberto = await abrir(contas.ana, corpo, chave);
    assert.equal(aberto.status, 201, JSON.stringify(aberto.json));
    assert.equal(aberto.json.status, 'aberto');
    assert.equal(aberto.json.messages[0].author, 'solicitante');
    assert.equal((await abrir(contas.ana, corpo, chave)).json.id, aberto.json.id, 'mesma chave, mesmo atendimento');
    assert.equal((await abrir(contas.bruno, corpo)).status, 404, 'pedido de outra conta');
    assert.equal((await abrir(contas.ana, { ...corpo, listingId: 1 })).status, 400, 'pedido e anúncio juntos');
    assert.equal((await abrir(contas.ana, { subject: 'Sem vínculo', message: 'Mensagem' })).status, 400);
    assert.equal((await abrir(contas.ana, { ...corpo, subject: 'Oi' })).status, 400, 'assunto curto');
    assert.equal((await abrir(contas.org, corpo)).status, 403, 'organizador não abre atendimento');
    // Denúncia de anúncio ativo de outra conta; anúncio retirado não pode ser referenciado por terceiros.
    const anuncio = await gravar(contas.ana, 'POST', '/anuncios', { ticketId: tickets[0].id, priceCents: 3500 });
    const denuncia = await abrir(contas.bruno, { listingId: anuncio.json.id, subject: 'Anúncio suspeito', message: 'Preço estranho.' });
    assert.equal(denuncia.status, 201);
    assert.equal(denuncia.json.listingId, anuncio.json.id);
    await gravar(contas.ana, 'DELETE', `/anuncios/${anuncio.json.id}`);
    assert.equal((await abrir(contas.carla, { listingId: anuncio.json.id, subject: 'Outro', message: 'Teste.' })).status, 404);
  });

  it('atendimento: a organização do evento responde e muda a situação; a conta acompanha', async () => {
    const eventId = await evento();
    const { pedidoId } = await comprar(contas.carla, eventId);
    const aberto = await gravar(contas.carla, 'POST', '/atendimentos', {
      orderId: pedidoId,
      subject: 'Preciso de ajuda',
      message: 'Não recebi o e-mail.',
    });
    const id = aberto.json.id;
    const doOrganizador = (await contas.org.cliente.req('GET', '/atendimentos')).json.find((a) => a.id === id);
    assert.ok(doOrganizador, 'o organizador do evento vê o atendimento');
    assert.equal(doOrganizador.requesterName, 'carla Teste');
    assert.equal(doOrganizador.canChangeStatus, true);
    assert.equal((await contas.outroOrg.cliente.req('GET', '/atendimentos')).json.some((a) => a.id === id), false);
    assert.equal((await contas.ana.cliente.req('GET', '/atendimentos')).json.some((a) => a.id === id), false);
    const resposta = (conta, corpo) => gravar(conta, 'POST', `/atendimentos/${id}/mensagens`, corpo);
    assert.equal((await resposta(contas.outroOrg, { message: 'Oi' })).status, 404);
    assert.equal((await resposta(contas.carla, { message: 'Alguma novidade?', status: 'encerrado' })).status, 403);
    const analise = await resposta(contas.org, { message: 'Estamos verificando.', status: 'em_analise' });
    assert.equal(analise.status, 200);
    assert.equal(analise.json.status, 'em_analise');
    const daCarla = (await contas.carla.cliente.req('GET', '/atendimentos')).json.find((a) => a.id === id);
    assert.deepEqual(daCarla.messages.map((m) => m.author), ['solicitante', 'organizacao']);
    assert.equal(daCarla.messages[1].authorName, 'Olga');
    assert.equal(daCarla.canChangeStatus, false);
    assert.equal((await resposta(contas.carla, { message: 'Obrigada!' })).status, 200);
    assert.equal((await resposta(contas.org, { message: 'Resolvido.', status: 'encerrado' })).json.status, 'encerrado');
    assert.equal((await resposta(contas.carla, { message: 'Mais uma coisa' })).status, 409);
    assert.equal((await resposta(contas.org, { message: 'Reabrindo.', status: 'aberto' })).json.status, 'aberto');
    assert.equal((await resposta(contas.org, { message: 'x'.repeat(2001) })).status, 400);
    assert.equal((await resposta(contas.org, { message: 'Situação errada', status: 'pendente' })).status, 400);
  });

  it('atendimento: no máximo 10 em aberto por conta', async () => {
    const eventId = await evento();
    const { pedidoId } = await comprar(contas.bruno, eventId);
    const [[{ abertos }]] = await sql.execute(
      "SELECT COUNT(*) AS abertos FROM atendimento WHERE usuario_id = ? AND status <> 'encerrado'",
      [contas.bruno.id],
    );
    for (let n = Number(abertos); n < 10; n += 1) {
      const r = await gravar(contas.bruno, 'POST', '/atendimentos', { orderId: pedidoId, subject: `Assunto ${n}`, message: 'Mensagem de teste.' });
      assert.equal(r.status, 201);
    }
    const excedente = await gravar(contas.bruno, 'POST', '/atendimentos', { orderId: pedidoId, subject: 'Mais um', message: 'Mensagem.' });
    assert.equal(excedente.status, 429);
  });
});
