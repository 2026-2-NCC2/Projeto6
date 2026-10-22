import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campos,
  chaveIdempotente,
  hash,
  hashPayload,
  inteiro,
  novaCredencial,
  tetoRepasse,
  validarPrecoRepasse,
} from '../src/transacoes/regras.js';
import { EmissorSimulado, PagamentoSimulado } from '../src/transacoes/simuladores.js';
import { registrarTransacoes } from '../src/transacoes/rotas.js';

const fails = (work, status) => assert.throws(work, (error) => error.status === status);

test('repasse 100 → 70 reduz o teto; presente não permite novo preço oneroso', () => {
  assert.equal(validarPrecoRepasse(7000, 10000, 10000), 7000);
  assert.equal(tetoRepasse(10000, 7000), 7000);
  fails(() => validarPrecoRepasse(7001, 10000, 7000), 409);
  fails(() => validarPrecoRepasse(40000, 10000, 10000), 409);
  assert.equal(tetoRepasse(10000, 0), 0);
  fails(() => validarPrecoRepasse(1, 10000, 0), 409);
});

test('preço é centavo inteiro positivo; gratuidade segue convite separado', () => {
  for (const value of [-1, 0, 1.5, NaN, Infinity, '7000', null, undefined, 2147483648])
    fails(() => validarPrecoRepasse(value, 10000, 10000), 400);
  assert.equal(inteiro(0, 'Preço', 0), 0);
});

test('payload não pode escolher dono, preço da compra, aprovação ou resultado de simulador', () => {
  for (const key of ['userId', 'ownerId', 'admin', 'priceCents', 'status', 'paymentState'])
    fails(
      () =>
        campos({ categoryId: 1, quantity: 1, [key]: 1 }, [
          'categoryId',
          'quantity',
          'halfDeclaration',
        ]),
      400,
    );
  for (const value of [null, [], 1, '']) fails(() => campos(value, []), 400);
});

test('hash idempotente é estável para ordem de campos e distingue conteúdo/operação', () => {
  assert.equal(
    hashPayload('reserve', { quantity: 1, categoryId: 2 }),
    hashPayload('reserve', { categoryId: 2, quantity: 1 }),
  );
  assert.notEqual(hashPayload('reserve', { quantity: 1 }), hashPayload('reserve', { quantity: 2 }));
  assert.notEqual(hashPayload('reserve', {}), hashPayload('pay', {}));
  assert.equal(chaveIdempotente('demo-reserva-0001'), 'demo-reserva-0001');
  for (const key of [undefined, '', 'curta', ' '.repeat(16), 'á'.repeat(20), 'a'.repeat(121)])
    fails(() => chaveIdempotente(key), 400);
});

test('credencial opaca contém 256 bits aleatórios e revogação guarda seu hash', () => {
  const first = novaCredencial(),
    second = novaCredencial();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.match(hash(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hash(first), first);
});

test('pagamento local separa os cenários e nunca cobra dinheiro real', () => {
  const payment = new PagamentoSimulado();
  for (const scenario of ['approved', 'rejected', 'unavailable'])
    assert.deepEqual(payment.confirmar(scenario, 10000), {
      state: scenario,
      realChargeCents: 0,
      academic: true,
    });
  assert.equal(payment.confirmar('rejected', 0).state, 'approved');
  fails(() => payment.confirmar('status-do-cliente', 10000), 400);
  fails(() => payment.confirmar('approved', 10.1), 400);
});

test('emissor local mantém falha temporária distinta de entrega concluída', () => {
  const issuer = new EmissorSimulado();
  assert.deepEqual(issuer.emitir('success'), { delivered: true, academic: true });
  assert.deepEqual(issuer.emitir('temporary_failure'), { delivered: false, academic: true });
  fails(() => issuer.emitir('aprovado-no-browser'), 400);
});

test('todas as escritas transacionais compartilham aprovação/admin e CSRF', () => {
  const calls = [];
  const router = Object.fromEntries(
    ['get', 'post', 'delete', 'patch'].map((method) => [
      method,
      (...args) => calls.push({ method, args }),
    ]),
  );
  const auth = () => {},
    approved = () => {},
    admin = () => {},
    csrf = () => {};
  const service = registrarTransacoes(router, { pool: {}, auth, approved, admin, csrf });
  assert.equal(typeof service.expire, 'function');
  const writes = calls.filter((call) => call.method !== 'get');
  assert.ok(writes.length > 0);
  for (const call of writes) {
    assert.ok([approved, admin].includes(call.args[1]), call.args[0]);
    assert.equal(call.args[2], csrf, call.args[0]);
  }
  assert.ok(calls.find((call) => call.args[0] === '/pedidos/:id/cancelar'));
  assert.throws(() => registrarTransacoes(router, { pool: {}, auth, approved, admin }), TypeError);
});
