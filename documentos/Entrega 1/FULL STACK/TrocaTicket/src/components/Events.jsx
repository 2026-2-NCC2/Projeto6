import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getEvents } from '../services/events';
import EventCard from './EventCard';

export const currency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function useEvents() {
  const [params] = useSearchParams();
  const simulateError = params.get('erro') === '1';
  const [state, setState] = useState({ loading: true, events: [], error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, events: [], error: '' });
    getEvents(controller.signal, simulateError && attempt === 0)
      .then((events) => setState({ loading: false, events, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ loading: false, events: [], error: error.message });
      });
    return () => controller.abort();
  }, [simulateError, attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
export function LoadState({ loading, error, retry }) {
  if (loading)
    return (
      <p className="feedback" role="status">
        Carregando eventos…
      </p>
    );
  if (error)
    return (
      <div className="feedback" role="alert">
        <p>{error}</p>
        <button className="button primary" onClick={retry}>
          Tentar novamente
        </button>
      </div>
    );
  return null;
}

export default function Events({ catalog = false }) {
  const state = useEvents();
  const [query, setQuery] = useState('');
  const events = state.events.filter((event) =>
    `${event.title} ${event.location}`
      .toLocaleLowerCase('pt-BR')
      .includes(query.toLocaleLowerCase('pt-BR')),
  );
  return (
    <section className="events section" aria-labelledby="events-title">
      <div className="section-row">
        <div>
          <p className="eyebrow purple">Eventos</p>
          <h2 id="events-title">
            {catalog ? 'Encontre seu próximo evento' : 'Festivais de Música'}
          </h2>
        </div>
        {!catalog && (
          <Link className="text-link" to="/eventos">
            Ver todos os eventos <span aria-hidden="true">›</span>
          </Link>
        )}
      </div>
      {catalog && (
        <label className="search">
          Buscar por evento ou local
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por nome ou cidade"
          />
        </label>
      )}
      <LoadState {...state} />
      {!state.loading && !state.error && (
        <>
          <div className="grid">
            {(catalog ? events : events.slice(0, 3)).map((event) => (
              <EventCard key={event.id} event={event} variant="public" />
            ))}
          </div>
          {events.length === 0 && (
            <p role="status">Nenhum evento encontrado. Experimente outro nome ou cidade.</p>
          )}
        </>
      )}
    </section>
  );
}
