import { API_URL } from './api';

export async function getEvents(signal, simulateError = false) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
  if (simulateError) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  const response = await fetch('/data/events.json', { signal });
  if (!response.ok) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  return response.json();
}

export async function getPublishedEvents(signal) {
  const response = await fetch(`${API_URL}/eventos/publicados`, { signal });
  return readApiResponse(response, 'Não foi possível carregar eventos publicados do servidor.');
}

async function readApiResponse(response, fallbackMessage) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Resposta inválida do servidor.');
  }
  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }
  return result;
}

export async function getOrganizerEvents(organizerId, signal) {
  let response;
  try {
    response = await fetch(
      `${API_URL}/eventos?organizadorId=${encodeURIComponent(organizerId)}`,
      { signal },
    );
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API. Verifique se o servidor está rodando.');
  }
  return readApiResponse(response, 'Não foi possível carregar os eventos do organizador.');
}

export async function createEvent(organizerId, event) {
  let response;
  try {
    response = await fetch(`${API_URL}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, organizadorId: organizerId }),
    });
  } catch (error) {
    throw new Error(
      `Não foi possível conectar à API. Verifique se o servidor está rodando. ${error.message}`,
      { cause: error },
    );
  }
  return readApiResponse(response, 'Não foi possível cadastrar o evento.');
}

export async function updateEvent(eventId, organizerId, event) {
  let response;
  try {
    response = await fetch(`${API_URL}/eventos/${encodeURIComponent(eventId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, organizadorId: organizerId }),
    });
  } catch (error) {
    throw new Error(
      `Não foi possível conectar à API. Verifique se o servidor está rodando. ${error.message}`,
      { cause: error },
    );
  }
  return readApiResponse(response, 'Não foi possível atualizar o evento.');
}

export async function getEventReviews(eventId, signal) {
  const response = await fetch(`${API_URL}/eventos/${encodeURIComponent(eventId)}/avaliacoes`, { signal });
  return readApiResponse(response, 'Não foi possível carregar as avaliações do evento.');
}

export async function saveEventReview(eventId, userId, review) {
  const response = await fetch(`${API_URL}/eventos/${encodeURIComponent(eventId)}/avaliacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...review, userId }),
  });
  return readApiResponse(response, 'Não foi possível salvar sua avaliação.');
}

export async function getFavoriteEvents(userId, signal) {
  const response = await fetch(`${API_URL}/usuarios/${encodeURIComponent(userId)}/favoritos`, { signal });
  return readApiResponse(response, 'Não foi possível carregar seus eventos favoritos.');
}

export async function setFavoriteEvent(userId, eventId, saved) {
  const response = await fetch(
    `${API_URL}/usuarios/${encodeURIComponent(userId)}/favoritos/${encodeURIComponent(eventId)}`,
    { method: saved ? 'POST' : 'DELETE' },
  );
  if (response.status === 204) return;
  return readApiResponse(response, saved ? 'Não foi possível salvar o favorito.' : 'Não foi possível remover o favorito.');
}

export async function getOrganizerProposals(organizerId, eventId, signal) {
  const response = await fetch(
    `${API_URL}/organizadores/${encodeURIComponent(organizerId)}/eventos/${encodeURIComponent(eventId)}/propostas`,
    { signal },
  );
  return readApiResponse(response, 'Não foi possível carregar as propostas recebidas.');
}

export async function updateOrganizerProposal(organizerId, eventId, proposalId, status) {
  const response = await fetch(
    `${API_URL}/organizadores/${encodeURIComponent(organizerId)}/eventos/${encodeURIComponent(eventId)}/propostas/${encodeURIComponent(proposalId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  return readApiResponse(response, 'Não foi possível atualizar o status da proposta.');
}

export async function getOrganizerSuppliers(organizerId, signal) {
  const response = await fetch(
    `${API_URL}/organizadores/${encodeURIComponent(organizerId)}/fornecedores`,
    { signal },
  );
  return readApiResponse(response, 'Não foi possível carregar os fornecedores cadastrados.');
}

export async function getEventSuppliers(organizerId, eventId, signal) {
  const response = await fetch(
    `${API_URL}/organizadores/${encodeURIComponent(organizerId)}/eventos/${encodeURIComponent(eventId)}/fornecedores`,
    { signal },
  );
  return readApiResponse(response, 'Não foi possível carregar os fornecedores vinculados.');
}

export async function setEventSupplier(organizerId, eventId, supplierId, linked) {
  const response = await fetch(
    `${API_URL}/organizadores/${encodeURIComponent(organizerId)}/eventos/${encodeURIComponent(eventId)}/fornecedores/${encodeURIComponent(supplierId)}`,
    { method: linked ? 'POST' : 'DELETE' },
  );
  if (response.status === 204) return;
  return readApiResponse(response, linked ? 'Não foi possível vincular o fornecedor.' : 'Não foi possível remover o vínculo.');
}
