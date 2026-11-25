// Testes que não precisam de banco: regras da sessão e do preparo do banco.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { criarSessoes } = require('../sessao');
const { nomeValido, semNomeFixo, versaoSuportada } = require('../scripts/preparar-banco');
const { centavosUnitarios, resumoConteudo, cenarioPagamento, minutosReserva, ErroPedido } = require('../pedidos');

function bancoFalso() {
  const chamadas = [];
  return { chamadas, execute: async (sql, params) => (chamadas.push({ sql, params }), [[]]) };
}

function respostaFalsa(req = {}) {
  return {
    req,
    statusCode: 200,
    body: null,
    status(codigo) {
      this.statusCode = codigo;
      return this;
    },
    json(corpo) {
      this.body = corpo;
      return this;
    },
  };
}

function passou(middleware, req) {
  const res = respostaFalsa(req);
  let chamouNext = false;
  middleware(req, res, () => {
    chamouNext = true;
  });
  return { chamouNext, res };
}

function requisicao({ method = 'GET', path = '/api/x', origin, user = null, csrf, token } = {}) {
  return {
    method,
    path,
    user,
    csrfToken: token,
    ip: '127.0.0.1',
    get: (nome) => ({ origin, 'x-csrf-token': csrf })[nome.toLowerCase()],
  };
}

test('origem: site local passa, site desconhecido é recusado e cliente sem Origin passa', () => {
  const { protegerOrigem, corsOptions } = criarSessoes(bancoFalso());
  assert.equal(passou(protegerOrigem, requisicao({ origin: 'http://127.0.0.1:4173' })).chamouNext, true);
  assert.equal(passou(protegerOrigem, requisicao({ origin: 'http://localhost:5173' })).chamouNext, true);
  const fora = passou(protegerOrigem, requisicao({ origin: 'http://site-malicioso.example' }));
  assert.equal(fora.chamouNext, false);
  assert.equal(fora.res.statusCode, 403);
  assert.equal(passou(protegerOrigem, requisicao()).chamouNext, true);
  corsOptions.origin('http://site-malicioso.example', (erro, permitido) => assert.equal(permitido, false));
  assert.equal(corsOptions.credentials, true);
});

test('gravações: leitura, login e cadastro passam; o resto exige sessão e o token certo', () => {
  const { protegerGravacoes } = criarSessoes(bancoFalso());
  const token = crypto.randomBytes(32).toString('hex');
  const user = { id: 1 };
  assert.equal(passou(protegerGravacoes, requisicao()).chamouNext, true);
  assert.equal(passou(protegerGravacoes, requisicao({ method: 'POST', path: '/api/login' })).chamouNext, true);
  assert.equal(passou(protegerGravacoes, requisicao({ method: 'POST', path: '/api/usuarios' })).chamouNext, true);
  assert.equal(passou(protegerGravacoes, requisicao({ method: 'POST', path: '/uploads/x' })).chamouNext, true);

  const semSessao = passou(protegerGravacoes, requisicao({ method: 'PUT', path: '/api/usuarios/1' }));
  assert.equal(semSessao.res.statusCode, 401);
  const semToken = passou(protegerGravacoes, requisicao({ method: 'POST', user, token }));
  assert.equal(semToken.res.statusCode, 403);
  assert.equal(semToken.res.body.code, 'CSRF');
  const outroToken = requisicao({ method: 'POST', user, token, csrf: crypto.randomBytes(32).toString('hex') });
  assert.equal(passou(protegerGravacoes, outroToken).res.statusCode, 403);
  const tokenCerto = requisicao({ method: 'DELETE', user, token, csrf: token });
  assert.equal(passou(protegerGravacoes, tokenCerto).chamouNext, true);
});

test('própria conta: sem sessão 401, outra conta 403, a mesma conta passa', () => {
  const { exigirPropriaConta } = criarSessoes(bancoFalso());
  const semSessao = respostaFalsa({ user: null });
  assert.equal(exigirPropriaConta(semSessao, 1), false);
  assert.equal(semSessao.statusCode, 401);
  const outra = respostaFalsa({ user: { id: 1 } });
  assert.equal(exigirPropriaConta(outra, '2'), false);
  assert.equal(outra.statusCode, 403);
  assert.equal(exigirPropriaConta(respostaFalsa({ user: { id: 7 } }), '7'), true);
});

