import { idValido } from '../http.js';
import { criarServicoTransacoes } from './servico.js';

// O app fornece os mesmos middlewares de sessão, aprovação e CSRF dos outros
// módulos. Nenhuma identidade ou resultado do simulador vem do JSON enviado.
export function registrarTransacoes(router, { pool, auth, approved, admin, csrf }) {
  for (const middleware of [auth, approved, admin, csrf]) {
    if (typeof middleware !== 'function')
      throw new TypeError('Middlewares de autenticação/CSRF obrigatórios.');
  }
  const service = criarServicoTransacoes(pool);
  const id = (req) => idValido(req.params.id);
  const key = (req) => req.get('Idempotency-Key');
  const body = (req) => req.body ?? {};
  const send = (work) => async (req, res) => res.json(await work(req));
  const read = (path, work, permission = auth) => router.get(path, permission, send(work));
  const write = (method, path, work, permission = approved) =>
    router[method](path, permission, csrf, send(work));

  read('/ingressos', (req) => service.listTickets(req.user));
  read('/ingressos/:id/credencial', (req) => service.credential(req.user, id(req)), approved);
  read('/ingressos/:id/historico', (req) => service.ticketHistory(req.user, id(req)));
  read('/pedidos', (req) => service.listOrders(req.user));
  read('/pedidos/:id', (req) => service.getOrder(req.user, id(req)));
  write('post', '/pedidos', (req) => service.reservePrimary(req.user, key(req), body(req)));
  write('post', '/pedidos/:id/pagar', (req) => service.pay(req.user, key(req), id(req), body(req)));
  write('post', '/pedidos/:id/recuperar', (req) =>
    service.recover(req.user, key(req), id(req), body(req)),
  );
  write('post', '/pedidos/:id/estornar', (req) =>
    service.refund(req.user, key(req), id(req), body(req)),
  );
  write('post', '/pedidos/:id/cancelar', (req) =>
    service.cancelOrder(req.user, key(req), id(req), body(req)),
  );

  read('/anuncios', (req) =>
    service.listListings(
      req.user,
      req.query.eventId === undefined ? undefined : idValido(req.query.eventId),
    ),
  );
  write('post', '/anuncios', (req) => service.createListing(req.user, key(req), body(req)));
  write('delete', '/anuncios/:id', (req) =>
    service.cancelListing(req.user, key(req), id(req), body(req)),
  );
  write('post', '/anuncios/:id/reservar', (req) =>
    service.reserveListing(req.user, key(req), id(req), body(req)),
  );
  read('/fila', (req) => service.listQueue(req.user));
  write('post', '/fila', (req) => service.joinQueue(req.user, key(req), body(req)));
  write('delete', '/fila/:id', (req) => service.leaveQueue(req.user, key(req), id(req), body(req)));

  read('/transferencias', (req) => service.listInvitations(req.user));
  write('post', '/transferencias', (req) => service.invite(req.user, key(req), body(req)));
  for (const [path, action] of [
    ['aceitar', 'accept'],
    ['recusar', 'reject'],
    ['cancelar', 'cancel'],
  ]) {
    write('post', `/transferencias/:id/${path}`, (req) =>
      service.respondInvitation(req.user, key(req), id(req), action, body(req)),
    );
  }
  write('post', '/portaria', (req) => service.enter(req.user, key(req), body(req)));
  write('post', '/eventos/:id/cancelar', (req) =>
    service.cancelEvent(req.user, key(req), id(req), body(req)),
  );
  read('/atendimentos', (req) => service.listSupport(req.user));
  write('post', '/atendimentos', (req) => service.createSupport(req.user, key(req), body(req)));
  write(
    'post',
    '/atendimentos/:id/respostas',
    (req) => service.answerSupport(req.user, key(req), id(req), body(req)),
    admin,
  );
  read('/demo/config', (req) => service.getConfig(req.user), admin);
  write('patch', '/demo/config', (req) => service.configure(req.user, key(req), body(req)), admin);
  return service;
}
