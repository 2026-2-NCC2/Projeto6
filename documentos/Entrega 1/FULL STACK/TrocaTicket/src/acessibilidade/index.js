// Preferências de acessibilidade do site (etapa 8, adaptado de PreferencesProvider.jsx da
// TrocaTicket 2.0). Estado de módulo, como o idioma: qualquer componente lê com
// usePreferencias(), e as mudanças são aplicadas no <html> na hora.
// - No painel, as escolhas ficam em prévia até "Salvar preferências"; fechar descarta a prévia.
// - O botão claro/escuro do header e o fórum mudam o tema e gravam na hora.
// - O tema "Sistema" acompanha o modo claro ou escuro do aparelho.
import { useSyncExternalStore } from 'react';
import {
  CHAVE_PREFERENCIAS,
  CHAVE_TEMA,
  PADRAO,
  aplicarPreferencias,
  gravarPreferencias,
  lerPreferencias,
  temaResolvido,
  validarPreferencias,
} from './preferencias.js';

function armazenamento() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const consulta =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

let salvas = lerPreferencias(armazenamento());
let previa = null;
let sistemaEscuro = Boolean(consulta?.matches);
let erroGravacao = false;
let instantaneo;
const ouvintes = new Set();

function montarInstantaneo() {
  const preferencias = previa || salvas;
  instantaneo = {
    preferencias,
    salvas,
    emPrevia: previa !== null,
    temaAtual: temaResolvido(preferencias.tema, sistemaEscuro),
    erroGravacao,
  };
}

function aplicar() {
  if (typeof document === 'undefined') return;
  aplicarPreferencias(instantaneo.preferencias, document.documentElement, sistemaEscuro);
  // O fórum Troca-Papo lê o tema já resolvido do que está salvo (a prévia não conta).
  try {
    armazenamento()?.setItem(CHAVE_TEMA, temaResolvido(salvas.tema, sistemaEscuro));
  } catch {
    // Sem armazenamento, o tema vale só nesta visita.
  }
}

function emitir() {
  montarInstantaneo();
  aplicar();
  ouvintes.forEach((ouvinte) => ouvinte());
}

montarInstantaneo();
aplicar();

consulta?.addEventListener?.('change', (evento) => {
  sistemaEscuro = evento.matches;
  emitir();
});

if (typeof window !== 'undefined') {
  // Outra aba salvou: atualiza o salvo sem descartar a prévia em edição.
  window.addEventListener('storage', (evento) => {
    if (evento.key !== CHAVE_PREFERENCIAS && evento.key !== null) return;
    salvas = lerPreferencias(armazenamento());
    emitir();
  });
}

export function iniciarPrevia() {
  previa = { ...salvas };
  emitir();
}

export function alterarPrevia(chave, valor) {
  previa = validarPreferencias({ ...(previa || salvas), [chave]: valor });
  emitir();
}

export function cancelarPrevia() {
  if (previa === null) return;
  previa = null;
  emitir();
}

export function restaurarPadrao() {
  previa = { ...PADRAO };
  emitir();
}

export function salvarPreferencias() {
  salvas = validarPreferencias(previa || salvas);
  previa = null;
  erroGravacao = !gravarPreferencias(armazenamento(), salvas);
  emitir();
  return !erroGravacao;
}

// Botão claro/escuro do header e tema escolhido dentro do fórum: valem na hora.
export function definirTema(tema) {
  salvas = validarPreferencias({ ...salvas, tema });
  if (previa) previa = validarPreferencias({ ...previa, tema });
  erroGravacao = !gravarPreferencias(armazenamento(), salvas);
  emitir();
}

const inscrever = (ouvinte) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};

export function usePreferencias() {
  return useSyncExternalStore(
    inscrever,
    () => instantaneo,
    () => instantaneo,
  );
}

export { PADRAO };
