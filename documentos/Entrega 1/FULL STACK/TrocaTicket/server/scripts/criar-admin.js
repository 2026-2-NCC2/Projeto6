// Cria uma conta de administração (etapa 6 da integração com a TrocaTicket 2.0).
//
// O site nunca cria administradores: o cadastro só aceita usuário, organizador e fornecedor.
// Uma conta de administração nasce só por este script, rodado por quem tem acesso ao servidor e
// ao banco. A conta já nasce aprovada e a decisão fica no histórico (aprovacao_conta).
//
// Uso, na pasta server:   npm run criar-admin
//   Pergunta nome, e-mail e senha (a senha não aparece na tela) e usa o banco do server/.env.
// Para automação e testes: CRIAR_ADMIN_NOME, CRIAR_ADMIN_EMAIL e CRIAR_ADMIN_SENHA no ambiente.
// A senha nunca é gravada em arquivo; no banco fica só o hash bcrypt.

const readline = require('readline');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

class ErroAdmin extends Error {}

// Confere os dados antes de tocar no banco. A senha da administração é mais exigente.
function validarDadosAdmin({ nome, email, senha }) {
  const nomeLimpo = String(nome ?? '').trim();
  const emailLimpo = String(email ?? '').trim().toLowerCase();
  const senhaTexto = String(senha ?? '');
  if (nomeLimpo.length < 3 || nomeLimpo.length > 255) throw new ErroAdmin('O nome deve ter de 3 a 255 caracteres.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo) || emailLimpo.length > 191) {
    throw new ErroAdmin('Informe um e-mail válido.');
  }
  if (senhaTexto.length < 10 || !/[A-Za-z]/.test(senhaTexto) || !/\d/.test(senhaTexto)) {
    throw new ErroAdmin('A senha da administração deve ter pelo menos 10 caracteres, com letras e números.');
  }
  return { nome: nomeLimpo, email: emailLimpo, senha: senhaTexto };
}

// Cria a conta numa transação. Recusa e-mail que já tenha conta (não promove contas existentes).
async function criarAdministrador(configBanco, dados) {
  const { nome, email, senha } = validarDadosAdmin(dados);
  const hash = await bcrypt.hash(senha, 10);
  const conexao = await mysql.createConnection({
    host: configBanco.host || '127.0.0.1',
    port: Number(configBanco.port) || 3306,
    user: configBanco.user,
    password: configBanco.password || '',
    database: configBanco.database,
  });
  try {
    await conexao.beginTransaction();
    const [existentes] = await conexao.execute('SELECT id FROM usuario WHERE email = ? FOR UPDATE', [email]);
    if (existentes.length) {
      throw new ErroAdmin('Já existe uma conta com este e-mail. Use outro e-mail para a administração.');
    }
    const [conta] = await conexao.execute(
      "INSERT INTO usuario (nome, email, senha_hash, tipo_perfil, status_aprovacao) VALUES (?, ?, ?, 4, 'A')",
      [nome, email, hash],
    );
    await conexao.execute('INSERT INTO administrador_detalhes (usuario_id) VALUES (?)', [conta.insertId]);
    await conexao.execute(
      `INSERT INTO aprovacao_conta (usuario_id, admin_id, situacao, motivo, criado_em)
       VALUES (?, NULL, 'A', 'Conta de administração criada pelo script do servidor', UTC_TIMESTAMP())`,
      [conta.insertId],
    );
    await conexao.commit();
    return { id: conta.insertId, nome, email };
  } catch (error) {
    await conexao.rollback().catch(() => {});
    if (error instanceof ErroAdmin) throw error;
    if (error.code === 'ER_NO_SUCH_TABLE') {
      throw new ErroAdmin('O banco ainda não está preparado. Rode antes: npm run preparar-banco');
    }
    throw error;
  } finally {
    await conexao.end();
  }
}

// Pergunta no terminal; com "oculto", o que é digitado não aparece (mesma ideia do iniciador).
// As linhas são lidas em fila, então funciona também com as respostas redirecionadas de um arquivo.
function criarLeitor() {
  const tty = Boolean(process.stdin.isTTY);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
  const linhas = rl[Symbol.asyncIterator]();
  let mudo = false;
  const escrever = rl._writeToOutput?.bind(rl);
  if (escrever) rl._writeToOutput = (texto) => (mudo ? undefined : escrever(texto));
  async function perguntar(texto, { oculto = false } = {}) {
    rl.setPrompt(`${texto}: `);
    rl.prompt();
    mudo = oculto && tty;
    try {
      const { value, done } = await linhas.next();
      if (done) throw new ErroAdmin('A entrada terminou antes de todas as respostas. Nada foi gravado.');
      return oculto ? value.replace(/\r$/, '') : value.trim();
    } finally {
      if (mudo) process.stdout.write('\n');
      else if (!tty) process.stdout.write('\n');
      mudo = false;
    }
  }
  return { perguntar, fechar: () => rl.close() };
}

async function principal() {
  // Mesma conexão da API (server/config.js lê server/.env de qualquer pasta).
  const config = require('../config');
  config.carregar();
  let configBanco;
  try {
    configBanco = config.configBanco();
  } catch (erro) {
    throw new ErroAdmin(`Configuração inválida (${config.ARQUIVO_ENV}):\n${erro.message}`);
  }
  if (!configBanco.user) {
    throw new ErroAdmin('Configure o banco antes (server/.env). O iniciador faz isso na primeira vez que roda.');
  }
  let { CRIAR_ADMIN_NOME: nome, CRIAR_ADMIN_EMAIL: email, CRIAR_ADMIN_SENHA: senha } = process.env;
  if (!nome || !email || !senha) {
    const leitor = criarLeitor();
    try {
      console.log(`Criar conta de administração no banco "${configBanco.database}".`);
      nome = nome || (await leitor.perguntar('Nome'));
      email = email || (await leitor.perguntar('E-mail'));
      senha = senha || (await leitor.perguntar('Senha (mínimo 10 caracteres, com letras e números)', { oculto: true }));
      const confirmacao = process.env.CRIAR_ADMIN_SENHA
        ? senha
        : await leitor.perguntar('Repita a senha', { oculto: true });
      if (confirmacao !== senha) throw new ErroAdmin('As senhas não conferem.');
    } finally {
      leitor.fechar();
    }
  }
  const conta = await criarAdministrador(configBanco, { nome, email, senha });
  console.log(`Conta de administração criada (nº ${conta.id}) para ${conta.email}. Entre pelo site com esse e-mail.`);
}

module.exports = { criarAdministrador, validarDadosAdmin, ErroAdmin };

if (require.main === module) {
  principal().catch((error) => {
    if (error instanceof ErroAdmin) console.error(error.message);
    else if (error.code) {
      const config = require('../config');
      console.error(`Não foi possível criar a conta: ${config.explicarErroBanco(error, config.configBanco())}`);
    } else console.error(`Não foi possível criar a conta: ${error.message}`);
    process.exitCode = 1;
  });
}
