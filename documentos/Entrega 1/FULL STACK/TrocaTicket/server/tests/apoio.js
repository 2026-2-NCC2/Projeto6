// Apoio aos testes de integração.
//
// Os testes nunca usam o banco da equipe (DB_NAME). Cada arquivo de teste cria um banco
// temporário "trocaticket_teste_..." com os mesmos SQL do projeto, sobe a API nele numa porta
// livre e apaga o banco no fim. Basta um MySQL local cujo usuário (DB_USER/DB_PASSWORD em
// server/.env ou no ambiente) possa criar bancos. Sem isso, os testes de integração são pulados.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mysql = require('mysql2/promise');
const { prepararBanco } = require('../scripts/preparar-banco');

const PREFIXO = 'trocaticket_teste_';
const ORIGEM_SITE = 'http://127.0.0.1:4173';

function configMysql() {
  if (!process.env.DB_USER) return null;
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  };
}

const SEM_MYSQL =
  'sem MySQL configurado: defina DB_USER e DB_PASSWORD (server/.env ou ambiente) de um usuário que possa criar bancos';

async function conectar(extra = {}) {
  return mysql.createConnection({ ...configMysql(), ...extra });
}

async function criarBancoTemporario() {
  const nome = `${PREFIXO}${process.pid}_${Date.now().toString(36)}`;
  await prepararBanco({ ...configMysql(), database: nome });
  return {
    nome,
    async apagar() {
      const conexao = await conectar();
      try {
        await conexao.query(`DROP DATABASE IF EXISTS \`${nome}\``);
      } finally {
        await conexao.end();
      }
    },
  };
}

// Sobe a API (server.js) apontando para um banco temporário, numa porta livre.
async function iniciarApi(nomeBanco) {
  if (!nomeBanco.startsWith(PREFIXO)) throw new Error('A API de teste só usa bancos temporários.');
  const config = configMysql();
  Object.assign(process.env, {
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USER: config.user,
    DB_PASSWORD: config.password,
    DB_NAME: nomeBanco,
  });
  const app = require('../server');
  const pool = require('../db');
  const servidor = await new Promise((pronto) => {
    const s = app.listen(0, '127.0.0.1', () => pronto(s));
  });
  return {
    url: `http://127.0.0.1:${servidor.address().port}/api`,
    async fechar() {
      await new Promise((pronto) => servidor.close(pronto));
      await pool.end();
    },
  };
}

// Cliente HTTP que se comporta como o navegador: guarda o cookie de sessão, envia Origin e,
// nas gravações, o token CSRF recebido no login.
class Cliente {
  constructor(api) {
    this.api = api;
    this.cookie = null;
    this.csrf = null;
    this.setCookie = '';
  }

  async req(metodo, caminho, corpo, { origem = ORIGEM_SITE, csrf = true, cabecalhos = {} } = {}) {
    const headers = { ...cabecalhos };
    if (origem) headers.Origin = origem;
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookie) headers.Cookie = this.cookie;
    if (csrf && this.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(metodo)) {
      headers['X-CSRF-Token'] = this.csrf;
    }
    const resposta = await fetch(this.api + caminho, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    for (const linha of resposta.headers.getSetCookie()) {
      const [par] = linha.split(';');
      if (par.startsWith('tt_session=')) {
        this.cookie = par === 'tt_session=' ? null : par;
        this.setCookie = linha;
      }
    }
    const texto = await resposta.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {}
    return { status: resposta.status, json, headers: resposta.headers };
  }

  async entrar(email, senha) {
    const resposta = await this.req('POST', '/login', { email, senha });
    if (resposta.json?.csrfToken) this.csrf = resposta.json.csrfToken;
    return resposta;
  }

  async cadastrar(dados) {
    const resposta = await this.req('POST', '/usuarios', dados);
    if (resposta.json?.csrfToken) this.csrf = resposta.json.csrfToken;
    return resposta;
  }

  codigoDoCookie() {
    return this.cookie ? this.cookie.split('=')[1] : null;
  }
}

module.exports = {
  ORIGEM_SITE,
  SEM_MYSQL,
  Cliente,
  configMysql,
  conectar,
  criarBancoTemporario,
  iniciarApi,
};
