// Preferências de acessibilidade (etapa 8, adaptado de src/accessibility/preferences.js da
// TrocaTicket 2.0). Funções puras: recebem o armazenamento e o elemento raiz, para poderem ser
// testadas com node --test.

export const CHAVE_PREFERENCIAS = 'trocaticket-acessibilidade';
// Tema já resolvido (claro ou escuro). O fórum Troca-Papo lê e grava esta chave.
export const CHAVE_TEMA = 'trocaticket-theme';
export const TAMANHOS_FONTE = [100, 125, 150, 175, 200];
export const TEMAS = ['light', 'dark', 'system'];
// Níveis 0 a 3: o 0 mantém o espaçamento original de cada componente.
export const ESPACO_LETRAS = ['0', '0.04em', '0.08em', '0.12em'];
export const ALTURA_LINHAS = ['normal', '1.5', '1.75', '2'];

export const PADRAO = Object.freeze({
  tema: 'light',
  tamanhoFonte: 100,
  espacoLetras: 0,
  espacoLinhas: 0,
  altoContraste: false,
  fonteLegivel: false,
  destacarLinks: false,
});

export function validarPreferencias(valor) {
  const origem = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
  const resultado = { ...PADRAO };
  if (TEMAS.includes(origem.tema)) resultado.tema = origem.tema;
  if (TAMANHOS_FONTE.includes(origem.tamanhoFonte)) resultado.tamanhoFonte = origem.tamanhoFonte;
  for (const chave of ['espacoLetras', 'espacoLinhas']) {
    if ([0, 1, 2, 3].includes(origem[chave])) resultado[chave] = origem[chave];
  }
  for (const chave of ['altoContraste', 'fonteLegivel', 'destacarLinks']) {
    if (typeof origem[chave] === 'boolean') resultado[chave] = origem[chave];
  }
  return resultado;
}

// Sem preferências salvas, o tema vem da escolha antiga do botão claro/escuro.
export function lerPreferencias(armazenamento) {
  let salvas = null;
  try {
    salvas = JSON.parse(armazenamento?.getItem(CHAVE_PREFERENCIAS) ?? 'null');
  } catch {
    salvas = null;
  }
  if (salvas?.versao === 1) return validarPreferencias(salvas.preferencias);
  let temaAntigo = null;
  try {
    temaAntigo = armazenamento?.getItem(CHAVE_TEMA);
  } catch {
    temaAntigo = null;
  }
  return { ...PADRAO, tema: temaAntigo === 'dark' ? 'dark' : 'light' };
}

export function gravarPreferencias(armazenamento, preferencias) {
  try {
    if (!armazenamento) return false;
    armazenamento.setItem(
      CHAVE_PREFERENCIAS,
      JSON.stringify({ versao: 1, preferencias: validarPreferencias(preferencias) }),
    );
    return true;
  } catch {
    return false;
  }
}

export function temaResolvido(tema, sistemaEscuro) {
  return tema === 'system'
    ? sistemaEscuro
      ? 'dark'
      : 'light'
    : tema === 'dark'
      ? 'dark'
      : 'light';
}

// Aplica no <html>: os estilos de acessibilidade.css leem estes atributos.
export function aplicarPreferencias(preferencias, raiz, sistemaEscuro) {
  const p = validarPreferencias(preferencias);
  raiz.dataset.theme = temaResolvido(p.tema, sistemaEscuro);
  raiz.dataset.contrast = p.altoContraste ? 'high' : 'normal';
  raiz.dataset.fonte = String(p.tamanhoFonte);
  raiz.dataset.letras = String(p.espacoLetras);
  raiz.dataset.linhas = String(p.espacoLinhas);
  raiz.dataset.legivel = String(p.fonteLegivel);
  raiz.dataset.links = String(p.destacarLinks);
  // Letra maior, espaçamentos ou fonte legível ocupam mais espaço: com "ampliado", o
  // acessibilidade.css troca para um layout que quebra linha (header no fluxo, colunas, menu ☰).
  raiz.dataset.ampliado = String(
    p.tamanhoFonte !== 100 || p.espacoLetras > 0 || p.espacoLinhas > 0 || p.fonteLegivel,
  );
  // 100% devolve o tamanho padrão do navegador (o CSS do site usa rem).
  raiz.style.fontSize = p.tamanhoFonte === 100 ? '' : `${p.tamanhoFonte}%`;
  raiz.style.setProperty('--leitura-espaco-letras', ESPACO_LETRAS[p.espacoLetras]);
  raiz.style.setProperty('--leitura-altura-linhas', ALTURA_LINHAS[p.espacoLinhas]);
}
