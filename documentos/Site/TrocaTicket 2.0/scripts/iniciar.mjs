// Um processo coordena API e Vite. As regras do sistema continuam no server/.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = 'http://127.0.0.1:3333/api/saude';
const siteUrl = 'http://127.0.0.1:5173';
const registro = join(raiz, 'config', 'execucao.local.json');
const filhos = [];
const logs = [];
let encerrando = false;
let donoDoRegistro = false;
// O PowerShell abre este processo. Se sua janela sumir, encerramos os filhos.
const pai = process.ppid;
const vigiarJanela = setInterval(() => {
  if (!processoVivo(pai)) encerrar().then(() => process.exit(0));
}, 1000);
vigiarJanela.unref();

const esperar = (ms) => new Promise((done) => setTimeout(done, ms));
async function existe(caminho) {
  try {
    await access(caminho);
    return true;
  } catch {
    return false;
  }
}
function processoVivo(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function apiPronta() {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(1000) });
    const data = await response.json();
    return response.ok && data.academic === true && data.banco === 'conectado';
  } catch {
    return false;
  }
}
async function sitePronto() {
  try {
    const response = await fetch(siteUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok && (await response.text()).includes('<title>TrocaTicket');
  } catch {
    return false;
  }
}
async function portaLivre(porta) {
  return new Promise((done) => {
    const server = createServer();
    server.once('error', () => done(false));
    server.listen(porta, '127.0.0.1', () => server.close(() => done(true)));
  });
}
async function abrirNavegador() {
  if (process.env.TROCATICKET_SEM_NAVEGADOR === '1') return;
  // A URL fica fixa no script, sem montagem de comando com dados de usuario.
  const child = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      join(raiz, 'scripts/abrir-navegador.ps1'),
    ],
    {
      windowsHide: true,
      stdio: 'ignore',
    },
  );
  child.on('error', () => console.log(`Abra ${siteUrl} no navegador.`));
  child.on('exit', (code) => {
    if (code) console.log(`Abra ${siteUrl} no navegador.`);
  });
  child.unref();
}
function executar(args, pasta, nome, ambiente = process.env, supervisionar = false) {
  const log = createWriteStream(join(raiz, 'logs', `${nome}.log`), { flags: 'a' });
  logs.push(log);
  const argumentos = supervisionar ? [join(raiz, 'scripts/processo-local.mjs'), ...args] : args;
  const child = spawn(process.execPath, argumentos, {
    cwd: pasta,
    env: ambiente,
    windowsHide: true,
    stdio: supervisionar ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  filhos.push(child);
  child.on('error', (error) => {
    child.falhaDeInicio = error.message;
  });
  return child;
}
async function concluir(child, nome) {
  const code = await new Promise((done) => {
    child.once('error', () => done(-1));
    child.once('exit', done);
  });
  if (code !== 0)
    throw new Error(
      `${nome} nao concluiu. Confira logs/; para trocar a conexao use Iniciar-TrocaTicket.cmd configurar.`,
    );
}
async function instalarSeNecessario(pasta, marcador, nome) {
  if (await existe(join(pasta, marcador))) return;
  const npm =
    process.env.npm_execpath ||
    join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!(await existe(npm)))
    throw new Error('npm nao encontrado. Instale Node.js com npm e tente novamente.');
  console.log(`Instalando dependencias de ${nome} (somente na primeira vez)...`);
  await concluir(
    executar([npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], pasta, 'instalacao'),
    'Instalacao',
  );
}
async function aguardar(child, pronto, nome) {
  const limite = Date.now() + 30000;
  while (Date.now() < limite) {
    if (child.exitCode !== null || child.signalCode || child.falhaDeInicio)
      throw new Error(`${nome} nao iniciou. Consulte logs/.`);
    if (await pronto()) return;
    await esperar(300);
  }
  throw new Error(`${nome} demorou para iniciar. Consulte logs/.`);
}
async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  clearInterval(vigiarJanela);
  for (const child of filhos.reverse()) {
    if (child.exitCode === null && !child.signalCode) {
      const fechado = new Promise((done) => child.once('close', done));
      child.kill('SIGTERM');
      await Promise.race([fechado, esperar(3000)]);
    }
  }
  for (const log of logs) log.end();
  if (donoDoRegistro) await unlink(registro).catch(() => {});
  process.stdin.pause();
}
async function iniciar() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12))
    throw new Error('Requer Node.js 22.12 ou posterior.');
  await mkdir(join(raiz, 'logs'), { recursive: true });
  await mkdir(join(raiz, 'config'), { recursive: true });
  let anterior;
  try {
    anterior = JSON.parse(await readFile(registro, 'utf8'));
  } catch {
    /* Primeiro inicio. */
  }
  if (anterior?.raiz === raiz && processoVivo(anterior.pid)) {
    if ((await apiPronta()) && (await sitePronto())) {
      console.log(`TrocaTicket ja esta aberto: ${siteUrl}`);
      await abrirNavegador();
      return;
    }
    throw new Error('O TrocaTicket ja esta iniciando nesta pasta. Aguarde a primeira janela.');
  }
  for (const porta of [3333, 5173]) {
    if (!(await portaLivre(porta)))
      throw new Error(
        `Porta ${porta} ocupada. Feche a execucao anterior e tente novamente; nenhum processo externo foi encerrado.`,
      );
  }
  // Reserva o iniciador antes de instalar/preparar para evitar duas aberturas juntas.
  if (await existe(registro)) await unlink(registro);
  try {
    await writeFile(
      registro,
      JSON.stringify({ pid: process.pid, raiz, inicio: new Date().toISOString() }),
      { flag: 'wx' },
    );
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Outra abertura do TrocaTicket esta em andamento. Aguarde a primeira janela.',
      );
    throw error;
  }
  donoDoRegistro = true;
  const server = join(raiz, 'server');
  await instalarSeNecessario(server, 'node_modules/mysql2/package.json', 'API');
  await instalarSeNecessario(raiz, 'node_modules/vite/package.json', 'site');
  console.log('Conferindo banco e exemplos ficticios (os dados existentes sao preservados)...');
  await concluir(executar(['scripts/migrar.js'], server, 'banco'), 'Preparo do banco');
  await concluir(executar(['scripts/seed.js'], server, 'banco'), 'Exemplos ficticios');
  const api = executar([join(server, 'index.js')], server, 'api', process.env, true);
  await aguardar(api, apiPronta, 'API');
  // Credenciais do MySQL pertencem somente a API, nunca ao processo do frontend.
  const ambienteSite = { ...process.env, VITE_APP_MODE: 'api' };
  for (const nome of Object.keys(ambienteSite))
    if (/^(DB_|DEMO_PASSWORD$)/.test(nome)) delete ambienteSite[nome];
  const site = executar(
    [
      join(raiz, 'node_modules/vite/bin/vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '5173',
      '--strictPort',
    ],
    raiz,
    'site',
    ambienteSite,
    true,
  );
  await aguardar(site, sitePronto, 'Site');
  console.log(
    `\nPronto! ${siteUrl}\nDeixe esta janela aberta enquanto usa o sistema.\nPressione Enter ou Ctrl+C para encerrar a API e o site.\n`,
  );
  await abrirNavegador();
  await new Promise((done) => {
    process.stdin.resume();
    process.stdin.once('data', done);
    process.stdin.once('end', done);
    api.once('exit', done);
    site.once('exit', done);
  });
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'])
  process.once(signal, () => encerrar().then(() => process.exit(0)));
try {
  await iniciar();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  await encerrar();
}
