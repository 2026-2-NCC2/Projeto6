// Sessões de login — etapa 1 da integração com a TrocaTicket 2.0.
//
// Baseado em documentos/Site/TrocaTicket 2.0/server/src/auth.js, adaptado ao banco da main
// (tabela sessao criada por MIGRACAO_SESSAO_LOGIN.sql) e ao formato de respostas da API atual.
//
// Como funciona:
// - no login, o servidor cria um código aleatório, guarda no banco só o resumo SHA-256 dele
//   e envia o código num cookie httpOnly (o JavaScript do site não consegue lê-lo);
// - a cada requisição, o cookie identifica o usuário em req.user;
// - gravações (POST/PUT/PATCH/DELETE) exigem sessão válida e o cabeçalho X-CSRF-Token;
// - as rotas que recebem um ID de usuário só aceitam o ID da própria conta logada.

const crypto = require('crypto');
const bcrypt = require('bcrypt');

const COOKIE = 'tt_session';
const HORAS_SESSAO = Number(process.env.SESSION_HOURS) > 0 ? Number(process.env.SESSION_HOURS) : 8;
const COOKIE_SEGURO = process.env.COOKIE_SECURE === 'true';
const ORIGENS_PADRAO = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_TENTATIVAS = 10;
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;
const PERFIS = { 1: 'comprador', 2: 'organizador', 3: 'fornecedor', 4: 'admin' };

const resumo = (valor) => crypto.createHash('sha256').update(valor).digest('hex');

function origensPermitidas() {
  const lista = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ORIGENS_PADRAO;
  return new Set(lista.map((origem) => origem.trim()).filter(Boolean));
}

