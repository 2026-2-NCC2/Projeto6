import { API_URL } from './api';

async function request(path, options, fallback) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(
      'Não foi possível conectar à API. Verifique se o servidor e o banco estão ativos.',
      {
        cause: error,
      },
    );
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

export function getCommunityMessages(userId, signal) {
  return request(
    `/comunidade/mensagens?usuarioId=${encodeURIComponent(userId)}`,
    { signal },
    'Não foi possível carregar as mensagens da comunidade.',
  );
}

export function createCommunityMessage(userId, text) {
  return request(
    '/comunidade/mensagens',
    json('POST', { userId, text }),
    'Não foi possível publicar a mensagem.',
  );
}

export function deleteCommunityMessage(messageId, userId) {
  return request(
    `/comunidade/mensagens/${encodeURIComponent(messageId)}`,
    json('DELETE', { userId }),
    'Não foi possível remover a mensagem.',
  );
}
