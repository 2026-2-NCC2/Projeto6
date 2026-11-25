import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diasAte,
  ingressosAtivos,
  notificacoesLidas,
  notificacoesNaoLidas,
  plural,
  primeiroNome,
  progressoPerfil,
  proximoIngresso,
  rotuloDias,
} from '../utils/painelUsuario.js';

const HOJE = new Date(2026, 10, 25); // 25/11/2026

test('primeiro nome para a saudação', () => {
  assert.equal(primeiroNome('Carlos Eduardo Mendes'), 'Carlos');
  assert.equal(primeiroNome('  Ana  '), 'Ana');
  assert.equal(primeiroNome(''), '');
  assert.equal(primeiroNome(undefined), '');
});

test('progresso do perfil conta nome, e-mail, telefone e foto', () => {
  assert.deepEqual(progressoPerfil({ name: 'C', email: 'c@x', phone: '1' }), {
    percentual: 75,
    faltando: ['foto'],
  });
  assert.equal(progressoPerfil({}).percentual, 0);
  assert.equal(progressoPerfil({ name: 'C', email: 'e', phone: 'p', photo: 'f' }).percentual, 100);
  assert.equal(progressoPerfil({ name: '   ' }).percentual, 0);
});

test('dias até o evento e rótulo', () => {
  assert.equal(diasAte('2026-11-25', HOJE), 0);
  assert.equal(diasAte('2026-11-26', HOJE), 1);
  assert.equal(diasAte('2026-12-25', HOJE), 30);
  assert.equal(diasAte('28 a 30 de Março', HOJE), null);
  assert.equal(rotuloDias(0), 'É hoje!');
  assert.equal(rotuloDias(1), 'É amanhã!');
  assert.equal(rotuloDias(30), 'Faltam 30 dias');
  assert.equal(rotuloDias(null), '');
});

test('ingressos ativos e próximo evento', () => {
  const ingressos = [
    { id: 1, statusCode: 'A', eventTitle: 'Longe', date: '2027-01-10' },
    { id: 2, statusCode: 'C', eventTitle: 'Cancelado', date: '2026-11-27' },
    { id: 3, statusCode: 'A', eventTitle: 'Perto', date: '2026-11-28' },
    { id: 4, statusCode: 'A', eventTitle: 'Passado', date: '2026-10-01' },
    { id: 'DEMO-1', title: 'Reserva demo', status: 'Reservado (demo)' },
    { id: 'DEMO-2', title: 'Demo cancelada', status: 'Cancelado' },
  ];
  assert.deepEqual(
    ingressosAtivos(ingressos).map((i) => i.id),
    [1, 3, 4, 'DEMO-1'],
  );
  const proximo = proximoIngresso(ingressos, HOJE);
  assert.equal(proximo.eventTitle, 'Perto');
  assert.equal(proximo.dias, 3);
  assert.equal(proximoIngresso([], HOJE), null);
});

test('notificações do Troca-Papo: lidas vêm do estado salvo do fórum', () => {
  const todas = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }];
  assert.deepEqual(notificacoesLidas(JSON.stringify({ notificacoesLidas: ['n1'] })), ['n1']);
  assert.deepEqual(notificacoesLidas('{quebrado'), []);
  assert.deepEqual(notificacoesLidas(null), []);
  assert.deepEqual(
    notificacoesNaoLidas(todas, ['n1']).map((n) => n.id),
    ['n2', 'n3'],
  );
  assert.equal(notificacoesNaoLidas(todas, ['n1', 'n2', 'n3']).length, 0);
});

test('plural', () => {
  assert.equal(plural(1, 'notificação nova', 'notificações novas'), '1 notificação nova');
  assert.equal(plural(3, 'notificação nova', 'notificações novas'), '3 notificações novas');
});
