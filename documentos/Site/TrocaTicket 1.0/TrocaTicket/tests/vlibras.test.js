import test from 'node:test';
import assert from 'node:assert/strict';
import { loadVLibras } from '../src/accessibility/vlibras.js';
test('VLibras compartilha carregamento e permite tentar novamente após falha', async () => {
  const oldWindow = globalThis.window;
  const oldDocument = globalThis.document;
  const scripts = [];
  globalThis.window = {};
  globalThis.document = {
    createElement: () => ({
      remove() {
        this.removed = true;
      },
    }),
    body: { append: (script) => scripts.push(script) },
  };
  try {
    const first = loadVLibras();
    assert.equal(loadVLibras(), first);
    assert.equal(scripts.length, 1);
    scripts[0].onerror();
    await assert.rejects(first);
    assert.equal(scripts[0].removed, true);
    const retry = loadVLibras();
    assert.equal(scripts.length, 2);
    window.VLibrasWidget = { initBtn: {} };
    scripts[1].onload();
    await retry;
    await loadVLibras();
    assert.equal(scripts.length, 2);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document;
    else globalThis.document = oldDocument;
  }
});
