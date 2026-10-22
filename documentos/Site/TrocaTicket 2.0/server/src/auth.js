import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hashSenha, conferirSenha } from './passwords.js';
import { transacao } from './db.js';
import { ErroHttp, exigir, semPrivilegios, texto, urlImagem } from './http.js';

const roles = { comprador: 1, organizador: 2, fornecedor: 3 };
const nomes = { 1: 'comprador', 2: 'organizador', 3: 'fornecedor' };
const tokenHash = (value) => createHash('sha256').update(value).digest('hex');
const cookieName = 'tt_session';
const usuarioSql = `SELECT u.id,u.nome,u.email,u.senha_hash,u.url_foto_perfil,u.tipo_perfil,u.status_aprovacao,
  (a.usuario_id IS NOT NULL) AS is_admin FROM usuario u LEFT JOIN administrador_detalhes a ON a.usuario_id=u.id`;

export function usuarioPublico(row) {
  return {
    id: row.id,
    name: row.nome,
    email: row.email,
    role: nomes[row.tipo_perfil],
    admin: Boolean(row.is_admin),
    approval: row.status_aprovacao,
    photo: row.url_foto_perfil,
  };
}
export function emailValido(value) {
  const email = texto(value, 'Email', 254).toLowerCase();
  exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Informe um email válido.');
  return email;
}
export function senhaValida(value) {
  exigir(
    typeof value === 'string' && value.length >= 10 && value.length <= 128,
    'A senha deve ter de 10 a 128 caracteres.',
  );
  return value;
}
function lerCookie(req) {
  const part = (req.headers.cookie || '')
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`));
  const value = part?.slice(cookieName.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

export function criarAuth(pool, config = {}) {
  const router = express.Router();
  const attempts = new Map();
  let dummyHash;
  const horas = config.sessionHours || 8;

  async function criarSessao(req, res, userId) {
    // Evita fixação: uma sessão recebida nunca vira a sessão autenticada.
    const antiga = lerCookie(req);
    if (antiga)
      await pool.execute('UPDATE sessao SET revogada_em=UTC_TIMESTAMP(3) WHERE id_hash=?', [
        tokenHash(antiga),
      ]);
    const raw = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('hex');
    await pool.execute(
      'INSERT INTO sessao(id_hash,usuario_id,csrf_token,expira_em) VALUES(?,?,?,TIMESTAMPADD(HOUR,?,UTC_TIMESTAMP(3)))',
      [tokenHash(raw), userId, csrfToken, horas],
    );
    res.cookie(cookieName, raw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(config.secureCookies),
      path: '/api',
      maxAge: horas * 3600000,
    });
    const [[row]] = await pool.execute(`${usuarioSql} WHERE u.id=?`, [userId]);
    return { user: usuarioPublico(row), csrfToken };
  }
  async function loadSession(req, res, next) {
    const raw = lerCookie(req);
    req.user = null;
    if (raw) {
      const [[session]] = await pool.execute(
        'SELECT usuario_id,csrf_token FROM sessao WHERE id_hash=? AND revogada_em IS NULL AND expira_em>UTC_TIMESTAMP(3)',
        [tokenHash(raw)],
      );
      if (session) {
        const [[user]] = await pool.execute(`${usuarioSql} WHERE u.id=?`, [session.usuario_id]);
        if (user) {
          req.user = usuarioPublico(user);
          req.csrfToken = session.csrf_token;
          req.sessionHash = tokenHash(raw);
        }
      }
    }
    next();
  }
  function requireAuth(req, res, next) {
    if (!req.user)
      return next(new ErroHttp(401, 'Entre na sua conta fictícia.', 'UNAUTHENTICATED'));
    next();
  }
  function requireApproved(req, res, next) {
    if (!req.user) return requireAuth(req, res, next);
    if (req.user.approval !== 'A')
      return next(
        new ErroHttp(403, 'Sua conta aguarda aprovação ou foi recusada.', 'APPROVAL_REQUIRED'),
      );
    next();
  }
  function requireAdmin(req, res, next) {
    requireApproved(req, res, (error) => {
      if (error) return next(error);
      if (!req.user.admin)
        return next(new ErroHttp(403, 'Acesso exclusivo da administração.', 'FORBIDDEN'));
      next();
    });
  }
  function requireCsrf(req, res, next) {
    const sent = req.get('X-CSRF-Token');
    if (
      !req.user ||
      !sent ||
      !/^[a-f0-9]{64}$/.test(sent) ||
      !req.csrfToken ||
      !timingSafeEqual(Buffer.from(sent), Buffer.from(req.csrfToken))
    )
      return next(
        new ErroHttp(403, 'Sessão de formulário inválida. Recarregue e tente novamente.', 'CSRF'),
      );
    next();
  }
  function limitarLogin(req, email) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const key = `${req.ip}:${email}`;
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    exigir(entry.count < 10, 'Muitas tentativas. Aguarde alguns minutos.', 429, 'RATE_LIMIT');
    entry.count++;
    attempts.set(key, entry);
    return key;
  }
  router.get('/session', (req, res) =>
    res.json({ user: req.user, csrfToken: req.csrfToken || null }),
  );
  router.post('/register', async (req, res) => {
    semPrivilegios(req.body);
    const name = texto(req.body.name, 'Nome', 255, 3),
      email = emailValido(req.body.email);
    const role = req.body.role;
    exigir(Object.hasOwn(roles, role), 'Escolha participante, organizador ou fornecedor.');
    limitarLogin(req, email);
    const password = senhaValida(req.body.password),
      hash = await hashSenha(password);
    const userId = await transacao(pool, async (db) => {
      const [result] = await db.execute(
        'INSERT INTO usuario(nome,email,senha_hash,tipo_perfil,status_aprovacao) VALUES(?,?,?,?,?)',
        [name, email, hash, roles[role], role === 'comprador' ? 'A' : 'P'],
      );
      if (role === 'organizador')
        await db.execute('INSERT INTO organizador_detalhes(usuario_id) VALUES(?)', [
          result.insertId,
        ]);
      if (role === 'fornecedor')
        await db.execute('INSERT INTO fornecedor_detalhes(usuario_id) VALUES(?)', [
          result.insertId,
        ]);
      await db.execute('INSERT INTO mvp_perfil(usuario_id) VALUES(?)', [result.insertId]);
      return result.insertId;
    });
    res.status(201).json(await criarSessao(req, res, userId));
  });
  router.post('/login', async (req, res) => {
    const email = emailValido(req.body.email),
      key = limitarLogin(req, email);
    const [[row]] = await pool.execute(`${usuarioSql} WHERE u.email=?`, [email]);
    if (!dummyHash) dummyHash = hashSenha(randomBytes(32).toString('hex'));
    const accepted = await conferirSenha(req.body.password, row?.senha_hash || (await dummyHash));
    exigir(row && accepted, 'Email ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
    attempts.delete(key);
    res.json(await criarSessao(req, res, row.id));
  });
  router.post('/logout', requireAuth, requireCsrf, async (req, res) => {
    await pool.execute('UPDATE sessao SET revogada_em=UTC_TIMESTAMP(3) WHERE id_hash=?', [
      req.sessionHash,
    ]);
    res.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api',
      secure: Boolean(config.secureCookies),
    });
    res.status(204).end();
  });

  async function getPerfil(id) {
    const [[row]] = await pool.execute(`${usuarioSql} WHERE u.id=?`, [id]);
    const [[extra]] = await pool.execute(
      'SELECT phone,description FROM mvp_perfil WHERE usuario_id=?',
      [id],
    );
    return {
      ...usuarioPublico(row),
      phone: extra?.phone || '',
      description: extra?.description || '',
    };
  }
  async function putPerfil(req, res) {
    semPrivilegios(req.body);
    exigir(!Object.hasOwn(req.body, 'role'), 'O perfil principal não pode ser alterado neste MVP.');
    const previous = await getPerfil(req.user.id);
    const name = Object.hasOwn(req.body, 'name')
      ? texto(req.body.name, 'Nome', 255, 3)
      : previous.name;
    const email = Object.hasOwn(req.body, 'email') ? emailValido(req.body.email) : previous.email;
    const photo = Object.hasOwn(req.body, 'photo') ? urlImagem(req.body.photo) : previous.photo;
    const phone = Object.hasOwn(req.body, 'phone')
      ? String(req.body.phone || '').trim()
      : previous.phone;
    exigir(
      phone.length <= 20 && (!phone || /^[+\d()\s-]+$/.test(phone)),
      'Telefone fictício inválido.',
    );
    const description = Object.hasOwn(req.body, 'description')
      ? String(req.body.description || '').trim()
      : previous.description;
    exigir(description.length <= 500, 'Descrição deve ter até 500 caracteres.');
    let hash;
    if (req.body.password) {
      const [[row]] = await pool.execute('SELECT senha_hash FROM usuario WHERE id=?', [
        req.user.id,
      ]);
      exigir(
        await conferirSenha(req.body.currentPassword, row.senha_hash),
        'Senha atual incorreta.',
        403,
      );
      hash = await hashSenha(senhaValida(req.body.password));
    }
    await transacao(pool, async (db) => {
      await db.execute('UPDATE usuario SET nome=?,email=?,url_foto_perfil=? WHERE id=?', [
        name,
        email,
        photo,
        req.user.id,
      ]);
      await db.execute('UPDATE mvp_perfil SET phone=?,description=? WHERE usuario_id=?', [
        phone || null,
        description,
        req.user.id,
      ]);
      if (hash) {
        await db.execute('UPDATE usuario SET senha_hash=? WHERE id=?', [hash, req.user.id]);
        await db.execute(
          'UPDATE sessao SET revogada_em=UTC_TIMESTAMP(3) WHERE usuario_id=? AND id_hash<>? AND revogada_em IS NULL',
          [req.user.id, req.sessionHash],
        );
      }
    });
    res.json(await getPerfil(req.user.id));
  }
  return {
    router,
    loadSession,
    requireAuth,
    requireApproved,
    requireAdmin,
    requireCsrf,
    getPerfil,
    putPerfil,
  };
}