function lerCookie(req) {
  const parte = (req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${COOKIE}=`));
  const valor = parte?.slice(COOKIE.length + 1);
  return valor && /^[A-Za-z0-9_-]{43}$/.test(valor) ? valor : null;
}

function opcoesCookie() {
  return { httpOnly: true, sameSite: 'lax', secure: COOKIE_SEGURO, path: '/api' };
}

function usuarioDaSessao(row) {
  return {
    id: Number(row.id),
    nome: row.nome,
    email: row.email,
    foto: row.url_foto_perfil || null,
    tipo_perfil: Number(row.tipo_perfil),
    role: PERFIS[row.tipo_perfil] || 'comprador',
    // A aprovada, P aguardando a administração, R recusada (etapa 6).
    aprovacao: row.status_aprovacao || 'P',
  };
}

function iguaisSemVazarTempo(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

function criarSessoes(db) {
  const origens = origensPermitidas();
  const tentativas = new Map();
  let resumoFalso;

  // Bloqueia sites de fora: uma origem desconhecida não usa a API pelo navegador.
  function protegerOrigem(req, res, next) {
    const origem = req.get('Origin');
    if (origem && !origens.has(origem)) {
      return res.status(403).json({ error: 'Origem não permitida.', code: 'ORIGIN' });
    }
    next();
  }

  const corsOptions = {
    origin: (origem, done) => done(null, !origem || origens.has(origem)),
    credentials: true,
  };

  async function carregarSessao(req, res, next) {
    req.user = null;
    const codigo = lerCookie(req);
    if (!codigo) return next();
    try {
      const [rows] = await db.execute(
        `SELECT u.id, u.nome, u.email, u.url_foto_perfil, u.tipo_perfil, u.status_aprovacao, s.csrf_token
           FROM sessao s JOIN usuario u ON u.id = s.usuario_id
          WHERE s.id_hash = ? AND s.revogada_em IS NULL AND s.expira_em > UTC_TIMESTAMP()`,
        [resumo(codigo)],
      );
      if (rows.length) {
        req.user = usuarioDaSessao(rows[0]);
        req.csrfToken = rows[0].csrf_token;
        req.sessaoHash = resumo(codigo);
      }
    } catch (error) {
      console.error('Erro ao carregar a sessão (a tabela sessao foi criada?):', error.message);
    }
    next();
  }

  // Cadastro e login são as únicas gravações sem sessão.
  function gravacaoPublica(req) {
    return req.method === 'POST' && (req.path === '/api/login' || req.path === '/api/usuarios');
  }

  function protegerGravacoes(req, res, next) {
    if (METODOS_SEGUROS.has(req.method) || !req.path.startsWith('/api/') || gravacaoPublica(req)) {
      return next();
    }
    if (!req.user) {
      return res.status(401).json({
        error: 'Sua sessão terminou ou você ainda não entrou. Entre novamente.',
        code: 'UNAUTHENTICATED',
      });
    }
    const enviado = req.get('X-CSRF-Token');
    if (!enviado || !/^[a-f0-9]{64}$/.test(enviado) || !iguaisSemVazarTempo(enviado, req.csrfToken)) {
      return res.status(403).json({
        error: 'Sessão de formulário inválida. Recarregue a página e tente novamente.',
        code: 'CSRF',
      });
    }
    next();
  }

  // Usado pelas rotas que recebem o ID da conta: só a própria conta logada passa.
  // Gravações de contas ainda não aprovadas (ou recusadas) pela administração são recusadas.
  function exigirAprovacao(res) {
    const user = res.req.user;
    if (user?.aprovacao === 'A') return true;
    res.status(403).json({
      error:
        user?.aprovacao === 'R'
          ? 'Sua conta foi recusada pela administração e esta ação continua bloqueada. O motivo aparece no aviso da sua conta.'
          : 'Sua conta aguarda aprovação da administração. Esta ação fica liberada depois da aprovação.',
      code: 'APPROVAL_REQUIRED',
    });
    return false;
  }

  function exigirPropriaConta(res, userId) {
    const user = res.req.user;
    if (!user) {
      res.status(401).json({
        error: 'Sua sessão terminou ou você ainda não entrou. Entre novamente.',
        code: 'UNAUTHENTICATED',
      });
      return false;
    }
    if (user.id !== Number(userId)) {
      res.status(403).json({
        error: 'Esta operação só pode ser feita pela própria conta.',
        code: 'FORBIDDEN',
      });
      return false;
    }
    return true;
  }

  function limitarTentativas(req, email) {
    const agora = Date.now();
    for (const [chave, item] of tentativas) if (item.ate < agora) tentativas.delete(chave);
    const chave = `${req.ip}:${String(email).toLowerCase()}`;
    const item = tentativas.get(chave) || { quantidade: 0, ate: agora + JANELA_TENTATIVAS_MS };
    if (item.quantidade >= MAX_TENTATIVAS) return { bloqueado: true, chave };
    item.quantidade += 1;
    tentativas.set(chave, item);
    return { bloqueado: false, chave };
  }

  function liberarTentativas(chave) {
    tentativas.delete(chave);
  }

  // Confere a senha. Registros antigos com senha em texto puro (inseridos à mão no banco)
  // ainda entram, mas a senha é convertida para bcrypt no mesmo momento.
  async function conferirSenha(senha, usuario) {
    if (typeof senha !== 'string') return false;
    if (!usuario) {
      resumoFalso ||= bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      await bcrypt.compare(senha, await resumoFalso);
      return false;
    }
    const guardada = String(usuario.senha_hash || '');
    if (/^\$2[aby]\$\d{2}\$/.test(guardada)) return bcrypt.compare(senha, guardada);
    if (!iguaisSemVazarTempo(senha, guardada)) return false;
    await db.execute('UPDATE usuario SET senha_hash = ? WHERE id = ?', [
      await bcrypt.hash(senha, 10),
      usuario.id,
    ]);
    return true;
  }

  async function criarSessao(req, res, userId) {
    // Evita fixação de sessão: um cookie anterior nunca vira a sessão autenticada.
    const anterior = lerCookie(req);
    if (anterior) {
      await db.execute('UPDATE sessao SET revogada_em = UTC_TIMESTAMP() WHERE id_hash = ?', [
        resumo(anterior),
      ]);
    }
    await db.execute(
      'DELETE FROM sessao WHERE expira_em < UTC_TIMESTAMP() - INTERVAL 7 DAY',
    );
    const codigo = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('hex');
    await db.execute(
      `INSERT INTO sessao (id_hash, usuario_id, csrf_token, criada_em, expira_em)
       VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? HOUR)`,
      [resumo(codigo), userId, csrfToken, HORAS_SESSAO],
    );
    res.cookie(COOKIE, codigo, { ...opcoesCookie(), maxAge: HORAS_SESSAO * 3600 * 1000 });
    const [rows] = await db.execute(
      'SELECT id, nome, email, url_foto_perfil, tipo_perfil, status_aprovacao FROM usuario WHERE id = ?',
      [userId],
    );
    return { user: usuarioDaSessao(rows[0]), csrfToken };
  }

  async function encerrarSessao(req, res) {
    if (req.sessaoHash) {
      await db.execute('UPDATE sessao SET revogada_em = UTC_TIMESTAMP() WHERE id_hash = ?', [
        req.sessaoHash,
      ]);
    }
    res.clearCookie(COOKIE, opcoesCookie());
  }

  // Depois de trocar a senha, as outras sessões da conta deixam de valer.
  async function encerrarOutrasSessoes(req, userId) {
    await db.execute(
      `UPDATE sessao SET revogada_em = UTC_TIMESTAMP()
        WHERE usuario_id = ? AND revogada_em IS NULL AND id_hash <> ?`,
      [userId, req.sessaoHash || ''],
    );
  }

  return {
    protegerOrigem,
    corsOptions,
    carregarSessao,
    protegerGravacoes,
    exigirPropriaConta,
    exigirAprovacao,
    limitarTentativas,
    liberarTentativas,
    conferirSenha,
    criarSessao,
    encerrarSessao,
    encerrarOutrasSessoes,
  };
}

module.exports = { criarSessoes };
