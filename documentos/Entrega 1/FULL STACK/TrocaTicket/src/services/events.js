// JSON local simula uma API. Substitua a URL quando o backend estiver disponível.
export async function getEvents(signal, simulateError = false) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
  if (simulateError) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  const response = await fetch('/data/events.json', { signal });
  if (!response.ok) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  return response.json();
}
