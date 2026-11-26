// Testes de integração da API com sessão, num banco temporário (ver tests/apoio.js).
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Cliente, SEM_MYSQL, aprovarConta, conectar, configMysql, criarBancoTemporario, iniciarApi } = require('./apoio');

const resumo = (valor) => crypto.createHash('sha256').update(valor).digest('hex');
const senhaAleatoria = () => `Teste-${crypto.randomBytes(9).toString('base64url')}`;
const dataFutura = (dias) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);

describe('API com sessão (banco temporário)', { skip: !configMysql() && SEM_MYSQL }, () => {
  let banco;
  let api;
  let sql;
  const contas = {};
  const clientes = {};

  before(async () => {
    banco = await criarBancoTemporario();
    api = await iniciarApi(banco.nome);
    sql = await conectar({ database: banco.nome });
    const pessoas = {
      ana: { nome: 'Ana Teste', tipo_perfil: 1 },
      bruno: { nome: 'Bruno Teste', tipo_perfil: 1 },
      org: { nome: 'Org Teste', tipo_perfil: 2, documento: '12345678000199', nome_organizacao: 'Produtora Teste' },
      forn: { nome: 'Fornecedor Teste', tipo_perfil: 3, documento: '98765432000155', nome_organizacao: 'Som e Luz Teste' },
    };
    for (const [chave, dados] of Object.entries(pessoas)) {
      const conta = { ...dados, email: `${chave}.${Date.now()}@example.test`, senha: senhaAleatoria() };
      const cliente = new Cliente(api.url);
      const resposta = await cliente.cadastrar(conta);
      assert.equal(resposta.status, 201, `cadastro de ${chave}`);
      contas[chave] = { ...conta, id: resposta.json.usuarioId };
      clientes[chave] = cliente;
    }
    for (const chave of ['org', 'forn']) await aprovarConta(sql, contas[chave].id);
    for (const [titulo, dias] of [['Festival Teste de Verão', 20], ['Show Teste Acústico', 45]]) {
      const resposta = await clientes.org.req('POST', '/eventos', {
        organizadorId: contas.org.id, title: titulo, category: 'Música', date: dataFutura(dias),
        endDate: dataFutura(dias), time: '18:00', endTime: '22:00', location: 'São Paulo, SP',
        capacity: 100, price: 80, status: 'Publicado', description: 'Evento fictício.', image: '/images/coldplay.jpg',
      });
      assert.equal(resposta.status, 201, `evento ${titulo}`);
    }
  });

  after(async () => {
    await sql?.end();
    await api?.fechar();
    await banco?.apagar();
  });

  it('cadastro já abre a sessão e /api/sessao reconhece a conta', async () => {
    const r = await clientes.ana.req('GET', '/sessao');
    assert.equal(r.json.user.id, contas.ana.id);
    assert.match(r.json.csrfToken, /^[a-f0-9]{64}$/);
    assert.equal((await new Cliente(api.url).req('GET', '/sessao')).json.user, null);
  });

  it('login mantém o formato da resposta e cria cookie httpOnly, SameSite=Lax e Path=/api', async () => {
    const ana = new Cliente(api.url);
    const r = await ana.entrar(contas.ana.email, contas.ana.senha);
    assert.equal(r.status, 200);
    // Etapa 6: o login também informa a situação da conta na aprovação (A, P ou R).
    assert.deepEqual(Object.keys(r.json.user).sort(), ['aprovacao', 'email', 'foto', 'id', 'nome', 'role', 'tipo_perfil']);
    assert.equal(r.json.user.role, 'comprador');
    assert.equal(r.json.user.aprovacao, 'A', 'conta de usuário já nasce aprovada');
    assert.match(ana.setCookie, /HttpOnly/i);
    assert.match(ana.setCookie, /SameSite=Lax/i);
    assert.match(ana.setCookie, /Path=\/api/i);
    const [[guardado]] = await sql.query('SELECT COUNT(*) AS n FROM sessao WHERE id_hash = ?', [resumo(ana.codigoDoCookie())]);
    const [[bruto]] = await sql.query('SELECT COUNT(*) AS n FROM sessao WHERE id_hash = ? OR csrf_token = ?', [ana.codigoDoCookie(), ana.codigoDoCookie()]);
    assert.equal(Number(guardado.n), 1, 'o banco guarda o resumo do cookie');
    assert.equal(Number(bruto.n), 0, 'o banco não guarda o código do cookie');
  });

  it('cada conta acessa os próprios dados', async () => {
    const id = contas.ana.id;
    for (const caminho of [`/usuarios/${id}`, `/usuarios/${id}/favoritos`, `/usuarios/${id}/ingressos`,
      `/usuarios/${id}/trocas`, `/trocas/ingressos?usuarioId=${id}`, `/comunidade/mensagens?usuarioId=${id}`]) {
      assert.equal((await clientes.ana.req('GET', caminho)).status, 200, caminho);
    }
  });

  it('ninguém usa outra conta trocando o ID (403) e o banco não muda', async () => {
    const { ana, forn } = clientes;
    const outro = contas.bruno.id;
    const tentativas = [
      ['GET', `/usuarios/${outro}`],
      ['PUT', `/usuarios/${outro}`, { nome: 'Invasor', email: 'invasor@example.test' }],
      ['GET', `/usuarios/${outro}/favoritos`],
      ['POST', `/usuarios/${outro}/favoritos/1`],
      ['GET', `/usuarios/${outro}/ingressos`],
      ['POST', '/comunidade/mensagens', { userId: outro, text: 'mensagem falsa' }],
      ['PUT', `/usuarios/${outro}/senha`, { senhaAtual: 'qualquer', novaSenha: 'OutraSenha123' }],
      ['DELETE', `/usuarios/${outro}/foto`],
      ['GET', `/eventos?organizadorId=${contas.org.id}`],
      ['GET', `/fornecedores/${contas.forn.id}/perfil`],
    ];
    for (const [metodo, caminho, corpo] of tentativas) {
      assert.equal((await ana.req(metodo, caminho, corpo)).status, 403, `${metodo} ${caminho}`);
    }
    assert.equal((await forn.req('GET', `/organizadores/${contas.org.id}/fornecedores`)).status, 403);
    const [[bruno]] = await sql.query('SELECT nome FROM usuario WHERE id = ?', [outro]);
    assert.equal(bruno.nome, 'Bruno Teste');
  });

  it('sem login, rotas de conta respondem 401 e rotas públicas continuam abertas', async () => {
    const anonimo = new Cliente(api.url);
    for (const [metodo, caminho] of [['GET', `/usuarios/${contas.ana.id}`], ['GET', `/usuarios/${contas.ana.id}/favoritos`],
      ['POST', `/usuarios/${contas.ana.id}/favoritos/1`], ['GET', `/eventos?organizadorId=${contas.org.id}`]]) {
      assert.equal((await anonimo.req(metodo, caminho)).status, 401, `${metodo} ${caminho}`);
    }
    for (const caminho of ['/eventos/publicados', '/eventos/1/avaliacoes', '/oportunidades']) {
      assert.equal((await anonimo.req('GET', caminho)).status, 200, caminho);
    }
  });

  it('gravação exige o token CSRF da própria sessão', async () => {
    const { ana, bruno } = clientes;
    const caminho = `/usuarios/${contas.ana.id}/favoritos/1`;
    const semToken = await ana.req('POST', caminho, undefined, { csrf: false });
    assert.equal(semToken.status, 403);
    assert.equal(semToken.json.code, 'CSRF');
    const inventado = { 'X-CSRF-Token': crypto.randomBytes(32).toString('hex') };
    assert.equal((await ana.req('POST', caminho, undefined, { csrf: false, cabecalhos: inventado })).status, 403);
    const deOutro = { 'X-CSRF-Token': bruno.csrf };
    assert.equal((await ana.req('POST', caminho, undefined, { csrf: false, cabecalhos: deOutro })).status, 403);
    assert.equal((await ana.req('POST', caminho)).status, 204);
    assert.equal((await ana.req('DELETE', caminho)).status, 204);
  });

  it('site desconhecido é recusado, inclusive na pré-verificação CORS', async () => {
    const anonimo = new Cliente(api.url);
    const fora = { origem: 'http://site-malicioso.example' };
    const login = await anonimo.req('POST', '/login', { email: contas.ana.email, senha: contas.ana.senha }, fora);
    assert.equal(login.status, 403);
    assert.equal(login.json.code, 'ORIGIN');
    assert.equal((await anonimo.req('GET', '/eventos/publicados', undefined, fora)).status, 403);
    const permitido = await fetch(`${api.url}/usuarios/1/favoritos/1`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://127.0.0.1:4173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-csrf-token' },
    });
    assert.equal(permitido.status, 204);
    assert.equal(permitido.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4173');
    assert.equal(permitido.headers.get('access-control-allow-credentials'), 'true');
    const recusado = await fetch(`${api.url}/usuarios/1/favoritos/1`, {
      method: 'OPTIONS', headers: { Origin: 'http://site-malicioso.example', 'Access-Control-Request-Method': 'POST' },
    });
    assert.equal(recusado.status, 403);
  });

  it('senhas: hash não serve de senha e conta antiga em texto puro é convertida', async () => {
    const [[ana]] = await sql.query('SELECT senha_hash FROM usuario WHERE id = ?', [contas.ana.id]);
    assert.equal((await new Cliente(api.url).entrar(contas.ana.email, ana.senha_hash)).status, 401);
    const email = `legado.${Date.now()}@example.test`;
    await sql.query("INSERT INTO usuario (nome, email, senha_hash, tipo_perfil) VALUES ('Conta Legada', ?, 'SenhaLegada123', 1)", [email]);
    assert.equal((await new Cliente(api.url).entrar(email, 'SenhaLegada123')).status, 200);
    const [[legado]] = await sql.query('SELECT senha_hash FROM usuario WHERE email = ?', [email]);
    assert.match(legado.senha_hash, /^\$2[aby]\$/);
    assert.equal((await new Cliente(api.url).entrar(email, 'SenhaLegada123')).status, 200);
  });

  it('a 11ª senha errada do mesmo e-mail é bloqueada (429) sem afetar outra conta', async () => {
    const anonimo = new Cliente(api.url);
    const alvo = `alvo.${Date.now()}@example.test`;
    const codigos = [];
    for (let i = 0; i < 11; i += 1) codigos.push((await anonimo.req('POST', '/login', { email: alvo, senha: `chute${i}` })).status);
    assert.deepEqual(codigos, [...Array(10).fill(401), 429]);
    assert.equal((await new Cliente(api.url).entrar(contas.ana.email, contas.ana.senha)).status, 200);
  });

  it('cadastros incompletos (400) não prendem conexões do banco', async () => {
    const anonimo = new Cliente(api.url);
    for (let i = 0; i < 12; i += 1) {
      assert.equal((await anonimo.req('POST', '/usuarios', { nome: 'Sem senha' })).status, 400);
    }
    const depois = await Promise.race([
      anonimo.req('GET', '/eventos/publicados').then((r) => r.status),
      new Promise((pronto) => setTimeout(() => pronto('travou'), 5000)),
    ]);
    assert.equal(depois, 200);
  });

  it('trocar a senha encerra as outras sessões e mantém a atual', async () => {
    const a = new Cliente(api.url);
    const b = new Cliente(api.url);
    await a.entrar(contas.bruno.email, contas.bruno.senha);
    await b.entrar(contas.bruno.email, contas.bruno.senha);
    const nova = senhaAleatoria();
    assert.equal((await a.req('PUT', `/usuarios/${contas.bruno.id}/senha`, { senhaAtual: contas.bruno.senha, novaSenha: nova })).status, 200);
    assert.equal((await b.req('GET', `/usuarios/${contas.bruno.id}`)).status, 401);
    assert.equal((await a.req('GET', `/usuarios/${contas.bruno.id}`)).status, 200);
    contas.bruno.senha = nova;
    clientes.bruno = a;
  });

  it('novo login invalida o cookie anterior; sessão vencida e logout deixam o cookie sem efeito', async () => {
    const cliente = new Cliente(api.url);
    await cliente.entrar(contas.ana.email, contas.ana.senha);
    const anterior = cliente.cookie;
    await cliente.entrar(contas.ana.email, contas.ana.senha);
    const velho = new Cliente(api.url);
    velho.cookie = anterior;
    assert.equal((await velho.req('GET', `/usuarios/${contas.ana.id}`)).status, 401);
    assert.equal((await cliente.req('GET', `/usuarios/${contas.ana.id}`)).status, 200);

    await sql.query('UPDATE sessao SET expira_em = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id_hash = ?', [resumo(cliente.codigoDoCookie())]);
    assert.equal((await cliente.req('GET', `/usuarios/${contas.ana.id}`)).status, 401);

    const saindo = new Cliente(api.url);
    await saindo.entrar(contas.ana.email, contas.ana.senha);
    const cookie = saindo.cookie;
    const r = await saindo.req('POST', '/logout');
    assert.equal(r.status, 204);
    assert.equal(saindo.cookie, null);
    const reuso = new Cliente(api.url);
    reuso.cookie = cookie;
    assert.equal((await reuso.req('GET', `/usuarios/${contas.ana.id}`)).status, 401);
  });

  it('participantes reservam, anunciam, trocam ingressos e usam a comunidade', async () => {
    const { ana, bruno } = clientes;
    const reservaAna = await ana.req('POST', '/eventos/2/ingressos', { userId: contas.ana.id, quantity: 1, type: 'Meia-entrada' });
    assert.equal(reservaAna.status, 201);
    const reservaBruno = await bruno.req('POST', '/eventos/1/ingressos', { userId: contas.bruno.id, quantity: 1, type: 'Inteira' });
    assert.equal(reservaBruno.status, 201);
    const ingressoAna = reservaAna.json.tickets[0].id;
    const ingressoBruno = reservaBruno.json.tickets[0].id;
    assert.equal((await bruno.req('PUT', `/ingressos/${ingressoBruno}/troca`, { userId: contas.bruno.id, available: true })).status, 204);
    const proposta = await ana.req('POST', '/trocas', { userId: contas.ana.id, requestedTicketId: ingressoBruno, offeredTicketId: ingressoAna });
    assert.equal(proposta.status, 201);
    assert.equal((await ana.req('PUT', `/trocas/${proposta.json.id}`, { userId: contas.ana.id, action: 'aceitar' })).status, 403);
    const aceite = await bruno.req('PUT', `/trocas/${proposta.json.id}`, { userId: contas.bruno.id, action: 'aceitar' });
    assert.equal(aceite.status, 200);
    const ingressos = (await ana.req('GET', `/usuarios/${contas.ana.id}/ingressos`)).json;
    assert.ok(ingressos.some((ingresso) => ingresso.id === ingressoBruno), 'o ingresso do Bruno passou para a Ana');

    assert.equal((await ana.req('POST', `/usuarios/${contas.ana.id}/favoritos/2`)).status, 204);
    assert.deepEqual((await ana.req('GET', `/usuarios/${contas.ana.id}/favoritos`)).json, [2]);

    const mensagem = await ana.req('POST', '/comunidade/mensagens', { userId: contas.ana.id, text: 'Teste com sessão' });
    assert.equal(mensagem.status, 201);
    assert.equal((await bruno.req('DELETE', `/comunidade/mensagens/${mensagem.json.id}`, { userId: contas.ana.id })).status, 403);
    assert.equal((await ana.req('DELETE', `/comunidade/mensagens/${mensagem.json.id}`, { userId: contas.ana.id })).status, 204);
  });

  it('organizador e fornecedor usam as próprias áreas', async () => {
    const { org, forn } = clientes;
    assert.equal((await org.req('GET', `/eventos?organizadorId=${contas.org.id}`)).status, 200);
    assert.equal((await org.req('GET', `/organizadores/${contas.org.id}/fornecedores`)).status, 200);
    const vinculo = `/organizadores/${contas.org.id}/eventos/1/fornecedores/${contas.forn.id}`;
    assert.equal((await org.req('POST', vinculo)).status, 204);
    assert.equal((await org.req('POST', vinculo)).status, 204, 'vínculo repetido é ignorado');
    const vinculados = (await org.req('GET', `/organizadores/${contas.org.id}/eventos/1/fornecedores`)).json;
    assert.deepEqual(vinculados.map((f) => f.id), [contas.forn.id]);
    assert.equal((await org.req('DELETE', vinculo)).status, 204);

    const perfil = {
      name: 'Fornecedor Teste', email: contas.forn.email, tradeName: 'Som e Luz Teste', phone: '11999990000',
      address: { cidade: 'São Paulo' }, notifications: { email: true }, twoFactor: true,
    };
    assert.equal((await forn.req('PUT', `/fornecedores/${contas.forn.id}/perfil`, perfil)).status, 200);
    const salvo = (await forn.req('GET', `/fornecedores/${contas.forn.id}/perfil`)).json;
    assert.deepEqual([salvo.address, salvo.notifications, salvo.twoFactor], [{ cidade: 'São Paulo' }, { email: true }, true]);
    for (const area of ['produtos', 'oportunidades', 'propostas']) {
      assert.equal((await forn.req('GET', `/fornecedores/${contas.forn.id}/${area}`)).status, 200, area);
    }
  });
});
