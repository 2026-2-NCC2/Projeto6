const horas = (p) => (Date.now() - new Date(p.criadoEm).getTime()) / 3600000;

// Pontuação "em alta": votos perdem peso com o tempo.
const quente = (p, pontos) => pontos(p) / Math.pow(horas(p) + 2, 1.3);

export function ordenar(lista, modo, pontos, { fixarOficiais = false, fixarComunicados = false } = {}) {
  const l = [...lista];
  if (modo === "recentes") l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  else if (modo === "votados") l.sort((a, b) => pontos(b) - pontos(a));
  else if (modo === "em-alta") l.sort((a, b) => quente(b, pontos) - quente(a, pontos));
  else l.sort((a, b) => quente(b, pontos) + pontos(b) / 400 - (quente(a, pontos) + pontos(a) / 400));

  const fixo = (p) => p.fixado && ((fixarOficiais && p.oficial) || (fixarComunicados && p.comunicado));
  // Publicações oficiais fixadas aparecem em 2º lugar (como no protótipo).
  const fixados = l.filter(fixo);
  const resto = l.filter((p) => !fixo(p));
  if (fixarComunicados) return [...fixados, ...resto];
  if (fixados.length) resto.splice(Math.min(1, resto.length), 0, ...fixados);
  return resto;
}

export function filtrarPorBusca(lista, busca) {
  const termos = busca
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (!termos.length) return lista;
  return lista.filter((p) => {
    const alvo = [p.titulo, p.resumo, p.corpo, p.comunidade, p.autor, ...(p.etiquetas || [])]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    return termos.every((t) => alvo.includes(t));
  });
}
