// Configuração local da API e dos scripts do servidor (TrocaTicket, Entrega 1).
//
// Fonte única: server/.env (cópia de server/.env.example). O arquivo é achado pelo caminho deste
// módulo, e não pela pasta em que o terminal foi aberto. Usam este módulo a API, o preparo do banco,
// o criar-admin, os testes e o iniciador (scripts/iniciar.mjs).
//
// Prioridade, igual em todos: 1) variável de ambiente não vazia, já definida no sistema ou no
// terminal; 2) server/.env; 3) valor padrão. Variável vazia conta como não definida.
// Quando uma variável do ambiente encobre o valor do arquivo, o resumo avisa qual é e de onde veio,
// sem mostrar usuário nem senha.

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ARQUIVO_ENV = path.join(__dirname, '.env');
const PADROES = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: '',
  DB_PASSWORD: '',
  DB_NAME: 'trocaticket',
  PORT: '3000',
  SCRIPT_BANCO: '',
};
// Valores que nunca aparecem em mensagens.
const OCULTOS = new Set(['DB_USER', 'DB_PASSWORD']);
// Sem espaços nas pontas; usuário e senha ficam exatamente como foram escritos.
const APARAR = new Set(['DB_HOST', 'DB_PORT', 'DB_NAME', 'PORT', 'SCRIPT_BANCO']);
const NOME_ORIGEM = { arquivo: 'server/.env', ambiente: 'variável de ambiente', padrao: 'padrão' };

class ErroConfiguracao extends Error {}

const definido = (valor) => valor !== undefined && valor !== null && String(valor) !== '';

function lerArquivo(arquivo = ARQUIVO_ENV) {
  try {
    return dotenv.parse(fs.readFileSync(arquivo));
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }
}

// Calcula os valores efetivos e a origem de cada um, sem alterar process.env.
function resolver({ ambiente = process.env, arquivo = lerArquivo() } = {}) {
  const doArquivo = arquivo || {};
  const valores = {};
  const origens = {};
  const encobertas = [];
  for (const [chave, padrao] of Object.entries(PADROES)) {
    const limpar = (valor) => (APARAR.has(chave) ? String(valor).trim() : String(valor));
    if (definido(ambiente[chave])) {
      valores[chave] = limpar(ambiente[chave]);
      origens[chave] = 'ambiente';
      if (definido(doArquivo[chave]) && limpar(doArquivo[chave]) !== valores[chave]) {
        encobertas.push({ chave, ambiente: valores[chave], arquivo: limpar(doArquivo[chave]) });
      }
    } else if (definido(doArquivo[chave])) {
      valores[chave] = limpar(doArquivo[chave]);
      origens[chave] = 'arquivo';
    } else {
      valores[chave] = padrao;
      origens[chave] = 'padrao';
    }
  }
  return { valores, origens, encobertas, arquivoExiste: arquivo !== null };
}

function problemas(valores, chaves = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'PORT']) {
  const lista = [];
  for (const chave of chaves.filter((nome) => nome === 'DB_PORT' || nome === 'PORT')) {
    const texto = valores[chave];
    if (!/^\d{1,5}$/.test(texto) || Number(texto) < 1 || Number(texto) > 65535) {
      lista.push(`${chave} inválida ("${texto}"): use só o número da porta, por exemplo ${PADROES[chave]}.`);
    }
  }
  if (chaves.includes('DB_HOST') && /^[^:\s]+:\d+$/.test(valores.DB_HOST)) {
    lista.push('DB_HOST tem uma porta no fim (endereço:porta). Deixe só o endereço em DB_HOST e ponha a porta em DB_PORT.');
  }
  if (chaves.includes('DB_NAME') && !/^[A-Za-z0-9_]{1,64}$/.test(valores.DB_NAME)) {
    lista.push('DB_NAME inválido: use só letras, números e _ (até 64 caracteres).');
  }
  return lista;
}

// Lê server/.env uma vez e completa process.env com o que faltar (sem trocar o que já existe).
// Os outros módulos (sessão, pedidos, revenda) continuam lendo process.env normalmente.
let estado = null;
function carregar() {
  if (estado) return estado;
  const arquivo = lerArquivo();
  estado = resolver({ ambiente: process.env, arquivo });
  for (const [chave, valor] of Object.entries(arquivo || {})) {
    if (!definido(process.env[chave]) && definido(valor)) process.env[chave] = valor;
  }
  return estado;
}

function valoresAtuais() {
  carregar();
  return resolver({ ambiente: process.env, arquivo: {} }).valores;
}

// Conexão com o MySQL usada pela API, pelo preparo do banco, pelo criar-admin e pelos testes.
function configBanco(valores = valoresAtuais()) {
  const lista = problemas(valores, ['DB_HOST', 'DB_PORT', 'DB_NAME']);
  if (lista.length) throw new ErroConfiguracao(lista.join('\n'));
  return {
    host: valores.DB_HOST,
    port: Number(valores.DB_PORT),
    user: valores.DB_USER,
    password: valores.DB_PASSWORD,
    database: valores.DB_NAME,
  };
}

