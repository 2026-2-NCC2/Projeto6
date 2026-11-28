// Prepara o banco MySQL da Entrega 1 a partir dos arquivos SQL versionados.
//
// - Banco inexistente: cria, aplica o SCRIPT_BANCO_V2.sql e as migrações.
// - Banco existente com as tabelas base: aplica só as migrações (podem ser reaplicadas).
// - Banco existente vazio: aplica o script base e as migrações.
// - Banco existente com outras tabelas, mas sem as do TrocaTicket: recusa, sem alterar nada.
// Nunca apaga tabelas nem dados. Usado pelo iniciador (scripts/iniciar.mjs) e pelos testes.
//
// Uso direto: npm run preparar-banco (na pasta do app ou em server/). Usa a mesma conexão da API:
// server/config.js, que lê server/.env de qualquer pasta (variáveis de ambiente têm prioridade).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const RAIZ_SERVIDOR = path.resolve(__dirname, '..');
const SCRIPT_PADRAO = path.resolve(
  RAIZ_SERVIDOR,
  '../../../../Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql',
);
// SCRIPT_BANCO (opcional) aponta outro SCRIPT_BANCO_V2.sql; caminho relativo vale a partir de server/.
function caminhoScriptBase(valor = process.env.SCRIPT_BANCO) {
  return valor ? path.resolve(RAIZ_SERVIDOR, valor) : SCRIPT_PADRAO;
}
const SCRIPT_BASE = caminhoScriptBase();
const MIGRACOES = [
  'MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql',
  'MIGRACAO_SESSAO_LOGIN.sql',
  'MIGRACAO_PEDIDOS_PAGAMENTOS.sql',
  'MIGRACAO_REPASSE.sql',
  'MIGRACAO_PORTARIA_ATENDIMENTO.sql',
  'MIGRACAO_ADMINISTRACAO.sql',
].map(
  (arquivo) => path.join(RAIZ_SERVIDOR, arquivo),
);

function nomeValido(nome) {
  return typeof nome === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(nome);
}

// Os arquivos fixam "CREATE DATABASE trocaticket" e "USE trocaticket". Aqui o banco é escolhido
// pela conexão, então essas linhas saem e o mesmo SQL serve para qualquer nome.
function semNomeFixo(sql) {
  return sql.replace(/^\s*(CREATE\s+DATABASE|USE)\s+[^;]+;.*$/gim, '');
}

function versaoSuportada(versao) {
  const [maior, menor, correcao] = String(versao).split(/[.-]/).map(Number);
  if (/mariadb/i.test(versao)) return maior > 10 || (maior === 10 && menor >= 5);
  return maior > 8 || (maior === 8 && (menor > 0 || correcao >= 16));
}

function ultimoResultado(resultado) {
  // Com multipleStatements, o retorno é uma lista; a conferência é o último SELECT do arquivo.
  const conjuntos = Array.isArray(resultado[0]) && !resultado[0].length ? [resultado[0]] : resultado[0];
  const selects = Array.isArray(conjuntos) ? conjuntos.filter(Array.isArray) : [];
  return selects.length ? selects[selects.length - 1] : [];
}

async function aplicarArquivo(conexao, arquivo, log) {
  if (!fs.existsSync(arquivo)) {
    throw new Error(`Arquivo SQL não encontrado: ${arquivo}`);
  }
  log(`Aplicando ${path.basename(arquivo)}...`);
  const resultado = await conexao.query(semNomeFixo(fs.readFileSync(arquivo, 'utf8')));
  return ultimoResultado(resultado);
}

async function prepararBanco(config, { log = () => {}, scriptBase = caminhoScriptBase() } = {}) {
  const { host = '127.0.0.1', port = 3306, user, password = '', database } = config;
  if (!user) throw new Error('Informe o usuário do MySQL.');
  if (!nomeValido(database)) {
    throw new Error('Nome de banco inválido: use só letras, números e _ (até 64 caracteres).');
  }
  const conexao = await mysql.createConnection({
    host,
    port: Number(port) || 3306,
    user,
    password,
    multipleStatements: true,
  });
  try {
    const [[{ versao }]] = await conexao.query('SELECT VERSION() AS versao');
    if (!versaoSuportada(versao)) {
      throw new Error(`Versão ${versao} não suportada. Use MySQL 8.0.16+ ou MariaDB 10.5+.`);
    }
    const [bancos] = await conexao.query(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [database],
    );
    const criado = !bancos.length;
    if (criado) {
      log(`Criando o banco ${database}...`);
      await conexao.query(`CREATE DATABASE \`${database}\``);
    }
    await conexao.query(`USE \`${database}\``);

    const [[{ base }]] = await conexao.query(
      `SELECT COUNT(*) AS base FROM information_schema.tables
        WHERE table_schema = ? AND table_name = 'usuario'`,
      [database],
    );
    let baseAplicada = false;
    if (!Number(base)) {
      const [[{ outras }]] = await conexao.query(
        'SELECT COUNT(*) AS outras FROM information_schema.tables WHERE table_schema = ?',
        [database],
      );
      if (Number(outras)) {
        throw new Error(
          `O banco ${database} já tem outras tabelas e não parece ser do TrocaTicket. ` +
            'Escolha outro nome de banco; nada foi alterado.',
        );
      }
      await aplicarArquivo(conexao, scriptBase, log);
      baseAplicada = true;
    }

    for (const arquivo of MIGRACOES) {
      const ausentes = await aplicarArquivo(conexao, arquivo, log);
      if (ausentes.length) {
        const lista = ausentes.map((linha) => Object.values(linha).join('.')).join(', ');
        throw new Error(`${path.basename(arquivo)} terminou com estruturas ausentes: ${lista}`);
      }
    }
    return { versao, criado, baseAplicada };
  } finally {
    await conexao.end();
  }
}

module.exports = { prepararBanco, nomeValido, semNomeFixo, versaoSuportada, caminhoScriptBase, SCRIPT_BASE };

if (require.main === module) {
  const config = require('../config');
  config.carregar();
  let alvo;
  try {
    alvo = config.configBanco();
  } catch (erro) {
    console.error(`Configuração inválida (${config.ARQUIVO_ENV}):\n${erro.message}`);
    process.exit(1);
  }
  if (!alvo.user) {
    console.error(`DB_USER está vazio. Preencha ${config.ARQUIVO_ENV} (copie server/.env.example) ou use o iniciador.`);
    process.exit(1);
  }
  console.log(`Preparando o banco ${alvo.database} em ${alvo.host}:${alvo.port} (configuração: ${config.ARQUIVO_ENV}).`);
  prepararBanco(alvo, { log: (mensagem) => console.log(mensagem) })
    .then(({ versao, criado, baseAplicada }) => {
      console.log(
        `Banco pronto (${versao}). ${criado ? 'Banco criado. ' : ''}${
          baseAplicada ? 'Tabelas base criadas. ' : 'Tabelas base já existiam. '
        }Migrações conferidas.`,
      );
    })
    .catch((error) => {
      console.error(error.code ? config.explicarErroBanco(error, alvo) : error.message);
      process.exitCode = 1;
    });
}
