// Testes da configuração local (server/config.js) e da partida da API. Não precisam de MySQL.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const config = require('../config');

const SERVIDOR = path.join(__dirname, '..');

test('prioridade: variável de ambiente não vazia, depois server/.env, depois o padrão', () => {
  const arquivo = { DB_HOST: 'arquivo.local', DB_PORT: '3307', DB_USER: 'aluno', DB_NAME: 'tt_arquivo', PORT: '' };
  const { valores, origens, encobertas } = config.resolver({
    ambiente: { DB_PORT: '3310', DB_NAME: '', DB_HOST: undefined },
    arquivo,
  });
  assert.equal(valores.DB_PORT, '3310');
  assert.equal(origens.DB_PORT, 'ambiente');
  assert.equal(valores.DB_HOST, 'arquivo.local');
  assert.equal(origens.DB_HOST, 'arquivo');
  // Variável vazia não encobre o arquivo; valor vazio no arquivo cai no padrão.
  assert.equal(valores.DB_NAME, 'tt_arquivo');
  assert.equal(valores.PORT, '3000');
  assert.equal(origens.PORT, 'padrao');
  assert.deepEqual(encobertas, [{ chave: 'DB_PORT', ambiente: '3310', arquivo: '3307' }]);
});

test('sem server/.env: padrões iguais para API, preparo do banco, criar-admin e iniciador', () => {
  const { valores, arquivoExiste } = config.resolver({ ambiente: {}, arquivo: null });
  assert.equal(arquivoExiste, false);
  assert.deepEqual(config.configBanco(valores), {
    host: '127.0.0.1',
    port: 3306,
    user: '',
    password: '',
    database: 'trocaticket',
  });
  assert.equal(config.portaApi(valores), 3000);
});

test('porta inválida não cai no padrão em silêncio', () => {
  for (const porta of ['3307;', '3,307', 'abc', '0', '70000']) {
    const { valores } = config.resolver({ ambiente: {}, arquivo: { DB_PORT: porta } });
    assert.throws(() => config.configBanco(valores), config.ErroConfiguracao, porta);
  }
  const comEspacos = config.resolver({ ambiente: {}, arquivo: { DB_PORT: ' 3307 ' } }).valores;
  assert.equal(config.configBanco(comEspacos).port, 3307);
  const hostComPorta = config.resolver({ ambiente: {}, arquivo: { DB_HOST: '127.0.0.1:3307' } }).valores;
  assert.match(config.problemas(hostComPorta).join(' '), /ponha a porta em DB_PORT/);
  const nomeRuim = config.resolver({ ambiente: {}, arquivo: { DB_NAME: 'meu banco' } }).valores;
  assert.throws(() => config.configBanco(nomeRuim), /DB_NAME/);
  assert.throws(() => config.portaApi({ ...comEspacos, PORT: '3000a' }), /PORT inválida/);
});

test('resumo mostra endereço, porta e conflitos, mas nunca usuário nem senha', () => {
  const usuario = 'usuario-que-nao-pode-aparecer';
  const senha = 'senha-que-nao-pode-aparecer';
  const resolvido = config.resolver({
    ambiente: { DB_PORT: '3306', DB_PASSWORD: `${senha}-2` },
    arquivo: { DB_HOST: '127.0.0.1', DB_PORT: '3307', DB_USER: usuario, DB_PASSWORD: senha, DB_NAME: 'tt_local' },
  });
  const texto = config.descrever(resolvido).join('\n');
  assert.ok(!texto.includes(usuario) && !texto.includes(senha), texto);
  assert.match(texto, /MySQL: 127\.0\.0\.1:3306, banco tt_local/);
  assert.match(texto, /DB_PORT está definida numa variável de ambiente \(3306\), que tem prioridade sobre server\/\.env \(3307\)/);
  assert.match(texto, /DB_PASSWORD está definida numa variável de ambiente, que tem prioridade sobre server\/\.env \(valores ocultos\)/);
  assert.match(texto, /Origem: server\/\.env \(DB_HOST, DB_USER, DB_NAME\); variável de ambiente \(DB_PORT, DB_PASSWORD\); padrão \(PORT\)/);
});

