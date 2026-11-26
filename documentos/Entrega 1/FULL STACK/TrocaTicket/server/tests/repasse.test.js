// Todas as operações usam os clientes da API e o banco temporário criado pelo runner.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Cliente, SEM_MYSQL, configMysql, conectar, criarBancoTemporario, iniciarApi } = require('./apoio');

describe('revenda, fila de espera e transferência com aceite', { skip: !configMysql() && SEM_MYSQL }, () => {
  let banco;
  let api;
  let sql;
  let vendedor;
  let primeiro;
  let segundo;

  async function cadastrar(nome) {
    const cliente = new Cliente(api.url);
    const email = nome + '.' + randomUUID() + '@example.test';
    const r = await cliente.cadastrar({ nome, email, senha: randomUUID(), tipo_perfil: 1 });
    assert.equal(r.status, 201);
    return { cliente, email, id: r.json.usuarioId };
  }

  function gravar(conta, metodo, caminho, corpo = {}, chave = randomUUID()) {
    return conta.cliente.req(metodo, caminho, corpo, { cabecalhos: { 'Idempotency-Key': chave } });
  }

  async function ingresso() {
    const [evento] = await sql.execute(
      `INSERT INTO evento (organizador_id, titulo, categoria, formato, data_inicio, data_fim,
        horario_inicio, horario_termino, local, capacidade, preco_base, status)
       VALUES (?, 'Show de teste', 'Música', 'Presencial', CURRENT_DATE + INTERVAL 7 DAY,
        CURRENT_DATE + INTERVAL 7 DAY, '15:00','18:00','Auditório',1,50,'Publicado')`, [vendedor.id],
    );
    const eventId = evento.insertId;
    const reserva = await gravar(vendedor, 'POST', '/pedidos', { eventId, type: 'Inteira', quantity: 1 });
    assert.equal(reserva.status, 201);
    const pagamento = await gravar(vendedor, 'POST', '/pedidos/' + reserva.json.id + '/pagar', { paymentMethod: 'pix' });
    assert.equal(pagamento.json.status, 'pago');
    return { ticketId: pagamento.json.tickets[0].id, eventId };
  }

  async function dono(ticketId) {
    const [[t]] = await sql.execute('SELECT dono_atual_id FROM ingresso WHERE id = ?', [ticketId]);
    return t.dono_atual_id;
  }

  async function anunciar(ticketId) {
    const r = await gravar(vendedor, 'POST', '/anuncios', { ticketId, priceCents: 5000 });
    assert.equal(r.status, 201);
    return r.json.id;
  }

  before(async () => {
    banco = await criarBancoTemporario();
    api = await iniciarApi(banco.nome);
    sql = await conectar({ database: banco.nome });
    vendedor = await cadastrar('Vendedor Teste');
    primeiro = await cadastrar('Primeiro Teste');
    segundo = await cadastrar('Segundo Teste');
  });

  after(async () => {
    await sql?.end();
    await api?.fechar();
    await banco?.apagar();
  });

  it('paga a revenda uma única vez e transfere o ingresso ao comprador', async () => {
    const { ticketId } = await ingresso();
    const chave = randomUUID();
    const corpo = { ticketId, priceCents: 5000 };
    const venda = await gravar(vendedor, 'POST', '/anuncios', corpo, chave);
    assert.equal(venda.status, 201);
    const repetida = await gravar(vendedor, 'POST', '/anuncios', corpo, chave);
    assert.equal(repetida.json.id, venda.json.id);
    const catalogo = await primeiro.cliente.req('GET', '/anuncios');
    assert.equal(catalogo.status, 200);
    const anuncio = catalogo.json.find((a) => a.id === venda.json.id);
    assert.equal(anuncio.priceCents, 5000);
    assert.equal(anuncio.status, 'active');
    const reserva = await gravar(primeiro, 'POST', '/anuncios/' + venda.json.id + '/reservar');
    assert.equal(reserva.status, 201);
    assert.equal(await dono(ticketId), vendedor.id);
    const disputada = await gravar(segundo, 'POST', '/anuncios/' + venda.json.id + '/reservar');
    assert.equal(disputada.status, 409);
    const pagamento = await gravar(primeiro, 'POST', '/pedidos/' + reserva.json.id + '/pagar', { paymentMethod: 'pix' });
    assert.equal(pagamento.json.status, 'pago');
    assert.equal(await dono(ticketId), primeiro.id);
  });

  it('o segundo da fila recebe o anúncio após expirar a reserva do primeiro', async () => {
    const { ticketId, eventId } = await ingresso();
    const fila = { eventId, type: 'Inteira' };
    const entrada = await gravar(primeiro, 'POST', '/fila', fila);
    assert.equal(entrada.status, 201);
    assert.equal((await gravar(primeiro, 'POST', '/fila', fila)).status, 409);
    const segundaEntrada = await gravar(segundo, 'POST', '/fila', fila);
    assert.equal(segundaEntrada.status, 201);
    const filas = await Promise.all([primeiro, segundo].map((conta) => conta.cliente.req('GET', '/fila')));
    assert.deepEqual(filas.map((r) => r.json.find((q) => q.eventId === eventId).position), [1, 2]);
    await anunciar(ticketId);
    const buscarReserva = async (conta) => {
      const r = await conta.cliente.req('GET', '/pedidos');
      assert.equal(r.status, 200);
      return r.json.find((p) => p.eventId === eventId && p.status === 'reservado');
    };
    const primeira = await buscarReserva(primeiro);
    assert.ok(primeira, 'primeiro da fila possui a reserva');
    assert.equal(await buscarReserva(segundo), undefined);
    await sql.execute('UPDATE pedido SET expira_em = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = ?', [primeira.id]);
    await primeiro.cliente.req('GET', '/fila');
    const proxima = await buscarReserva(segundo);
    assert.ok(proxima, 'segundo da fila possui a nova reserva');
    assert.notEqual(proxima.id, primeira.id);
    assert.equal(await dono(ticketId), vendedor.id);
  });

  it('anúncio pode ser retirado antes da reserva e a conta pode deixar a fila', async () => {
    const { ticketId, eventId } = await ingresso();
    const anuncio = await anunciar(ticketId);
    const encerrado = await gravar(vendedor, 'DELETE', '/anuncios/' + anuncio);
    assert.ok([200, 204].includes(encerrado.status));
    const indisponivel = await gravar(primeiro, 'POST', '/anuncios/' + anuncio + '/reservar');
    assert.ok([404,409].includes(indisponivel.status));
    const fila = await gravar(primeiro, 'POST', '/fila', { eventId, type: 'Inteira' });
    assert.equal(fila.status, 201);
    const saida = await gravar(primeiro, 'DELETE', '/fila/' + fila.json.id);
    assert.ok([200,204].includes(saida.status));
    assert.equal(await dono(ticketId), vendedor.id);
  });

  it('transferência só muda o dono no aceite do destinatário', async () => {
    const { ticketId } = await ingresso();
    const convite = await gravar(vendedor, 'POST', '/transferencias', { ticketId, email: primeiro.email });
    assert.equal(convite.status, 201);
    const acao = '/transferencias/' + convite.json.id + '/aceitar';
    assert.equal(await dono(ticketId), vendedor.id);
    const foraDaConta = await gravar(segundo, 'POST', acao);
    assert.ok([403,404].includes(foraDaConta.status));
    assert.equal(await dono(ticketId), vendedor.id);
    const chave = randomUUID();
    const aceito = await gravar(primeiro, 'POST', acao, {}, chave);
    assert.equal(aceito.status, 200);
    assert.equal((await gravar(primeiro, 'POST', acao, {}, chave)).status, 200);
    assert.equal(await dono(ticketId), primeiro.id);
  });

  it('um convite vencido libera o ingresso sem trocar o dono', async () => {
    const { ticketId } = await ingresso();
    const convite = await gravar(vendedor, 'POST', '/transferencias', { ticketId, email: primeiro.email });
    assert.equal(convite.status, 201);
    await sql.execute('UPDATE convite_ingresso SET expira_em = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id = ?', [convite.json.id]);
    const aceite = await gravar(primeiro, 'POST', '/transferencias/' + convite.json.id + '/aceitar');
    assert.equal(aceite.status, 409);
    assert.equal(await dono(ticketId), vendedor.id);
    assert.ok(await anunciar(ticketId));
  });

  it('recusar e cancelar transferências mantém o ingresso com o remetente', async () => {
    const { ticketId } = await ingresso();
    for (const [acao, conta] of [['recusar', primeiro], ['cancelar', vendedor]]) {
      const convite = await gravar(vendedor, 'POST', '/transferencias', { ticketId, email: primeiro.email });
      assert.equal(convite.status, 201);
      const r = await gravar(conta, 'POST', '/transferencias/' + convite.json.id + '/' + acao);
      assert.equal(r.status, 200);
      assert.equal(await dono(ticketId), vendedor.id);
    }
  });
});
