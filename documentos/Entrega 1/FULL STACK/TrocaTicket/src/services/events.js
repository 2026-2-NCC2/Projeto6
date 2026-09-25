// JSON local simula uma API. Substitua a URL quando o backend estiver disponível.
export async function getEvents(signal, simulateError = false) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
  if (simulateError) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  const response = await fetch('/data/events.json', { signal });
  if (!response.ok) throw new Error('Não foi possível carregar os eventos. Tente novamente.');
  const events = await response.json();
  if (
    !Array.isArray(events) ||
    !events.every(
      (event) =>
        event &&
        ['id', 'title', 'date', 'location', 'image'].every(
          (key) => typeof event[key] === 'string',
        ) &&
        typeof event.price === 'number' &&
        Number.isFinite(event.price) &&
        event.price >= 0,
    )
  )
    throw new Error('Os dados dos eventos estão inválidos. Tente novamente.');
  return events;
}
