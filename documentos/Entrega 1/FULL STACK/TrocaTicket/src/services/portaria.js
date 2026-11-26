// Portaria e atendimento (etapa 5 da integração com a TrocaTicket 2.0).
// As gravações levam Idempotency-Key: repetir a mesma ação devolve a mesma resposta.
import { request } from './orders';

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

export const listarEventosPortaria = (signal) =>
  request('/portaria/eventos', { signal }, 'Não foi possível carregar os seus eventos.');

export const resumoPortaria = (eventId, signal) =>
  request(
    `/portaria/eventos/${eventId}`,
    { signal },
    'Não foi possível carregar as entradas do evento.',
  );

export const validarEntrada = (eventId, code, chave) =>
  gravar('/portaria/entradas', { eventId, code }, chave, 'Não foi possível validar o ingresso.');

export const listarAtendimentos = (signal) =>
  request('/atendimentos', { signal }, 'Não foi possível carregar os atendimentos.');

export const abrirAtendimento = (dados, chave) =>
  gravar('/atendimentos', dados, chave, 'Não foi possível registrar a solicitação.');

export const responderAtendimento = (id, dados, chave) =>
  gravar(`/atendimentos/${id}/mensagens`, dados, chave, 'Não foi possível enviar a mensagem.');

export const SITUACAO_ATENDIMENTO = {
  aberto: ['Aberto', 'blue'],
  em_analise: ['Em análise', 'amber'],
  encerrado: ['Encerrado', 'gray'],
};

export const horaBrasilia = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
