// Iniciador do TrocaTicket (Entrega 1): abre API + site com um comando.
// Adaptado de documentos/Site/TrocaTicket 2.0/scripts/iniciar.mjs.
//
// 1. Confere o Node.js e se as portas 3000 (API) e 5173 (site) estão livres.
// 2. Instala as dependências que faltarem (só na primeira vez).
// 3. Na primeira vez (ou com "configurar"), pergunta a conexão do MySQL e guarda em server/.env,
//    que o Git ignora. A conexão só é guardada depois de funcionar.
// 4. Prepara o banco com server/scripts/preparar-banco.js (cria se não existir; nunca apaga dados).
// 5. Sobe a API e o site, abre o navegador e espera Enter ou Ctrl+C para encerrar os dois.
//
// Uso: Iniciar-TrocaTicket.cmd (Windows), Iniciar-TrocaTicket.command (Mac) ou npm start.
// Opções: "configurar" refaz a conexão; "--sem-navegador" não abre o navegador.

import { spawn } from 'node:child_process';
import { chmodSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { constants } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVIDOR = join(RAIZ, 'server');
const ARQUIVO_ENV = join(SERVIDOR, '.env');
const LOGS = join(RAIZ, 'logs');
const PORTA_API = 3000;
const PORTA_SITE = 5173;
const URL_SITE = `http://127.0.0.1:${PORTA_SITE}`;
const URL_API_PRONTA = `http://127.0.0.1:${PORTA_API}/api/eventos/publicados`;
const CHAVES_BANCO = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

const opcoes = new Set(process.argv.slice(2).map((opcao) => opcao.toLowerCase()));
const reconfigurar = opcoes.has('configurar');
const abrirNavegador = !opcoes.has('--sem-navegador');
const filhos = [];
let encerrando = false;

const esperar = (ms) => new Promise((pronto) => setTimeout(pronto, ms));

class ErroIniciador extends Error {}

// ---------------------------------------------------------------- perguntas no terminal
function criarLeitor() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });
  const fila = [];
  const esperando = [];
  rl.on('line', (linha) => {
    const responder = esperando.shift();
    if (responder) responder(linha);
    else fila.push(linha);
  });
  rl.on('close', () => {
    for (const responder of esperando.splice(0)) responder(null);
  });
  // Para a senha: enquanto "mudo", o que a pessoa digita não aparece na tela.
  let mudo = false;
  const escrever = rl._writeToOutput?.bind(rl);
  if (escrever) rl._writeToOutput = (texto) => (mudo ? undefined : escrever(texto));

  async function perguntar(texto, { padrao = '', oculto = false } = {}) {
    rl.setPrompt(padrao ? `${texto} [${padrao}]: ` : `${texto}: `);
    rl.prompt();
    mudo = oculto && Boolean(process.stdin.isTTY);
    const resposta = fila.length ? fila.shift() : await new Promise((ok) => esperando.push(ok));
    if (mudo) process.stdout.write('\n');
    mudo = false;
    if (resposta === null) throw new ErroIniciador('Configuração cancelada.');
    // A senha é usada exatamente como digitada; os outros campos ignoram espaços nas pontas.
    if (oculto) return resposta.replace(/\r$/, '');
    return resposta.trim() || padrao;
  }
  return { perguntar, fechar: () => rl.close() };
}

