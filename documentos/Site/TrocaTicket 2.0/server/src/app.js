import express from 'express';
import cors from 'cors';
import { criarAuth } from './auth.js';
import { criarCatalogo } from './catalog.js';
import { criarB2B } from './b2b.js';
import { ErroHttp, exigir, idValido } from './http.js';
import { registrarTransacoes } from './transacoes/rotas.js';

const localOrigins = [
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
];
export function criarApp({ pool, config = {} }) {
  const app = express(),
    auth = criarAuth(pool, config),
    api = express.Router();
  const origins = new Set(config.origins || localOrigins);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'Cache-Control': 'no-store',
    });
    const origin = req.get('Origin');
    if (origin && !origins.has(origin))
      return next(new ErroHttp(403, 'Origem não permitida.', 'ORIGIN'));
    // Escritas exigem Origin de um frontend local conhecido, inclusive login/cadastro.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !origin)
      return next(new ErroHttp(403, 'Informe uma origem local permitida.', 'ORIGIN'));
    next();
  });
  app.use(
    cors({
      origin: (origin, done) => done(null, !origin || origins.has(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
    )
      return next(new ErroHttp(400, 'Envie um objeto JSON.', 'JSON'));
    next();
  });
  api.get('/saude', async (req, res) => {
    try {
      await pool.execute('SELECT 1');
      res.json({ status: 'ok', banco: 'conectado', academic: true });
    } catch {
      res.status(503).json({ error: 'Banco local indisponível.', code: 'DATABASE_UNAVAILABLE' });
    }
  });
  api.use(auth.loadSession);
  api.use('/auth', auth.router);
  api.get('/perfil', auth.requireAuth, async (req, res) =>
    res.json(await auth.getPerfil(req.user.id)),
  );
  api.put('/perfil', auth.requireAuth, auth.requireCsrf, auth.putPerfil);
  api.get('/admin/usuarios', auth.requireAdmin, async (req, res) => {
    const [rows] =
      await pool.execute(`SELECT u.id,u.nome AS name,u.email,u.tipo_perfil AS type,u.status_aprovacao AS approval,(a.usuario_id IS NOT NULL) AS admin
     FROM usuario u LEFT JOIN administrador_detalhes a ON a.usuario_id=u.id ORDER BY u.id`);
    res.json(
      rows.map((row) => ({
        ...row,
        role: { 1: 'comprador', 2: 'organizador', 3: 'fornecedor' }[row.type],
        admin: Boolean(row.admin),
      })),
    );
  });
  api.patch(
    '/admin/usuarios/:id/aprovacao',
    auth.requireAdmin,
    auth.requireCsrf,
    async (req, res) => {
      const id = idValido(req.params.id),
        approval = req.body.approval;
      exigir(
        Object.keys(req.body).every((key) => key === 'approval') &&
          ['A', 'P', 'R'].includes(approval),
        'Informe somente o estado A, P ou R.',
      );
      exigir(
        id !== req.user.id || approval === 'A',
        'O administrador não pode bloquear a própria conta.',
        409,
      );
      const [result] = await pool.execute('UPDATE usuario SET status_aprovacao=? WHERE id=?', [
        approval,
        id,
      ]);
      exigir(result.affectedRows > 0, 'Conta não encontrada.', 404);
      res.json({ id, approval });
    },
  );
  api.use(criarCatalogo(pool, auth));
  api.use(criarB2B(pool, auth));
  const service = registrarTransacoes(api, {
    pool,
    auth: auth.requireAuth,
    approved: auth.requireApproved,
    admin: auth.requireAdmin,
    csrf: auth.requireCsrf,
  });
  app.locals.transacoes = service;
  app.use('/api', api);
  app.use((req, res, next) => next(new ErroHttp(404, 'Rota não encontrada.', 'NOT_FOUND')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'JSON inválido.', code: 'JSON' });
    if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code || 'VALIDATION' });
    if (error.code === 'ER_DUP_ENTRY')
      return res.status(409).json({
        error: 'Este registro já existe ou a operação já foi realizada.',
        code: 'CONFLICT',
      });
    if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code))
      return res.status(409).json({
        error: 'Outra operação está em andamento. Tente novamente com a mesma chave.',
        code: 'RETRY',
      });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'JSON excede o tamanho permitido.', code: 'PAYLOAD' });
    // Nem mensagem do driver nem stack, query, senha ou hash saem pela resposta.
    res
      .status(500)
      .json({ error: 'Não foi possível concluir a operação no banco local.', code: 'INTERNAL' });
  });
  return app;
}
