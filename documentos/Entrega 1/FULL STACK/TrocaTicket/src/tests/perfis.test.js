import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERFIS,
  destinations,
  inicioDoPerfil,
  nomeDoPerfil,
  normalizarPerfil,
  podeTrocarPerfilDemo,
  roleNames,
} from '../data/perfis.js';

test('cada perfil vai para a sua página inicial (logotipo)', () => {
  assert.equal(inicioDoPerfil(''), '/');
  assert.equal(inicioDoPerfil(undefined), '/');
  assert.equal(inicioDoPerfil('comprador'), '/');
  assert.equal(inicioDoPerfil('organizador'), '/organizador');
  assert.equal(inicioDoPerfil('fornecedor'), '/fornecedor');
  assert.equal(inicioDoPerfil('admin'), '/admin');
  assert.equal(inicioDoPerfil('perfil-inventado'), '/');
});

test('apelidos antigos viram o identificador interno, sem renomear o banco', () => {
  assert.equal(normalizarPerfil('participante'), 'comprador');
  assert.equal(normalizarPerfil('Usuário'), 'comprador');
  assert.equal(normalizarPerfil(' ADMINISTRADOR '), 'admin');
  assert.equal(normalizarPerfil('hacker'), '');
  assert.deepEqual(Object.keys(destinations).sort(), [...PERFIS].sort());
});

test('o perfil comprador aparece como "Usuário" e nenhum nome exibido é "Participante"', () => {
  assert.equal(nomeDoPerfil('comprador'), 'Usuário');
  assert.equal(nomeDoPerfil('participante'), 'Usuário');
  assert.equal(nomeDoPerfil(''), 'Usuário');
  assert.ok(!Object.values(roleNames).includes('Participante'));
});

test('troca rápida de perfil só no modo demonstração e só para perfis conhecidos', () => {
  assert.equal(podeTrocarPerfilDemo({ autenticado: false, destino: 'admin' }), true);
  assert.equal(podeTrocarPerfilDemo({ autenticado: false, destino: 'organizador' }), true);
  // Conta real nunca troca de perfil pelo site (nem para admin).
  assert.equal(podeTrocarPerfilDemo({ autenticado: true, destino: 'admin' }), false);
  assert.equal(podeTrocarPerfilDemo({ autenticado: true, destino: 'comprador' }), false);
  // Valores desconhecidos são recusados.
  assert.equal(podeTrocarPerfilDemo({ autenticado: false, destino: 'superadmin' }), false);
  assert.equal(podeTrocarPerfilDemo({ autenticado: false, destino: '' }), false);
});
