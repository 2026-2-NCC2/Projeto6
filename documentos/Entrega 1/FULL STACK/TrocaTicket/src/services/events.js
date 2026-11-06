// JSON local simula uma API. Substitua a URL quando o backend estiver disponível.
export async function getEvents(signal, simulateError = false) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
  if (simulateError) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  const response = await fetch('/data/events.json', { signal });
  if (!response.ok) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  return response.json();
}
const API_ORGANIZADORES = 'http://localhost:3000/api/organizadores';

export const organizerService = {
  getAll: () => fetch(API_ORGANIZADORES).then((res) => res.json()),
  create: (data) =>
    fetch(API_ORGANIZADORES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => res.json()),
  update: (id, data) =>
    fetch(`${API_ORGANIZADORES}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => res.json()),
  remove: (id) =>
    fetch(`${API_ORGANIZADORES}/${id}`, { method: 'DELETE' }).then((res) => res.json()),
};