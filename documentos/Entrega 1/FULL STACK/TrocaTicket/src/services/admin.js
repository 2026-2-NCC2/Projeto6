// Administração ligada ao banco, aprovação de contas e cancelamento de evento
// (etapa 6 da integração com a TrocaTicket 2.0). Gravações levam Idempotency-Key.
import { request } from './orders';
import { localeAtual } from '../i18n';

const gravar = (path, body, chave, fallback) =>
  request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': chave },
      body: JSON.stringify(body),
    },
    fallback,
  );

export const minhaAprovacao = (signal) =>
  request('/conta/aprovacao', { signal }, 'Não foi possível consultar a situação da conta.');

export const resumoAdmin = (signal) =>
  request('/admin/resumo', { signal }, 'Não foi possível carregar o resumo da administração.');

export function listarContas({ situacao = '', perfil = '', busca = '' } = {}, signal) {
  const params = new URLSearchParams();
  if (situacao) params.set('situacao', situacao);
  if (perfil) params.set('perfil', perfil);
  if (busca.trim()) params.set('busca', busca.trim());
  const filtro = params.toString();
  return request(
    `/admin/contas${filtro ? `?${filtro}` : ''}`,
    { signal },
    'Não foi possível carregar as contas.',
  );
}

export const decidirConta = (id, { situacao, motivo = '' }, chave) =>
  gravar(
    `/admin/contas/${encodeURIComponent(id)}/aprovacao`,
    { situacao, motivo },
    chave,
    'Não foi possível registrar a decisão.',
  );

export const listarEventosAdmin = (signal) =>
  request('/admin/eventos', { signal }, 'Não foi possível carregar os eventos.');

export const relatorioEvento = (id, signal) =>
  request(
    `/admin/eventos/${encodeURIComponent(id)}`,
    { signal },
    'Não foi possível carregar o relatório do evento.',
  );

// Organizador dono do evento ou administração. Cancela ingressos e estorna quem pagou (simulação).
export const cancelarEvento = (id, motivo, chave) =>
  gravar(
    `/eventos/${encodeURIComponent(id)}/cancelar`,
    { motivo },
    chave,
    'Não foi possível cancelar o evento.',
  );

export const SITUACAO_CONTA = {
  P: ['Aguardando aprovação', 'amber'],
  A: ['Aprovada', 'green'],
  R: ['Recusada', 'red'],
};

export const PERFIL_CONTA = {
  comprador: 'Usuário',
  organizador: 'Organizador',
  fornecedor: 'Fornecedor',
  admin: 'Administração',
};

// Data de hoje no horário de Brasília (AAAA-MM-DD).
export const hojeEmBrasilia = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

// Situação exibida do evento: "Encerrado" quando a data final já passou.
export function situacaoEvento(evento, hoje = hojeEmBrasilia()) {
  if (evento.status === 'Cancelado') return ['Cancelado', 'red'];
  if (evento.status === 'Publicado' && evento.endDate && evento.endDate < hoje) {
    return ['Encerrado', 'gray'];
  }
  if (evento.status === 'Publicado') return ['Publicado', 'green'];
  return [evento.status || 'Rascunho', 'amber'];
}

// Documento parcialmente oculto: mostra só os 4 últimos dígitos.
export function documentoOculto(documento) {
  const digitos = String(documento || '').replace(/\D/g, '');
  if (!digitos) return 'Não informado';
  return `${'•'.repeat(Math.max(0, digitos.length - 4))}${digitos.slice(-4)}`;
}

export function documentoFormatado(documento) {
  const d = String(documento || '').replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return d || 'Não informado';
}

// "26/11/2026, 14:30" no horário de Brasília.
export const dataHoraBrasilia = (iso) =>
  iso
    ? new Date(iso).toLocaleString(localeAtual(), {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

// Aviso depois do cancelamento: quantos estornos simulados e o total.
export function mensagemCancelamento({ refunds, refundedAmount }) {
  if (!refunds) return 'Evento cancelado. Não havia valor a estornar.';
  const total = Number(refundedAmount).toLocaleString(localeAtual(), {
    style: 'currency',
    currency: 'BRL',
    currencyDisplay: 'narrowSymbol',
  });
  return `Evento cancelado. ${refunds} ${refunds === 1 ? 'estorno simulado' : 'estornos simulados'}, total de ${total}.`;
}