function portaApi(valores = valoresAtuais()) {
  const lista = problemas(valores, ['PORT']);
  if (lista.length) throw new ErroConfiguracao(lista.join('\n'));
  return Number(valores.PORT);
}

// Erros comuns de quem salva o arquivo com outro nome ou em outra pasta (só nomes, nunca valores).
function avisosDoArquivo({ arquivoExiste }) {
  const avisos = [];
  if (!arquivoExiste) {
    avisos.push(`Arquivo ${ARQUIVO_ENV} não encontrado. Copie server/.env.example para server/.env e preencha a conexão (ou use o iniciador, que pergunta e cria o arquivo).`);
    for (const nome of ['.env.txt', 'env', '.env.example.txt']) {
      if (fs.existsSync(path.join(__dirname, nome))) {
        avisos.push(`Existe server/${nome}: o nome precisa ser exatamente ".env" (no Windows, confira se não ficou ".txt" no fim).`);
      }
    }
  }
  const doSite = lerArquivo(path.join(__dirname, '..', '.env'));
  if (doSite && Object.keys(doSite).some((chave) => chave.startsWith('DB_'))) {
    avisos.push('Há um .env com DB_* na pasta do site (fora de server/). A API não lê esse arquivo: passe as linhas para server/.env e apague-as de lá.');
  }
  return avisos;
}

// Resumo sem segredos: de onde veio a configuração, para onde a API vai conectar e conflitos.
function descrever(resolvido = carregar()) {
  const { valores, origens, encobertas, arquivoExiste } = resolvido;
  const linhas = [`Configuração: ${arquivoExiste ? ARQUIVO_ENV : `${ARQUIVO_ENV} (não encontrado)`}`];
  const estadoDe = (chave) => (definido(valores[chave]) ? 'definido' : 'vazio');
  linhas.push(
    `MySQL: ${valores.DB_HOST}:${valores.DB_PORT}, banco ${valores.DB_NAME} ` +
      `(usuário ${estadoDe('DB_USER')}, senha ${estadoDe('DB_PASSWORD') === 'definido' ? 'definida' : 'vazia'})`,
  );
  const porOrigem = {};
  for (const chave of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'PORT']) {
    (porOrigem[origens[chave]] ||= []).push(chave);
  }
  linhas.push(
    `Origem: ${Object.entries(porOrigem)
      .map(([origem, chaves]) => `${NOME_ORIGEM[origem]} (${chaves.join(', ')})`)
      .join('; ')}`,
  );
  for (const { chave, ambiente, arquivo } of encobertas) {
    linhas.push(
      OCULTOS.has(chave)
        ? `Atenção: ${chave} está definida numa variável de ambiente, que tem prioridade sobre server/.env (valores ocultos).`
        : `Atenção: ${chave} está definida numa variável de ambiente (${ambiente}), que tem prioridade sobre server/.env (${arquivo}).`,
    );
  }
  if (encobertas.length) {
    linhas.push('Para valer o que está em server/.env, remova essa variável do ambiente e inicie de novo (veja COMO-RODAR.md).');
  }
  return [...linhas, ...avisosDoArquivo(resolvido)];
}

// Mensagens para as falhas de conexão mais comuns, sempre com o endereço e a porta tentados.
function explicarErroBanco(erro, { host, port, database } = {}) {
  const onde = `${host}:${port}`;
  switch (erro?.code) {
    case 'ECONNREFUSED':
      return `Nada respondeu em ${onde}. O MySQL está ligado? DB_PORT, em server/.env, é a porta dele?`;
    case 'ER_ACCESS_DENIED_ERROR':
      return `O MySQL em ${onde} recusou o usuário ou a senha (DB_USER e DB_PASSWORD em server/.env).`;
    case 'ER_BAD_DB_ERROR':
      return `O banco ${database} não existe em ${onde}. Prepare o banco com o iniciador ou com "npm run preparar-banco".`;
    case 'ER_DBACCESS_DENIED_ERROR':
      return `O usuário do MySQL não tem permissão no banco ${database} (${onde}).`;
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `Endereço do MySQL não encontrado: ${host} (DB_HOST em server/.env).`;
    case 'ETIMEDOUT':
      return `O MySQL em ${onde} não respondeu a tempo.`;
    default:
      return `Não foi possível usar o MySQL em ${onde}: ${erro?.message || erro}`;
  }
}

module.exports = {
  ARQUIVO_ENV,
  PADROES,
  ErroConfiguracao,
  lerArquivo,
  resolver,
  problemas,
  carregar,
  configBanco,
  portaApi,
  descrever,
  explicarErroBanco,
};
