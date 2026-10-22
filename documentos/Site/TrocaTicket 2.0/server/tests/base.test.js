import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSenha, conferirSenha } from '../src/passwords.js';
import { lerConfig } from '../src/config.js';
import { separarSql, versaoCompativel } from '../src/migrations.js';
import { dateSql } from '../src/catalog.js';
import { urlImagem } from '../src/http.js';

test('senha tem sal distinto, aceita a correta e recusa segredo diferente ou hash adulterado', async () => {
  const password = 'Senha-Ficticia-Teste-2026!';
  const a = await hashSenha(password),
    b = await hashSenha(password);
  assert.notEqual(a, b);
  assert.ok(!a.includes(password));
  assert.equal(await conferirSenha(password, a), true);
  assert.equal(await conferirSenha('senha-diferente', a), false);
  assert.equal(await conferirSenha(password, a.replace('32768', '1')), false);
  assert.equal(await conferirSenha(undefined, a), false);
  assert.equal(await conferirSenha(password, 'texto-puro'), false);
});

test('configuração limita base nova local e não presume senha vazia', () => {
  const env = { DB_USER: 'conta_ficticia', DB_PASSWORD: 'somente-teste' };
  const config = lerConfig(env);
  assert.equal(config.database, 'trocaticket_mvp_academico');
  assert.throws(() => lerConfig({ ...env, DB_NAME: 'trocaticket_dev_mysql_20261018' }));
  assert.throws(() => lerConfig({ ...env, DB_HOST: 'banco.remoto.example.com' }));
  assert.throws(() => lerConfig({ DB_USER: 'conta_ficticia' }));
  assert.equal(lerConfig({ DB_USER: 'conta_ficticia', DB_PASSWORD_EMPTY: '1' }).db.password, '');
  assert.throws(() => lerConfig({ ...env, DB_PORT: '3306;anything' }));
});

test('separação de migração conserva ponto e vírgula literal e recusa SQL incompleto', () => {
  const sql =
    "-- início;\nINSERT INTO x VALUES('a;b','d''e'); /* ; */ SELECT `campo;nome` FROM x; # fim;\n";
  assert.deepEqual(separarSql(sql), [
    "INSERT INTO x VALUES('a;b','d''e')",
    'SELECT `campo;nome` FROM x',
  ]);
  assert.throws(() => separarSql("SELECT 'incompleto"));
  assert.throws(() => separarSql('SELECT 1; /* incompleto'));
});

test('versão exige MySQL com CHECKs aplicados e não confunde MariaDB com MySQL', () => {
  for (const value of ['8.0.46', '8.4.2']) assert.equal(versaoCompativel(value), true);
  for (const value of ['8.0.15', '5.7.44', '10.4.32-MariaDB', '8.0.46-MariaDB', 'inválida'])
    assert.equal(versaoCompativel(value), false);
});

test('datas rejeitam dia inexistente e convertem fuso explícito para UTC', () => {
  assert.equal(dateSql('2030-12-15T19:00:00-03:00', 'Início'), '2030-12-15 22:00:00.000');
  assert.throws(() => dateSql('2030-02-31T19:00:00Z', 'Início'));
  assert.throws(() => dateSql('2030-12-15T24:00:00Z', 'Início'));
  assert.throws(() => dateSql('2030-13-15T19:00:00Z', 'Início'));
  assert.throws(() => dateSql('não é data', 'Início'));
  assert.throws(() => dateSql('2030-12-15T19:00:00', 'Início'));
});

test('imagens não permitem execução de script, credenciais na URL nem travessia de pasta', () => {
  assert.equal(urlImagem('/images/evento-placeholder.svg'), '/images/evento-placeholder.svg');
  assert.equal(urlImagem('https://example.com/image.png'), 'https://example.com/image.png');
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,abc',
    'https://user:password@example.com/x',
    '/images/../../segredo',
  ])
    assert.throws(() => urlImagem(url));
});