// ---------------------------------------------------------------- server/.env
function lerEnv() {
  if (!existsSync(ARQUIVO_ENV)) return {};
  const valores = {};
  for (const linha of readFileSync(ARQUIVO_ENV, 'utf8').split(/\r?\n/)) {
    const achado = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!achado) continue;
    let valor = achado[2];
    const aspas = valor.match(/^(['"`])([\s\S]*)\1$/);
    if (aspas) valor = aspas[2];
    else valor = valor.replace(/\s+#.*$/, '');
    valores[achado[1]] = valor;
  }
  return valores;
}

function valorEnv(valor) {
  const texto = String(valor ?? '');
  if (!texto.includes("'")) return `'${texto}'`;
  if (!texto.includes('"')) return `"${texto}"`;
  return `\`${texto}\``;
}

// Atualiza só as chaves do banco e preserva as outras linhas (CORS_ORIGINS, comentários...).
function salvarEnv(config) {
  const linhas = existsSync(ARQUIVO_ENV) ? readFileSync(ARQUIVO_ENV, 'utf8').split(/\r?\n/) : [];
  const pendentes = new Map(CHAVES_BANCO.map((chave) => [chave, config[chave]]));
  const novas = linhas.map((linha) => {
    const chave = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];
    if (!chave || !pendentes.has(chave)) return linha;
    const valor = pendentes.get(chave);
    pendentes.delete(chave);
    return `${chave}=${valorEnv(valor)}`;
  });
  while (novas.length && novas[novas.length - 1] === '') novas.pop();
  for (const [chave, valor] of pendentes) novas.push(`${chave}=${valorEnv(valor)}`);
  writeFileSync(ARQUIVO_ENV, `${novas.join('\n')}\n`, { mode: 0o600 });
  try {
    chmodSync(ARQUIVO_ENV, 0o600);
  } catch {}
}

async function obterConexao() {
  const atual = lerEnv();
  if (!reconfigurar && atual.DB_USER && atual.DB_NAME) {
    const config = Object.fromEntries(CHAVES_BANCO.map((chave) => [chave, atual[chave] ?? '']));
    config.DB_HOST ||= '127.0.0.1';
    config.DB_PORT ||= '3306';
    return { config, nova: false };
  }
  console.log('\nConfiguração do MySQL (só na primeira vez). Use a mesma conexão do MySQL Workbench.');
  console.log('Ela fica em server/.env, que não vai para o GitHub.\n');
  const leitor = criarLeitor();
  try {
    const config = {
      DB_HOST: await leitor.perguntar('Endereço do MySQL', { padrao: atual.DB_HOST || '127.0.0.1' }),
      DB_PORT: await leitor.perguntar('Porta', { padrao: atual.DB_PORT || '3306' }),
      DB_USER: await leitor.perguntar('Usuário', { padrao: atual.DB_USER || 'root' }),
      DB_PASSWORD: await leitor.perguntar('Senha (não aparece ao digitar; Enter se não tiver)', { oculto: true }),
      DB_NAME: await leitor.perguntar('Nome do banco', { padrao: atual.DB_NAME || 'trocaticket' }),
    };
    if (!/^\d{1,5}$/.test(config.DB_PORT)) throw new ErroIniciador('Porta inválida.');
    if (!/^[A-Za-z0-9_]{1,64}$/.test(config.DB_NAME)) {
      throw new ErroIniciador('Nome de banco inválido: use só letras, números e _.');
    }
    return { config, nova: true };
  } finally {
    leitor.fechar();
  }
}

// ---------------------------------------------------------------- processos
function caminhoNpm() {
  const candidatos = [
    process.env.npm_execpath,
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);
  return candidatos.find((caminho) => /npm-cli\.js$/.test(caminho) && existsSync(caminho)) || null;
}

function executar(argumentos, pasta, nomeLog, { ambiente = process.env, mostrar = false } = {}) {
  mkdirSync(LOGS, { recursive: true });
  const log = createWriteStream(join(LOGS, `${nomeLog}.log`), { flags: 'a' });
  log.write(`\n--- ${new Date().toISOString()} ${argumentos.join(' ')}\n`);
  const filho = spawn(process.execPath, argumentos, {
    cwd: pasta,
    env: ambiente,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  filho.ultimas = [];
  const registrar = (dados) => {
    log.write(dados);
    const texto = dados.toString();
    filho.ultimas.push(...texto.split(/\r?\n/).filter(Boolean));
    filho.ultimas = filho.ultimas.slice(-8);
    if (mostrar) process.stdout.write(texto.replace(/^(?=.)/gm, '  '));
  };
  filho.stdout.on('data', registrar);
  filho.stderr.on('data', registrar);
  filho.on('error', (erro) => {
    filho.falhou = erro;
  });
  filho.on('close', () => log.end());
  filhos.push(filho);
  return filho;
}

function concluir(filho) {
  return new Promise((pronto) => {
    if (filho.exitCode !== null) return pronto(filho.exitCode);
    filho.once('close', (codigo) => pronto(codigo ?? 1));
  });
}

async function instalarSeNecessario(pasta, marcador, nome) {
  if (existsSync(join(pasta, marcador))) return;
  const npm = caminhoNpm();
  if (!npm) throw new ErroIniciador('npm não encontrado. Instale o Node.js com npm e tente de novo.');
  console.log(`Instalando as dependências ${nome} (só na primeira vez, pode levar alguns minutos)...`);
  const filho = executar([npm, 'ci', '--no-audit', '--no-fund'], pasta, 'instalacao');
  if ((await concluir(filho)) !== 0) {
    throw new ErroIniciador(`A instalação ${nome} falhou. Veja logs/instalacao.log.`);
  }
}

function portaLivre(porta) {
  return new Promise((pronto) => {
    const teste = net.createServer();
    teste.once('error', () => pronto(false));
    teste.once('listening', () => teste.close(() => pronto(true)));
    teste.listen(porta);
  });
}

async function respondeOk(url) {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return resposta.ok;
  } catch {
    return false;
  }
}

async function aguardarPronto(filho, url, nome, arquivoLog) {
  const limite = Date.now() + 40000;
  while (Date.now() < limite) {
    if (filho.exitCode !== null || filho.falhou) break;
    if (await respondeOk(url)) return;
    await esperar(300);
  }
  const detalhes = filho.ultimas.length ? `\nÚltimas linhas de logs/${arquivoLog}:\n  ${filho.ultimas.join('\n  ')}` : '';
  throw new ErroIniciador(`${nome} não iniciou.${detalhes}`);
}

function abrirNoNavegador(url) {
  const comandos = { win32: ['explorer.exe', [url]], darwin: ['open', [url]] };
  const [comando, argumentos] = comandos[process.platform] || ['xdg-open', [url]];
  try {
    const filho = spawn(comando, argumentos, { stdio: 'ignore', detached: true, windowsHide: true });
    filho.on('error', () => {});
    filho.unref();
  } catch {}
}

async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  for (const filho of filhos.reverse()) {
    if (filho.exitCode === null && !filho.signalCode) {
      const fechado = concluir(filho);
      filho.kill('SIGTERM');
      await Promise.race([fechado, esperar(3000)]);
      if (filho.exitCode === null) filho.kill('SIGKILL');
    }
  }
}

// ---------------------------------------------------------------- fluxo principal
async function iniciar() {
  const [maior, menor] = process.versions.node.split('.').map(Number);
  if (maior < 22 || (maior === 22 && menor < 12)) {
    throw new ErroIniciador(`Este projeto precisa do Node.js 22.12 ou mais novo (você tem ${process.versions.node}).`);
  }
  console.log('\nTrocaTicket — Entrega 1 (projeto acadêmico local)\n');
  for (const [porta, nome] of [[PORTA_API, 'da API'], [PORTA_SITE, 'do site']]) {
    if (!(await portaLivre(porta))) {
      throw new ErroIniciador(
        `A porta ${porta} ${nome} está em uso. Feche a janela do TrocaTicket que já está aberta ` +
          '(ou o outro programa que usa essa porta) e tente de novo.',
      );
    }
  }

  await instalarSeNecessario(SERVIDOR, 'node_modules/mysql2/package.json', 'da API');
  await instalarSeNecessario(RAIZ, 'node_modules/vite/package.json', 'do site');

  const { config, nova } = await obterConexao();
  const ambienteBanco = { ...process.env, ...config };
  console.log('Conferindo o banco de dados (os dados existentes são preservados)...');
  const preparo = executar(['scripts/preparar-banco.js'], SERVIDOR, 'banco', { ambiente: ambienteBanco, mostrar: true });
  if ((await concluir(preparo)) !== 0) {
    throw new ErroIniciador(
      nova
        ? 'Não foi possível preparar o banco com essa conexão; ela não foi guardada. Confira os dados e tente de novo.'
        : 'Não foi possível preparar o banco. Se a senha ou o usuário do MySQL mudaram, abra o iniciador com "configurar".',
    );
  }
  if (nova) {
    salvarEnv(config);
    console.log('Conexão guardada em server/.env.');
  }

  console.log('Iniciando a API...');
  const api = executar(['server.js'], SERVIDOR, 'api', { ambiente: { ...ambienteBanco, PORT: String(PORTA_API) } });
  await aguardarPronto(api, URL_API_PRONTA, 'A API', 'api.log');

  // O site não precisa (nem deve receber) a senha do banco.
  const ambienteSite = { ...process.env };
  for (const chave of Object.keys(ambienteSite)) if (/^DB_/.test(chave)) delete ambienteSite[chave];
  console.log('Iniciando o site...');
  const site = executar(
    [join(RAIZ, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(PORTA_SITE), '--strictPort'],
    RAIZ,
    'site',
    { ambiente: ambienteSite },
  );
  await aguardarPronto(site, URL_SITE, 'O site', 'site.log');

  console.log(`\nPronto! Abra ${URL_SITE}`);
  console.log('Deixe esta janela aberta enquanto usa o sistema.');
  console.log('Para encerrar a API e o site, pressione Enter ou Ctrl+C (ou feche a janela).\n');
  if (abrirNavegador) abrirNoNavegador(URL_SITE);

  await new Promise((pronto) => {
    process.stdin.resume();
    process.stdin.once('data', pronto);
    process.stdin.once('end', pronto);
    for (const filho of [api, site]) {
      filho.once('close', () => {
        if (!encerrando) console.error(`\n${filho === api ? 'A API' : 'O site'} parou. Veja a pasta logs/.`);
        pronto();
      });
    }
  });
}

for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].filter((nome) => nome in constants.signals)) {
  process.once(sinal, () => encerrar().then(() => process.exit(0)));
}

try {
  await iniciar();
} catch (erro) {
  console.error(`\n${erro instanceof ErroIniciador ? erro.message : `Erro inesperado: ${erro.stack || erro}`}`);
  process.exitCode = 1;
} finally {
  await encerrar();
  console.log('API e site encerrados.');
  process.stdin.pause();
}
