// Regras dos cards da homepage do Usuário. Funções puras, sem dependências, para
// poderem ser testadas com node --test (src/tests/painelUsuario.test.js).

// "Carlos Eduardo Mendes" -> "Carlos". Nome vazio -> ''.
export function primeiroNome(nome) {
  return (
    String(nome || '')
      .trim()
      .split(/\s+/)[0] || ''
  );
}

const CAMPOS_PERFIL = [
  ['name', 'nome'],
  ['email', 'e-mail'],
  ['phone', 'telefone'],
  ['photo', 'foto'],
];

// Quanto do perfil está preenchido e o que falta (para o card "Complete seu perfil").
export function progressoPerfil(perfil = {}) {
  const faltando = CAMPOS_PERFIL.filter(([campo]) => !String(perfil?.[campo] || '').trim()).map(
    ([, rotulo]) => rotulo,
  );
  const percentual = Math.round(
    ((CAMPOS_PERFIL.length - faltando.length) / CAMPOS_PERFIL.length) * 100,
  );
  return { percentual, faltando };
}

// Dias entre hoje e uma data ISO (AAAA-MM-DD). Data inválida -> null.
export function diasAte(iso, hoje = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
  const [ano, mes, dia] = iso.split('-').map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86400000);
}

export function rotuloDias(dias) {
  if (dias === null || dias === undefined) return '';
  if (dias <= 0) return 'É hoje!';
  return dias === 1 ? 'É amanhã!' : `Faltam ${dias} dias`;
}

// Ingressos que ainda valem: da conta (statusCode "A") ou reservas da demonstração
// que não foram canceladas.
export function ingressosAtivos(ingressos = []) {
  return (ingressos || []).filter((ingresso) =>
    ingresso?.statusCode ? ingresso.statusCode === 'A' : ingresso?.status !== 'Cancelado',
  );
}

// Próximo evento com data conhecida entre os ingressos ativos (só contas têm data ISO).
export function proximoIngresso(ingressos = [], hoje = new Date()) {
  return (
    ingressosAtivos(ingressos)
      .map((ingresso) => ({ ...ingresso, dias: diasAte(ingresso.date, hoje) }))
      .filter((ingresso) => ingresso.dias !== null && ingresso.dias >= 0)
      .sort((a, b) => a.dias - b.dias)[0] || null
  );
}

// Lê do estado salvo pelo Troca-Papo (JSON do localStorage) quais notificações já foram lidas.
export function notificacoesLidas(textoSalvo) {
  try {
    const lidas = JSON.parse(textoSalvo || 'null')?.notificacoesLidas;
    return Array.isArray(lidas) ? lidas.map(String) : [];
  } catch {
    return [];
  }
}

export function notificacoesNaoLidas(notificacoes = [], lidas = []) {
  const jaLidas = new Set((lidas || []).map(String));
  return (notificacoes || []).filter((notificacao) => !jaLidas.has(String(notificacao.id)));
}

export function plural(quantidade, singular, pluralTexto) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}