test('senha: bcrypt confere, hash não serve de senha e texto puro antigo é convertido', async () => {
  const banco = bancoFalso();
  const { conferirSenha } = criarSessoes(banco);
  const hash = await bcrypt.hash('Senha-Ficticia-2026', 4);
  assert.equal(await conferirSenha('Senha-Ficticia-2026', { id: 1, senha_hash: hash }), true);
  assert.equal(await conferirSenha('errada', { id: 1, senha_hash: hash }), false);
  assert.equal(await conferirSenha(hash, { id: 1, senha_hash: hash }), false);
  assert.equal(await conferirSenha('qualquer', undefined), false);
  assert.equal(await conferirSenha(undefined, { id: 1, senha_hash: hash }), false);
  assert.equal(banco.chamadas.length, 0);

  assert.equal(await conferirSenha('SenhaAntiga', { id: 9, senha_hash: 'SenhaAntiga' }), true);
  const [atualizacao] = banco.chamadas;
  assert.match(atualizacao.sql, /UPDATE usuario SET senha_hash/);
  assert.match(atualizacao.params[0], /^\$2[aby]\$/);
  assert.equal(atualizacao.params[1], 9);
  assert.equal(await conferirSenha('outra', { id: 9, senha_hash: 'SenhaAntiga' }), false);
});

test('limite de tentativas: a 11ª do mesmo e-mail é bloqueada, outro e-mail não, e liberar zera', () => {
  const { limitarTentativas, liberarTentativas } = criarSessoes(bancoFalso());
  const req = { ip: '10.0.0.1' };
  for (let i = 0; i < 10; i += 1) assert.equal(limitarTentativas(req, 'alvo@example.test').bloqueado, false);
  const bloqueio = limitarTentativas(req, 'ALVO@example.test');
  assert.equal(bloqueio.bloqueado, true);
  assert.equal(limitarTentativas(req, 'outra@example.test').bloqueado, false);
  liberarTentativas(bloqueio.chave);
  assert.equal(limitarTentativas(req, 'alvo@example.test').bloqueado, false);
});

test('preparo do banco: nomes seguros, SQL sem nome fixo e versões suportadas', () => {
  for (const nome of ['trocaticket', 'trocaticket_teste_1', 'Banco_2026']) assert.equal(nomeValido(nome), true);
  for (const nome of ['', 'a-b', 'x; DROP DATABASE y', 'a`b', 'x'.repeat(65), undefined]) {
    assert.equal(nomeValido(nome), false);
  }
  const sql = 'CREATE DATABASE trocaticket; # criando\nUSE trocaticket;\nCREATE TABLE usuario(id INT);\n  use outro ;\nSELECT 1;';
  assert.equal(semNomeFixo(sql).trim().split('\n').filter(Boolean).join('|'), 'CREATE TABLE usuario(id INT);|SELECT 1;');
  for (const versao of ['8.0.16', '8.0.46-0ubuntu0.24.04.5', '8.4.2', '10.5.1-MariaDB', '10.11.14-MariaDB-0ubuntu0.24.04.1', '11.8.2-MariaDB']) {
    assert.equal(versaoSuportada(versao), true, versao);
  }
  for (const versao of ['8.0.15', '5.7.44', '10.4.32-MariaDB']) assert.equal(versaoSuportada(versao), false, versao);
});

test('pedidos: preço em centavos, meia-entrada pela metade e preço inválido recusado', () => {
  assert.equal(centavosUnitarios('80.00', 'Inteira'), 8000);
  assert.equal(centavosUnitarios('80.00', 'Meia-entrada'), 4000);
  assert.equal(centavosUnitarios('80.55', 'Meia-entrada'), 4028);
  assert.equal(centavosUnitarios('0.00', 'Inteira'), 0);
  assert.throws(() => centavosUnitarios('abc', 'Inteira'), (erro) => erro instanceof ErroPedido && erro.status === 400);
});

test('pedidos: a chave de repetição compara o conteúdo, não a ordem dos campos', () => {
  assert.equal(resumoConteudo('criar', { a: 1, b: { c: 2, d: 3 } }), resumoConteudo('criar', { b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(resumoConteudo('criar', { a: 1 }), resumoConteudo('pagar:1', { a: 1 }));
  assert.notEqual(resumoConteudo('criar', { a: 1 }), resumoConteudo('criar', { a: 2 }));
});

test('pedidos: cenário de pagamento e prazo da reserva têm padrões seguros', () => {
  const anterior = { PAGAMENTO_SIMULADO: process.env.PAGAMENTO_SIMULADO, RESERVA_MINUTOS: process.env.RESERVA_MINUTOS };
  try {
    delete process.env.PAGAMENTO_SIMULADO;
    assert.equal(cenarioPagamento(), 'aprovado');
    process.env.PAGAMENTO_SIMULADO = 'RECUSADO';
    assert.equal(cenarioPagamento(), 'recusado');
    process.env.PAGAMENTO_SIMULADO = 'qualquer';
    assert.equal(cenarioPagamento(), 'aprovado');
    delete process.env.RESERVA_MINUTOS;
    assert.equal(minutosReserva(), 15);
    process.env.RESERVA_MINUTOS = '5';
    assert.equal(minutosReserva(), 5);
    for (const valor of ['0', '500', 'abc', '2.5']) {
      process.env.RESERVA_MINUTOS = valor;
      assert.equal(minutosReserva(), 15, valor);
    }
  } finally {
    for (const [chave, valor] of Object.entries(anterior)) {
      if (valor === undefined) delete process.env[chave];
      else process.env[chave] = valor;
    }
  }
});
