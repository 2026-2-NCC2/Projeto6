import test from 'node:test';
import assert from 'node:assert/strict';
import { resources, setLocale, translate } from '../src/i18n/index.js';

test('os cinco idiomas têm as mesmas mensagens e preservam parâmetros', () => {
  const keys = Object.keys(resources.en).sort();
  assert.ok(keys.length > 100);
  for (const language of ['en', 'es', 'fr', 'de', 'it']) {
    assert.deepEqual(Object.keys(resources[language]).sort(), keys, language);
    for (const key of keys) {
      const message = resources[language][key];
      assert.equal(typeof message, 'string', `${language}: ${key}`);
      assert.ok(message.trim(), `${language}: ${key}`);
      assert.deepEqual(
        (message.match(/\{\w+\}/g) || []).sort(),
        (key.match(/\{\w+\}/g) || []).sort(),
        `${language}: ${key}`,
      );
    }
  }
});
test('troca de idioma traduz interface sem modificar dados sem tradução', () => {
  setLocale('en');
  assert.equal(translate('Salvar preferências'), 'Save preferences');
  assert.equal(translate('Nível {level}', { level: 2 }), 'Level 2');
  assert.equal(translate('Festival Primavera Sonora 2026'), 'Festival Primavera Sonora 2026');
  assert.equal(translate(123), 123);
  setLocale('fr');
  assert.equal(translate('Aparência'), 'Apparence');
  setLocale('pt-BR');
  assert.equal(translate('Salvar preferências'), 'Salvar preferências');
});