test('mensagens de falha do banco dizem onde tentaram conectar, sem o usuário', () => {
  const alvo = { host: '127.0.0.1', port: 3399, user: 'alguem', database: 'tt' };
  assert.match(config.explicarErroBanco({ code: 'ECONNREFUSED' }, alvo), /Nada respondeu em 127\.0\.0\.1:3399/);
  const negado = config.explicarErroBanco({ code: 'ER_ACCESS_DENIED_ERROR' }, alvo);
  assert.match(negado, /recusou o usuário ou a senha/);
  assert.ok(!negado.includes('alguem'));
  assert.match(config.explicarErroBanco({ code: 'ER_BAD_DB_ERROR' }, alvo), /O banco tt não existe/);
});

test('leitura do arquivo: aspas, comentários, export e arquivo ausente', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-config-'));
  try {
    const arquivo = path.join(pasta, '.env');
    fs.writeFileSync(arquivo, "# comentário\nexport DB_PORT=3307\nDB_HOST = '127.0.0.1'\nDB_NAME=tt # nome\r\n");
    assert.deepEqual(config.lerArquivo(arquivo), { DB_PORT: '3307', DB_HOST: '127.0.0.1', DB_NAME: 'tt' });
    assert.equal(config.lerArquivo(path.join(pasta, 'nao-existe')), null);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('o arquivo lido é sempre server/.env, de qualquer pasta em que o terminal esteja', () => {
  const caminho = execFileSync(process.execPath, ['-e', `process.stdout.write(require(${JSON.stringify(path.join(SERVIDOR, 'config.js'))}).ARQUIVO_ENV)`], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
  });
  assert.equal(caminho, path.join(SERVIDOR, '.env'));
});

function portaLivre() {
  return new Promise((pronto, falhou) => {
    const s = net.createServer();
    s.once('error', falhou);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => pronto(port));
    });
  });
}

// Sobe server.js como alguém faria no terminal e devolve a saída e o código de saída.
function rodarApi(ambiente, { cwd = SERVIDOR, limite = 15000 } = {}) {
  return new Promise((pronto) => {
    const filho = spawn(process.execPath, [path.join(SERVIDOR, 'server.js')], {
      cwd,
      env: { ...process.env, ...ambiente },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let saida = '';
    let terminou = false;
    const fim = (codigo) => {
      if (terminou) return;
      terminou = true;
      clearTimeout(relogio);
      filho.kill();
      pronto({ saida, codigo });
    };
    const relogio = setTimeout(() => fim('tempo'), limite);
    const ler = (dados) => {
      saida += dados;
      if (/Sem acesso ao banco|Banco conectado|faltam tabelas/.test(saida)) fim('aberta');
    };
    filho.stdout.on('data', ler);
    filho.stderr.on('data', ler);
    filho.on('exit', (codigo) => fim(codigo));
  });
}

test('porta da API ocupada: a API avisa e sai, sem anunciar que está rodando', async () => {
  const ocupante = net.createServer();
  await new Promise((pronto) => ocupante.listen(0, pronto));
  try {
    const { port } = ocupante.address();
    const { saida, codigo } = await rodarApi({ PORT: String(port) });
    assert.equal(codigo, 1, saida);
    assert.match(saida, new RegExp(`A porta ${port} já está em uso`));
    assert.doesNotMatch(saida, /rodando/);
  } finally {
    ocupante.close();
  }
});

test('DB_PORT inválida: a API não abre e diz o motivo', async () => {
  const { saida, codigo } = await rodarApi({ DB_PORT: '3307;' });
  assert.equal(codigo, 1, saida);
  assert.match(saida, /DB_PORT inválida \("3307;"\)/);
});

test('aberta de outra pasta, a API mostra o server/.env usado e para onde tentou conectar', async () => {
  const [portaApi, portaSemBanco] = [await portaLivre(), await portaLivre()];
  const { saida, codigo } = await rodarApi(
    { PORT: String(portaApi), DB_HOST: '127.0.0.1', DB_PORT: String(portaSemBanco), DB_USER: 'teste', DB_NAME: 'tt_teste_partida' },
    { cwd: os.tmpdir() },
  );
  assert.equal(codigo, 'aberta', saida);
  assert.match(saida, new RegExp(`rodando em http://127\\.0\\.0\\.1:${portaApi}/api`));
  assert.ok(saida.includes(`Configuração: ${path.join(SERVIDOR, '.env')}`), saida);
  assert.match(saida, new RegExp(`MySQL: 127\\.0\\.0\\.1:${portaSemBanco}, banco tt_teste_partida`));
  assert.match(saida, new RegExp(`Sem acesso ao banco: Nada respondeu em 127\\.0\\.0\\.1:${portaSemBanco}`));
});
