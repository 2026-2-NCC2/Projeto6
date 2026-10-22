import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEvent,
  validAmount,
  reservationError,
  lineTotal,
  csvText,
  restoreData,
  normalizeSearch,
} from '../src/services/rules.js';
import { quoteTemplates } from '../src/data/quotes.js';
import { initialEvents } from '../src/data/demo.js';
const event = initialEvents[0];
test('horários vazios, datas inválidas e término antecipado são recusados', () => {
  assert.equal(validateEvent(event).time, undefined);
  assert.ok(validateEvent({ ...event, time: '' }).time);
  assert.ok(validateEvent({ ...event, endTime: '' }).endTime);
  assert.ok(validateEvent({ ...event, date: '2026-02-30' }).date);
  assert.ok(validateEvent({ ...event, endDate: event.date, endTime: event.time }).endDate);
});
test('valores monetários vazios, negativos, infinitos e frações de centavo são recusados', () => {
  for (const value of ['', ' ', -1, Infinity, 'abc', 1.001])
    assert.equal(validAmount(value, true), false);
  assert.equal(validAmount(0, true), true);
  assert.equal(validAmount(0), false);
  assert.equal(validAmount(1.23), true);
});
test('reserva exige evento publicado, quantidade inteira e capacidade disponível', () => {
  for (const quantity of [0, 1.5, 7, '', Infinity])
    assert.ok(reservationError({ ...event, status: 'Publicado' }, quantity));
  for (const status of ['Cancelado', 'Rascunho', 'Agendado'])
    assert.ok(reservationError({ ...event, status }, 1));
  const active = { ...event, status: 'Publicado', capacity: 2 };
  const tickets = [{ eventId: event.id, quantity: 2, status: 'Reservado (demo)' }];
  assert.ok(reservationError(active, 1, tickets));
  assert.equal(reservationError(active, 2, [{ ...tickets[0], status: 'Cancelado' }]), '');
});
test('cotações usam itens específicos e calculam totais em centavos', () => {
  assert.equal(lineTotal(quoteTemplates['tim-maia'].items, [3750, 14200, 380]), 114200);
  assert.equal(lineTotal(quoteTemplates['tim-maia'].items, [4000, 14200, 380]), 117200);
  assert.equal(
    lineTotal(quoteTemplates['lil-peep'].items, quoteTemplates['lil-peep'].prices),
    184500,
  );
  assert.equal(lineTotal(quoteTemplates.michael.items, quoteTemplates.michael.prices), 245000);
  assert.equal(lineTotal([['Item', 3, 'un', 0.1]], [0.1]), 0.3);
});
test('CSV preserva aspas e quebras e neutraliza fórmulas', () => {
  const text = csvText([
    ['Nome', 'Nota'],
    ['A;B', 'Linha "um"\ndois'],
    ['  =SUM(A1)', '@link'],
  ]);
  assert.ok(text.startsWith('\ufeff'));
  assert.ok(text.includes('"A;B";"Linha ""um""\ndois"'));
  assert.ok(text.includes('"\'  =SUM(A1)";"\'@link"'));
});
test('dados salvos inválidos não substituem listas e campos necessários', () => {
  const defaults = {
    events: initialEvents,
    favorites: [],
    tickets: [],
    messages: [],
    profile: {
      name: 'Demo',
      email: 'demo@example.com',
      phone: '',
      preferences: [true, false, true, false],
    },
  };
  const result = restoreData(
    {
      version: 2,
      data: {
        events: null,
        profile: { name: 7, preferences: null },
        tickets: [null],
        favorites: [{}, 'tech'],
      },
    },
    defaults,
  );
  assert.deepEqual(result.events, initialEvents);
  assert.equal(result.profile.name, 'Demo');
  assert.deepEqual(result.favorites, ['tech']);
  assert.deepEqual(result.tickets, []);
  assert.deepEqual(restoreData({ version: 2, data: { events: [] } }, defaults).events, []);
});
test('pesquisa aceita acentos e espaços extras', () =>
  assert.equal(normalizeSearch('  São Paulo  '), 'sao paulo'));

test('editar evento não permite capacidade menor que reservas ativas', () => {
  const tickets = [
    { eventId: event.id, quantity: 8, status: 'Anunciado' },
    { eventId: event.id, quantity: 5, status: 'Cancelado' },
  ];
  assert.ok(validateEvent({ ...event, capacity: 7 }, tickets).capacity);
  assert.equal(validateEvent({ ...event, capacity: 8 }, tickets).capacity, undefined);
});

test('moeda rejeita tipos que JavaScript converteria indevidamente em número', () => {
  for (const value of [null, true, false, [], [1], {}, undefined])
    assert.equal(validAmount(value, true), false);
});

test('recuperação preserva registros válidos e saneia campos opcionais corrompidos', () => {
  const defaults = {
    events: initialEvents,
    tickets: [],
    profile: { name: 'Demo', preferences: [true, true, true, false] },
  };
  const saved = {
    version: 2,
    data: {
      events: [{ ...event, confirmations: {} }, null, { ...initialEvents[1] }, { ...event }],
      tickets: [
        {
          id: 't1',
          eventId: event.id,
          title: 'Teste',
          image: '',
          type: 'Inteira',
          status: 'Anunciado',
          quantity: 1,
          total: 20,
          recipient: {},
          resalePrice: -1,
        },
      ],
    },
  };
  const result = restoreData(saved, defaults);
  assert.equal(result.events.length, 2);
  assert.deepEqual(result.events[0].confirmations, []);
  assert.equal(result.tickets[0].recipient, undefined);
  assert.equal(result.tickets[0].resalePrice, undefined);
  assert.deepEqual(saved.data.events[0].confirmations, {});
});
