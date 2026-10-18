import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  defaults,
  sanitizePreferences,
  readPreferences,
  writePreferences,
  STORAGE_KEY,
  resolveTheme,
  applyPreferences,
} from '../src/accessibility/preferences.js';

test('restaura padrão para dados inválidos e preserva apenas preferências reconhecidas', () => {
  assert.deepEqual(sanitizePreferences(null), defaults);
  assert.deepEqual(
    sanitizePreferences({
      theme: 'neon',
      language: 'xx',
      fontSize: '200',
      highContrast: 'true',
      letterSpacing: 99,
    }),
    defaults,
  );
  const sanitized = sanitizePreferences({
    theme: 'system',
    language: 'fr',
    fontSize: 200,
    lineSpacing: 3,
    highContrast: true,
    extra: 1,
  });
  assert.equal(sanitized.theme, 'system');
  assert.equal(sanitized.language, 'fr');
  assert.equal(sanitized.extra, undefined);
});
test('persistência versionada não altera chaves comerciais e lida com armazenamento bloqueado', () => {
  const values = new Map([['trocaticket-v2', 'dados originais']]);
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(writePreferences(storage, { ...defaults, theme: 'dark', language: 'es' }), true);
  assert.equal(readPreferences(storage).language, 'es');
  assert.equal(values.get('trocaticket-v2'), 'dados originais');
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).version, 1);
  const blocked = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.deepEqual(readPreferences(blocked), defaults);
  assert.equal(writePreferences(blocked, defaults), false);
  assert.deepEqual(readPreferences({ getItem: () => '{invalid' }), defaults);
});
test('tema segue o dispositivo somente no modo Sistema e não depende do contraste', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  const properties = {};
  const root = { dataset: {}, style: { setProperty: (key, value) => (properties[key] = value) } };
  applyPreferences(
    {
      ...defaults,
      theme: 'light',
      highContrast: true,
      fontSize: 150,
      letterSpacing: 3,
      lineSpacing: 2,
      language: 'de',
    },
    root,
    true,
  );
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.dataset.contrast, 'high');
  assert.equal(root.style.fontSize, '150%');
  assert.equal(root.lang, 'de');
  assert.equal(properties['--reading-letter-spacing'], '.12em');
  applyPreferences(defaults, root, true);
  assert.equal(root.dataset.contrast, 'normal');
  assert.equal(root.style.fontSize, '100%');
  assert.equal(root.dataset.lineSpacing, '0');
});
test('inicialização anterior ao React aplica tema salvo e aceita storage corrompido', async () => {
  const code = await readFile(new URL('../public/ui-preferences-init.js', import.meta.url), 'utf8');
  const root = { dataset: {} };
  vm.runInNewContext(code, {
    document: { documentElement: root },
    localStorage: {
      getItem: () =>
        JSON.stringify({
          version: 1,
          preferences: { theme: 'system', language: 'it', highContrast: true },
        }),
    },
    matchMedia: () => ({ matches: true }),
  });
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.lang, 'it');
  assert.equal(root.dataset.contrast, 'high');
  assert.doesNotThrow(() => vm.runInNewContext(code, { localStorage: { getItem: () => '{oops' } }));
});
