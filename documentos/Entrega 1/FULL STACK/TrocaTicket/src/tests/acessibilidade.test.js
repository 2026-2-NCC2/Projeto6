// Preferências de acessibilidade (etapa 8): validação, leitura, gravação, tema do sistema e
// aplicação no <html>.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAVE_PREFERENCIAS,
  CHAVE_TEMA,
  PADRAO,
  aplicarPreferencias,
  gravarPreferencias,
  lerPreferencias,
  temaResolvido,
  validarPreferencias,
} from '../acessibilidade/preferencias.js';

function armazenamento(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
    setItem: (chave, valor) => dados.set(chave, String(valor)),
  };
}

function raizFalsa() {
  const propriedades = {};
  return {
    dataset: {},
    propriedades,
    style: { fontSize: '', setProperty: (nome, valor) => (propriedades[nome] = valor) },
  };
}

test('valores fora da lista voltam ao padrão', () => {
  assert.deepEqual(validarPreferencias(null), PADRAO);
  assert.deepEqual(validarPreferencias([1, 2]), PADRAO);
  const p = validarPreferencias({
    tema: 'roxo',
    tamanhoFonte: 130,
    espacoLetras: 7,
    espacoLinhas: -1,
    altoContraste: 'sim',
    fonteLegivel: 1,
    destacarLinks: null,
  });
  assert.deepEqual(p, PADRAO);
  const q = validarPreferencias({
    tema: 'system',
    tamanhoFonte: 175,
    espacoLetras: 3,
    espacoLinhas: 2,
    altoContraste: true,
    fonteLegivel: true,
    destacarLinks: true,
    extra: 'ignorado',
  });
  assert.deepEqual(q, {
    tema: 'system',
    tamanhoFonte: 175,
    espacoLetras: 3,
    espacoLinhas: 2,
    altoContraste: true,
    fonteLegivel: true,
    destacarLinks: true,
  });
});

test('sem preferências salvas, o tema vem do botão claro/escuro antigo', () => {
  assert.deepEqual(lerPreferencias(armazenamento()), PADRAO);
  assert.equal(lerPreferencias(armazenamento({ [CHAVE_TEMA]: 'dark' })).tema, 'dark');
  assert.equal(lerPreferencias(armazenamento({ [CHAVE_TEMA]: 'light' })).tema, 'light');
  assert.deepEqual(lerPreferencias(null), PADRAO);
});

test('lê só a versão conhecida e ignora dados corrompidos', () => {
  const salvo = JSON.stringify({
    versao: 1,
    preferencias: { tamanhoFonte: 150, altoContraste: true },
  });
  const lido = lerPreferencias(
    armazenamento({ [CHAVE_PREFERENCIAS]: salvo, [CHAVE_TEMA]: 'dark' }),
  );
  assert.equal(lido.tamanhoFonte, 150);
  assert.equal(lido.altoContraste, true);
  assert.equal(lido.tema, 'light', 'com preferências salvas, vale o tema delas');
  assert.deepEqual(lerPreferencias(armazenamento({ [CHAVE_PREFERENCIAS]: '{quebrado' })), PADRAO);
  const outraVersao = JSON.stringify({ versao: 9, preferencias: { tamanhoFonte: 200 } });
  assert.equal(
    lerPreferencias(armazenamento({ [CHAVE_PREFERENCIAS]: outraVersao })).tamanhoFonte,
    100,
  );
});

test('grava com versão e informa quando o navegador recusa', () => {
  const a = armazenamento();
  assert.equal(gravarPreferencias(a, { tamanhoFonte: 200, tema: 'dark', invalido: true }), true);
  const salvo = JSON.parse(a.dados.get(CHAVE_PREFERENCIAS));
  assert.equal(salvo.versao, 1);
  assert.equal(salvo.preferencias.tamanhoFonte, 200);
  assert.equal(salvo.preferencias.tema, 'dark');
  assert.equal('invalido' in salvo.preferencias, false);
  const bloqueado = {
    setItem() {
      throw new Error('cota');
    },
  };
  assert.equal(gravarPreferencias(bloqueado, PADRAO), false);
  assert.equal(gravarPreferencias(null, PADRAO), false);
});

test('tema do sistema acompanha o aparelho; claro e escuro valem como escolhidos', () => {
  assert.equal(temaResolvido('system', true), 'dark');
  assert.equal(temaResolvido('system', false), 'light');
  assert.equal(temaResolvido('dark', false), 'dark');
  assert.equal(temaResolvido('light', true), 'light');
  assert.equal(temaResolvido('qualquer', true), 'light');
});

test('aplica atributos, tamanho da letra e espaçamentos no <html>', () => {
  const raiz = raizFalsa();
  aplicarPreferencias(
    {
      tema: 'system',
      tamanhoFonte: 150,
      espacoLetras: 2,
      espacoLinhas: 3,
      altoContraste: true,
      fonteLegivel: true,
      destacarLinks: true,
    },
    raiz,
    true,
  );
  assert.deepEqual(raiz.dataset, {
    theme: 'dark',
    contrast: 'high',
    fonte: '150',
    letras: '2',
    linhas: '3',
    legivel: 'true',
    links: 'true',
    ampliado: 'true',
  });
  assert.equal(raiz.style.fontSize, '150%');
  assert.equal(raiz.propriedades['--leitura-espaco-letras'], '0.08em');
  assert.equal(raiz.propriedades['--leitura-altura-linhas'], '2');
  // Padrão: o tamanho volta ao do navegador (sem valor fixo) e o contraste é normal.
  aplicarPreferencias(PADRAO, raiz, false);
  assert.equal(raiz.style.fontSize, '');
  assert.equal(raiz.dataset.contrast, 'normal');
  assert.equal(raiz.dataset.theme, 'light');
  assert.equal(raiz.propriedades['--leitura-altura-linhas'], 'normal');
  assert.equal(raiz.dataset.ampliado, 'false');
  // Só o alto contraste não muda o layout; espaçamento ou fonte legível, sim, mesmo em 100%.
  aplicarPreferencias({ ...PADRAO, altoContraste: true, destacarLinks: true }, raiz, false);
  assert.equal(raiz.dataset.ampliado, 'false');
  for (const mudanca of [{ espacoLetras: 1 }, { espacoLinhas: 1 }, { fonteLegivel: true }]) {
    aplicarPreferencias({ ...PADRAO, ...mudanca }, raiz, false);
    assert.equal(raiz.dataset.ampliado, 'true', JSON.stringify(mudanca));
  }
});
