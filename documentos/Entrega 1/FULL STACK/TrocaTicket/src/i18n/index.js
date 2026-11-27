// Idiomas do site (etapa 7, adaptado de src/i18n/index.js da TrocaTicket 2.0).
//
// - O texto em português é a própria chave: t('Meus pedidos') devolve a tradução do idioma
//   escolhido ou, se ela não existir, o texto original. Nada some por falta de tradução.
// - Chaves com {nome} aceitam valores: t('Pedido nº {id}', { id: 12 }).
// - Textos montados fora do site (por exemplo, mensagens de erro da API com números ou
//   horários) são reconhecidos pelos modelos com {nome}: os valores capturados entram sem
//   tradução, porque são dados.
// - Nomes de eventos, motivos e mensagens das pessoas são dados e não passam por aqui.
import { useSyncExternalStore } from 'react';
import { CHAVE_IDIOMA, COLUNAS, IDIOMAS, PADRAO, idiomaValido } from './idiomas.js';
import LINHAS from './textos/index.js';

// Ao reconhecer textos montados, marcadores com estes nomes só aceitam números: assim um
// modelo como "{n} eventos" não captura uma frase qualquer terminada em "eventos".
const NUMERICOS = new Set([
  'n',
  'quantidade',
  'total',
  'dias',
  'days',
  'horas',
  'length',
  'length2',
  'capacity',
  'pendingCount',
  'productCount',
  'rating',
  'left',
  'salvos',
  'skipped',
  'percentual',
  'current',
  'pages',
  'position',
  'minimo',
  'maximo',
  'maxMb',
  'maxMB',
  'size',
  'costPercent',
  'margin',
  'allocatedEvents',
  'LIMITE_POR_CONTA',
  'MAX_ABERTOS',
  'limitePorConta',
  'refunds',
]);
// Modelos com pouco texto fixo (por exemplo, "{v1} às {time}") servem só para chamadas com
// valores; reconhecer frases soltas com eles misturaria idiomas.
const MINIMO_DE_LETRAS = 5;

const dicionarios = Object.fromEntries(COLUNAS.map((codigo) => [codigo, new Map()]));
const modelos = [];
for (const linha of LINHAS) {
  const [fonte, ...traducoes] = linha;
  COLUNAS.forEach((codigo, indice) => {
    if (traducoes[indice]) dicionarios[codigo].set(fonte, traducoes[indice]);
  });
  if (/\{\w+\}/.test(fonte)) {
    const nomes = [];
    const partes = fonte.split(/\{(\w+)\}/);
    const fixo = partes.filter((_, indice) => indice % 2 === 0).join('');
    if ((fixo.match(/[A-Za-zÀ-ÿ]/g) || []).length < MINIMO_DE_LETRAS) continue;
    const padrao = partes
      .map((parte, indice) => {
        if (indice % 2) {
          nomes.push(parte);
          return NUMERICOS.has(parte) ? '(-?\\d[\\d.,]*)' : '([\\s\\S]+?)';
        }
        return parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    modelos.push({ fonte, nomes, peso: fixo.length, regex: new RegExp(`^${padrao}$`) });
  }
}
// O modelo mais específico (mais texto fixo) é tentado primeiro; empates mantêm a ordem das linhas.
modelos.sort((a, b) => b.peso - a.peso);

function lerIdiomaSalvo() {
  try {
    const salvo = globalThis.localStorage?.getItem(CHAVE_IDIOMA);
    return idiomaValido(salvo) ? salvo : PADRAO;
  } catch {
    return PADRAO;
  }
}

let idioma = lerIdiomaSalvo();
const ouvintes = new Set();
const lembrados = new Map();

function aplicarNoDocumento() {
  if (typeof document !== 'undefined') document.documentElement.lang = idioma;
}
aplicarNoDocumento();

export const idiomaAtual = () => idioma;
// Locale para datas, números e moeda (o valor continua em reais).
export const localeAtual = () => idioma;

export function definirIdioma(codigo) {
  if (!idiomaValido(codigo) || codigo === idioma) return;
  idioma = codigo;
  try {
    globalThis.localStorage?.setItem(CHAVE_IDIOMA, codigo);
  } catch {
    // Sem armazenamento, o idioma vale só nesta visita.
  }
  aplicarNoDocumento();
  ouvintes.forEach((ouvinte) => ouvinte());
}

function interpolar(texto, valores) {
  return texto.replace(/\{(\w+)\}/g, (marca, nome) =>
    valores && Object.hasOwn(valores, nome) ? String(valores[nome] ?? '') : marca,
  );
}

function traduzirParte(parte, dicionario, profundidade) {
  const exato = dicionario.get(parte);
  if (exato !== undefined) return exato;
  if (profundidade < 2 && /\S/.test(parte))
    return porModelo(parte, dicionario, profundidade + 1) ?? parte;
  return parte;
}

function porModelo(texto, dicionario, profundidade = 0) {
  const chave = `${idioma}\u0000${texto}`;
  if (lembrados.has(chave)) return lembrados.get(chave);
  let resultado = null;
  for (const modelo of modelos) {
    const achado = modelo.regex.exec(texto);
    if (!achado) continue;
    const traducao = dicionario.get(modelo.fonte);
    if (!traducao) continue;
    // Partes capturadas que também são textos do site (por exemplo, "O assunto") são
    // traduzidas; nomes, números e outros dados ficam como vieram.
    const valores = Object.fromEntries(
      modelo.nomes.map((nome, indice) => [
        nome,
        traduzirParte(achado[indice + 1], dicionario, profundidade),
      ]),
    );
    resultado = interpolar(traducao, valores);
    break;
  }
  if (lembrados.size > 2000) lembrados.clear();
  lembrados.set(chave, resultado);
  return resultado;
}

export function t(texto, valores) {
  if (typeof texto !== 'string' || !texto) return texto;
  if (idioma === PADRAO) return valores ? interpolar(texto, valores) : texto;
  const dicionario = dicionarios[idioma];
  const exato = dicionario.get(texto);
  if (exato !== undefined) return valores ? interpolar(exato, valores) : exato;
  if (!valores) {
    const montado = porModelo(texto, dicionario);
    if (montado !== null) return montado;
  }
  return valores ? interpolar(texto, valores) : texto;
}

// Plural simples: tn(3, '{n} evento', '{n} eventos') devolve "3 events" em inglês. As duas
// chaves levam {n}; a escolha entre singular e plural segue o português (1 = singular).
export function tn(quantidade, singular, plural) {
  return t(Number(quantidade) === 1 ? singular : plural, { n: quantidade });
}

const inscrever = (ouvinte) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};

// Componentes que chamam este hook são redesenhados quando o idioma muda.
export function useIdioma() {
  const atual = useSyncExternalStore(inscrever, idiomaAtual, () => PADRAO);
  return { idioma: atual, idiomas: IDIOMAS, definirIdioma, t };
}

export function formatarNumero(valor, opcoes) {
  return Number(valor || 0).toLocaleString(idioma, opcoes);
}

export function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString(idioma, {
    style: 'currency',
    currency: 'BRL',
    currencyDisplay: 'narrowSymbol',
  });
}

export { IDIOMAS, PADRAO };
