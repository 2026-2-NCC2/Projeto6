import { API_URL } from './api';

async function request(path, options, fallback) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API. Verifique se o servidor e o banco estão ativos.', {
      cause: error,
    });
  }

  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('A API retornou uma resposta inválida.');
  }
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

const json = (method, body, signal) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal,
});

export function getParticipantTickets(userId, signal) {
  return request(
    `/usuarios/${encodeURIComponent(userId)}/ingressos`,
    { signal },
    'Não foi possível carregar seus ingressos.',
  );
}

export function buySimulatedTickets(eventId, userId, type, quantity) {
  return request(
    `/eventos/${encodeURIComponent(eventId)}/ingressos`,
    json('POST', { userId, type, quantity }),
    'Não foi possível salvar a compra simulada.',
  );
}

export function cancelParticipantTicket(ticketId, userId) {
  return request(
    `/ingressos/${encodeURIComponent(ticketId)}/cancelar`,
    json('PUT', { userId }),
    'Não foi possível cancelar o ingresso.',
  );
}

export function getExchangeListings(userId, signal) {
  return request(
    `/trocas/ingressos?usuarioId=${encodeURIComponent(userId)}`,
    { signal },
    'Não foi possível carregar os ingressos disponíveis para troca.',
  );
}

export function setTicketExchangeListing(ticketId, userId, available) {
  return request(
    `/ingressos/${encodeURIComponent(ticketId)}/troca`,
    json('PUT', { userId, available }),
    'Não foi possível atualizar a disponibilidade para troca.',
  );
}

export function getParticipantExchangeOffers(userId, signal) {
  return request(
    `/usuarios/${encodeURIComponent(userId)}/trocas`,
    { signal },
    'Não foi possível carregar as solicitações de troca.',
  );
}

export function createExchangeOffer(userId, requestedTicketId, offeredTicketId) {
  return request(
    '/trocas',
    json('POST', { userId, requestedTicketId, offeredTicketId }),
    'Não foi possível enviar a solicitação de troca.',
  );
}

export function updateExchangeOffer(offerId, userId, action) {
  return request(
    `/trocas/${encodeURIComponent(offerId)}`,
    json('PUT', { userId, action }),
    'Não foi possível atualizar a solicitação de troca.',
  );
}
