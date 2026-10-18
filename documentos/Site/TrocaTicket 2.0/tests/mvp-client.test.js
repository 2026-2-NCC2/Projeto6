import test from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError, dateTime, moneyCents, parseCents, setCsrfToken } from '../src/mvp/api.js';

test('preços em texto são convertidos para centavos sem aceitar negativos, expoentes ou casas extras', () => {
  for (const [input, expected] of [
    ['100', 10000],
    ['70,00', 7000],
    ['0.01', 1],
    [' 12,3 ', 1230],
    ['0', 0],
  ])
    assert.equal(parseCents(input), expected);
  for (const input of [
    '-1',
    '1e3',
    '12.345',
    '1.000,00',
    '',
    'NaN',
    'Infinity',
    '9999999999999999999',
  ])
    assert.equal(parseCents(input), null);
  assert.equal(moneyCents(null), '—');
  assert.match(moneyCents(7000), /70,00/);
});

test('datas UTC são apresentadas em São Paulo e entradas ausentes não quebram a interface', () => {
  assert.match(dateTime('2030-01-01T22:30:00.000Z', 'pt-BR'), /19:30/);
  assert.equal(dateTime(null), '—');
  assert.equal(dateTime('inválida'), '—');
});

test('cliente usa cookie HttpOnly, CSRF em memória e chave idempotente recebida', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
    setCsrfToken(null);
  });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: 1 });
  };
  setCsrfToken('token-apenas-em-memoria');
  await api('/pedidos/1/pagar', { method: 'POST', body: {}, key: 'operacao-ficticia-123456' });
  assert.equal(calls[0].url, '/api/pedidos/1/pagar');
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.headers['X-CSRF-Token'], 'token-apenas-em-memoria');
  assert.equal(calls[0].options.headers['Idempotency-Key'], 'operacao-ficticia-123456');
  assert.equal(calls[0].options.body, '{}');
  setCsrfToken(null);
  await api('/auth/session');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], undefined);
  assert.equal(calls[1].options.headers['Idempotency-Key'], undefined);
});

test('API indisponível, erro de negócio e resposta inválida não se convertem em sucesso local', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => {
    throw new TypeError('offline');
  };
  await assert.rejects(
    api('/eventos'),
    (e) => e instanceof ApiError && e.status === 0 && e.code === 'NETWORK',
  );
  globalThis.fetch = async () => Response.json({ message: 'Teto ultrapassado.' }, { status: 409 });
  await assert.rejects(
    api('/anuncios', { method: 'POST', body: { priceCents: 40000 } }),
    (e) => e.status === 409 && e.message === 'Teto ultrapassado.',
  );
  globalThis.fetch = async () =>
    new Response('<html>proxy</html>', { headers: { 'Content-Type': 'text/html' } });
  await assert.rejects(api('/eventos'), (e) => e.code === 'FORMAT');
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await api('/auth/logout', { method: 'POST', body: {} }), null);
});
