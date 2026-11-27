// Idiomas do site (etapa 7): dicionários, troca de idioma, valores, plurais, mensagens da API
// reconhecidas por modelo e formatos de número e moeda.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Armazenamento simulado do navegador, criado antes de carregar o módulo de idiomas.
const guardados = new Map();
globalThis.localStorage = {
  getItem: (chave) => (guardados.has(chave) ? guardados.get(chave) : null),
  setItem: (chave, valor) => guardados.set(chave, String(valor)),
  removeItem: (chave) => guardados.delete(chave),
};

const { CHAVE_IDIOMA, COLUNAS, IDIOMAS, PADRAO } = await import('../i18n/idiomas.js');
const { default: LINHAS } = await import('../i18n/textos/index.js');
const { definirIdioma, formatarMoeda, formatarNumero, idiomaAtual, localeAtual, t, tn } =
  await import('../i18n/index.js');

const marcadores = (texto) =>
  [...new Set([...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

test('seis idiomas, português do Brasil como padrão', () => {
  assert.equal(PADRAO, 'pt-BR');
  assert.deepEqual(
    IDIOMAS.map((idioma) => idioma.codigo),
    ['pt-BR', 'en', 'es', 'fr', 'de', 'it'],
  );
  assert.deepEqual(COLUNAS, ['en', 'es', 'fr', 'de', 'it']);
  assert.equal(idiomaAtual(), 'pt-BR');
});

test('cada linha do dicionário tem os seis textos com os mesmos marcadores', () => {
  assert.ok(LINHAS.length > 1500, `poucas linhas: ${LINHAS.length}`);
  for (const linha of LINHAS) {
    assert.equal(linha.length, 6, `linha incompleta: ${JSON.stringify(linha)}`);
    for (const texto of linha) {
      assert.equal(typeof texto, 'string', JSON.stringify(linha));
      assert.ok(texto.trim(), `texto vazio em ${JSON.stringify(linha)}`);
      assert.deepEqual(
        marcadores(texto),
        marcadores(linha[0]),
        `marcadores diferentes: ${JSON.stringify(linha)}`,
      );
    }
  }
});

test('todo texto fixo do site passado a t() tem tradução (exceto nomes iguais em todos os idiomas)', () => {
  const iguaisEmTodos = new Set([
    'TrocaTicket',
    'TrocaTicket.',
    'Troca-Papo',
    'R$',
    'TT-…',
    'IP',
    'IP:',
    'ID',
    'CNPJ',
    '(V)',
    '(X)',
  ]);
  const chaves = new Set(LINHAS.map((linha) => linha[0]));
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const arquivos = (pasta) =>
    fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
      const caminho = path.join(pasta, item.name);
      if (item.isDirectory()) return ['tests', 'i18n'].includes(item.name) ? [] : arquivos(caminho);
      return /\.jsx?$/.test(item.name) ? [caminho] : [];
    });
  const padroes = [
    /\bt\(\s*'((?:[^'\\\n]|\\.)*)'/g,
    /\bt\(\s*"((?:[^"\\\n]|\\.)*)"/g,
    /\btn\(\s*[^,]+,\s*'((?:[^'\\\n]|\\.)*)'\s*,\s*'((?:[^'\\\n]|\\.)*)'/g,
  ];
  const faltando = [];
  for (const arquivo of arquivos(raiz)) {
    const codigo = fs.readFileSync(arquivo, 'utf8');
    for (const padrao of padroes) {
      for (const achado of codigo.matchAll(padrao)) {
        for (const bruto of achado.slice(1)) {
          const chave = bruto.replace(/\\(.)/g, '$1');
          if (!chaves.has(chave) && !iguaisEmTodos.has(chave))
            faltando.push(`${path.relative(raiz, arquivo)}: ${chave}`);
        }
      }
    }
  }
  assert.deepEqual(faltando, []);
});

