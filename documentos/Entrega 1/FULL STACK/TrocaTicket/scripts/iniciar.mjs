// Iniciador do TrocaTicket (Entrega 1): abre API + site com um comando.
// Adaptado de documentos/Site/TrocaTicket 2.0/scripts/iniciar.mjs.
//
// 1. Confere o Node.js e instala as dependências que faltarem (só na primeira vez).
// 2. Lê a configuração do mesmo jeito que a API (server/config.js): server/.env, com as variáveis
//    de ambiente do sistema por cima. Na primeira vez (ou com "configurar"), pergunta a conexão do
//    MySQL e guarda em server/.env, que o Git ignora. A conexão só é guardada depois de funcionar.
// 3. Confere se as portas da API (PORT, padrão 3000) e do site (5173) estão livres.
// 4. Prepara o banco com server/scripts/preparar-banco.js (cria se não existir; nunca apaga dados).
// 5. Sobe a API e o site, abre o navegador e espera Enter ou Ctrl+C para encerrar os dois.
//
// A API lê o server/.env sozinha: o iniciador não repassa a conexão nem a porta por variáveis de
// ambiente. Abrir pelo iniciador ou à mão usa a mesma configuração.
//
// Uso: Iniciar-TrocaTicket.cmd (Windows), Iniciar-TrocaTicket.command (Mac) ou npm start.
// Opções: "configurar" refaz a conexão; "--sem-navegador" não abre o navegador.

