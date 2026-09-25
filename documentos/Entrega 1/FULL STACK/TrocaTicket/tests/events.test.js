import test from 'node:test';
import assert from 'node:assert/strict';
import { getEvents } from '../src/services/events.js';

test('API simulada trata sucesso, falha HTTP, dados inválidos e cancelamento', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const events = [
    {
      id: 'demo',
      title: 'Evento',
      date: '2026-10-24',
      location: 'SP',
      image: '/image.jpg',
      price: 10,
    },
  ];
  globalThis.fetch = async () => ({ ok: true, json: async () => events });
  assert.deepEqual(await getEvents(), events);
  globalThis.fetch = async () => ({ ok: false });
  await assert.rejects(getEvents(), /Não foi possível/);
  globalThis.fetch = async () => ({ ok: true, json: async () => [{ ...events[0], price: -1 }] });
  await assert.rejects(getEvents(), /inválidos/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(getEvents(controller.signal), { name: 'AbortError' });
});