test('em português, t() devolve o próprio texto e preenche os valores', () => {
  assert.equal(t('Usuário'), 'Usuário');
  assert.equal(t('Anúncio nº {listingId}', { listingId: 9 }), 'Anúncio nº 9');
  assert.equal(tn(1, '{n} evento', '{n} eventos'), '1 evento');
  assert.equal(tn(3, '{n} evento', '{n} eventos'), '3 eventos');
  assert.equal(t(''), '');
  assert.equal(t(undefined), undefined);
});

test('troca de idioma: grava a escolha e recusa código desconhecido', () => {
  definirIdioma('fr');
  assert.equal(idiomaAtual(), 'fr');
  assert.equal(localeAtual(), 'fr');
  assert.equal(guardados.get(CHAVE_IDIOMA), 'fr');
  definirIdioma('xx');
  assert.equal(idiomaAtual(), 'fr');
  definirIdioma('en');
  assert.equal(guardados.get(CHAVE_IDIOMA), 'en');
});

test('em inglês: tradução exata, texto desconhecido sem mudança, valores e plurais', () => {
  definirIdioma('en');
  assert.equal(t('Usuário'), 'User');
  assert.equal(t('Organizador'), 'Organizer');
  assert.equal(t('Texto que não está no dicionário'), 'Texto que não está no dicionário');
  assert.equal(t('Anúncio nº {listingId}', { listingId: 9 }), 'Listing no. 9');
  assert.equal(tn(1, '{n} evento', '{n} eventos'), '1 event');
  assert.equal(tn(4, '{n} evento', '{n} eventos'), '4 events');
});

test('mensagens da API em português são reconhecidas e traduzidas no site', () => {
  definirIdioma('en');
  assert.equal(t('E-mail ou senha inválidos.'), 'Invalid email or password.');
  assert.equal(
    t('Sua conta aguarda aprovação da administração. Esta ação fica liberada depois da aprovação.'),
    'Your account is waiting for administration approval. This action becomes available after approval.',
  );
  // Modelo com {quando}: o horário é dado e entra sem tradução.
  assert.equal(
    t('Este ingresso já foi utilizado (entrada em 26/11/2026 20:15, horário de Brasília).'),
    'This ticket has already been used (entry on 26/11/2026 20:15, Brasília time).',
  );
  // Parte capturada que também é texto do site é traduzida.
  assert.equal(
    t('Importação interrompida: 3 de 5 itens salvos. Mensagem não encontrada.'),
    'Import stopped: 3 of 5 items saved. Message not found.',
  );
});

test('modelos não misturam idiomas: números só onde o marcador é numérico', () => {
  definirIdioma('en');
  assert.equal(t('5 eventos'), '5 events');
  assert.equal(t('Muitos eventos'), 'Muitos eventos');
  assert.equal(t('Faltam 3 dias'), '3 days to go');
  assert.equal(t('Faltam poucos dias'), 'Faltam poucos dias');
  // Modelo com pouco texto fixo ("{v1} às {time}") não reconhece frases soltas.
  assert.equal(t('Encerra às 18:00'), 'Encerra às 18:00');
  // O modelo mais específico vence.
  assert.equal(t('Encerra às 18:00 (Brasília)'), 'Closes at 18:00 (Brasília)');
});

test('números e moeda seguem o idioma; o valor continua em reais', () => {
  definirIdioma('en');
  assert.equal(formatarNumero(1234.5), '1,234.5');
  assert.ok(formatarMoeda(1234.5).includes('1,234.50'), formatarMoeda(1234.5));
  assert.ok(formatarMoeda(1234.5).includes('R$'), formatarMoeda(1234.5));
  definirIdioma('de');
  assert.equal(formatarNumero(1234.5), '1.234,5');
  // Em espanhol e italiano, o padrão do navegador mostraria "BRL"; o site mantém "R$".
  for (const idioma of ['es', 'it']) {
    definirIdioma(idioma);
    assert.ok(formatarMoeda(10).includes('R$'), `${idioma}: ${formatarMoeda(10)}`);
  }
  definirIdioma('pt-BR');
  assert.ok(formatarMoeda(1234.5).includes('1.234,50'), formatarMoeda(1234.5));
  assert.equal(t('Usuário'), 'Usuário');
});