import { spawn } from 'node:child_process';
import { appendFileSync, chmodSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import { constants } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SERVIDOR = join(RAIZ, 'server');
const ARQUIVO_ENV = join(SERVIDOR, '.env');
const EXEMPLO_ENV = join(SERVIDOR, '.env.example');
const LOGS = join(RAIZ, 'logs');
const PORTA_API_PADRAO = 3000;
const PORTA_SITE = 5173;
const URL_SITE = `http://127.0.0.1:${PORTA_SITE}`;
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
function valorEnv(valor) {
  const texto = String(valor ?? '');
  if (!texto.includes("'")) return `'${texto}'`;
  if (!texto.includes('"')) return `"${texto}"`;
  return `\`${texto}\``;
}

// Atualiza só as chaves do banco e preserva as outras linhas (CORS_ORIGINS, comentários...).
// Arquivo novo parte do server/.env.example, para já vir com os comentários e as opções.
function salvarEnv(config) {
  const base = existsSync(ARQUIVO_ENV) ? ARQUIVO_ENV : existsSync(EXEMPLO_ENV) ? EXEMPLO_ENV : null;
  const linhas = base ? readFileSync(base, 'utf8').split(/\r?\n/) : [];
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

// Pergunta a conexão na primeira vez (DB_USER vazio) ou com "configurar". Os valores atuais
// (de server/.env ou do ambiente) aparecem entre colchetes; Enter aceita.
async function perguntarConexao(configuracao, { valores, origens }) {
  console.log('\nConfiguração do MySQL (só na primeira vez). Use a mesma conexão do MySQL Workbench.');
  console.log('Ela fica em server/.env, que não vai para o GitHub.\n');
  const doAmbiente = CHAVES_BANCO.filter((chave) => origens[chave] === 'ambiente');
  if (doAmbiente.length) {
    console.log(
      `Atenção: ${doAmbiente.join(', ')} também está definida numa variável de ambiente, que tem prioridade sobre ` +
        'server/.env. Enquanto ela existir, a API usa o valor dela (veja COMO-RODAR.md).\n',
    );
  }
  const leitor = criarLeitor();
  try {
    const senhaAtual = valores.DB_PASSWORD;
    const digitado = {
      DB_HOST: await leitor.perguntar('Endereço do MySQL', { padrao: valores.DB_HOST }),
      DB_PORT: await leitor.perguntar('Porta do MySQL', { padrao: valores.DB_PORT }),
      DB_USER: await leitor.perguntar('Usuário', { padrao: valores.DB_USER || 'root' }),
      DB_PASSWORD: await leitor.perguntar(
        senhaAtual
          ? 'Senha (não aparece ao digitar; Enter mantém a atual)'
          : 'Senha (não aparece ao digitar; Enter se não tiver)',
        { oculto: true },
      ),
      DB_NAME: await leitor.perguntar('Nome do banco', { padrao: valores.DB_NAME }),
    };
    if (!digitado.DB_PASSWORD && senhaAtual) digitado.DB_PASSWORD = senhaAtual;
    const problemas = configuracao.problemas({ ...valores, ...digitado }, ['DB_HOST', 'DB_PORT', 'DB_NAME']);
    if (problemas.length) throw new ErroIniciador(problemas.join('\n'));
    return digitado;
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

function executar(argumentos, pasta, nomeLog, { ambiente = process.env } = {}) {
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

  await instalarSeNecessario(SERVIDOR, 'node_modules/mysql2/package.json', 'da API');
  await instalarSeNecessario(RAIZ, 'node_modules/vite/package.json', 'do site');

  // Mesmas regras da API e do preparo do banco (server/config.js), sem alterar process.env aqui:
  // a API e o site recebem o ambiente do sistema como está e a API lê o server/.env sozinha.
  const requererServidor = createRequire(join(SERVIDOR, 'package.json'));
  const configuracao = requererServidor('./config.js');
  const { prepararBanco, caminhoScriptBase } = requererServidor('./scripts/preparar-banco.js');
  let resolvido = configuracao.resolver();
  const invalidos = configuracao.problemas(resolvido.valores, ['PORT']);
  if (invalidos.length) throw new ErroIniciador(`Configuração inválida (${ARQUIVO_ENV}):\n${invalidos.join('\n')}`);
  const portaApi = configuracao.portaApi(resolvido.valores);

  for (const [porta, nome] of [[portaApi, 'da API'], [PORTA_SITE, 'do site']]) {
    if (!(await portaLivre(porta))) {
      throw new ErroIniciador(
        `A porta ${porta} ${nome} está em uso. Feche a janela do TrocaTicket que já está aberta ` +
          '(ou o outro programa que usa essa porta) e tente de novo. Veja "Porta ocupada" no COMO-RODAR.md.',
      );
    }
  }

  const nova = reconfigurar || !resolvido.valores.DB_USER;
  const digitado = nova ? await perguntarConexao(configuracao, resolvido) : null;
  if (!nova) {
    const problemas = configuracao.problemas(resolvido.valores, ['DB_HOST', 'DB_PORT', 'DB_NAME']);
    if (problemas.length) throw new ErroIniciador(`Configuração inválida (${ARQUIVO_ENV}):\n${problemas.join('\n')}`);
    console.log('Configuração lida:');
    for (const linha of configuracao.descrever(resolvido)) console.log(`  ${linha}`);
    console.log('');
  }

  // Conexão nova: testada antes de ser guardada. Conexão existente: a mesma que a API vai usar.
  const alvo = configuracao.configBanco(nova ? { ...resolvido.valores, ...digitado } : resolvido.valores);
  mkdirSync(LOGS, { recursive: true });
  const registrarBanco = (mensagem) => {
    console.log(`  ${mensagem}`);
    appendFileSync(join(LOGS, 'banco.log'), `${mensagem}\n`);
  };
  appendFileSync(join(LOGS, 'banco.log'), `\n--- ${new Date().toISOString()} ${alvo.host}:${alvo.port}/${alvo.database}\n`);
  console.log(`Conferindo o banco ${alvo.database} em ${alvo.host}:${alvo.port} (os dados existentes são preservados)...`);
  try {
    const { versao, criado, baseAplicada } = await prepararBanco(alvo, {
      log: registrarBanco,
      scriptBase: caminhoScriptBase(resolvido.valores.SCRIPT_BANCO),
    });
    registrarBanco(
      `Banco pronto (${versao}). ${criado ? 'Banco criado. ' : ''}${
        baseAplicada ? 'Tabelas base criadas. ' : 'Tabelas base já existiam. '
      }Migrações conferidas.`,
    );
  } catch (erro) {
    const motivo = erro.code ? configuracao.explicarErroBanco(erro, alvo) : erro.message;
    appendFileSync(join(LOGS, 'banco.log'), `${motivo}\n`);
    const doAmbiente = CHAVES_BANCO.filter((chave) => resolvido.origens[chave] === 'ambiente');
    throw new ErroIniciador(
      `${motivo}\n` +
        (nova
          ? 'A conexão não foi guardada. Confira os dados e tente de novo.'
          : `Corrija ${ARQUIVO_ENV} (ou abra o iniciador com "configurar") e tente de novo.` +
            (doAmbiente.length
              ? `\nAtenção: ${doAmbiente.join(', ')} veio de variável de ambiente, que vale mais que o arquivo.`
              : '')),
    );
  }
  if (nova) {
    salvarEnv(digitado);
    console.log('Conexão guardada em server/.env.');
    resolvido = configuracao.resolver();
    for (const linha of configuracao.descrever(resolvido)) console.log(`  ${linha}`);
  }

  console.log('Iniciando a API...');
  const api = executar(['server.js'], SERVIDOR, 'api');
  await aguardarPronto(api, `http://127.0.0.1:${portaApi}/api/eventos/publicados`, 'A API', 'api.log');

  // O site não precisa (nem deve receber) a senha do banco. Se a API não estiver na porta padrão,
  // o site é avisado por VITE_API_URL (a menos que a pessoa já tenha definido essa variável).
  const ambienteSite = { ...process.env };
  for (const chave of Object.keys(ambienteSite)) if (/^DB_/.test(chave)) delete ambienteSite[chave];
  if (portaApi !== PORTA_API_PADRAO && !ambienteSite.VITE_API_URL) {
    ambienteSite.VITE_API_URL = `http://127.0.0.1:${portaApi}/api`;
  }
  console.log('Iniciando o site...');
  const site = executar(
    [join(RAIZ, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(PORTA_SITE), '--strictPort'],
    RAIZ,
    'site',
    { ambiente: ambienteSite },
  );
  await aguardarPronto(site, URL_SITE, 'O site', 'site.log');

  const { valores } = resolvido;
  console.log(`\nPronto! Abra ${URL_SITE}`);
  console.log(
    `  site ${URL_SITE} -> API http://127.0.0.1:${portaApi}/api -> MySQL ${valores.DB_HOST}:${valores.DB_PORT} (banco ${valores.DB_NAME})`,
  );
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
