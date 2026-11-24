import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getEvents, getPublishedEvents } from '../services/events';
import EventCard from './EventCard';
import { useStore } from '../context/Store';

export const currency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function useEvents() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useStore();
  const simulateError = params.get('erro') === '1';
  const [state, setState] = useState({ loading: true, events: [], error: '', warning: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, events: [], error: '', warning: '' });
    (isAuthenticated ? Promise.resolve([]) : getEvents(controller.signal, simulateError && attempt === 0))
      .then(async (events) => {
        try {
          const published = await getPublishedEvents(controller.signal);
          const byId = new Map([...events, ...published].map((event) => [String(event.id), event]));
          setState({ loading: false, events: [...byId.values()], error: '', warning: '' });
        } catch (error) {
          if (error.name === 'AbortError') return;
          setState(isAuthenticated
            ? { loading: false, events: [], error: `Não foi possível carregar eventos do banco de dados. ${error.message}`, warning: '' }
            : {
                loading: false,
                events,
                error: '',
                warning: `A API não está disponível; exibindo apenas os eventos de demonstração. ${error.message}`,
              });
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ loading: false, events: [], error: error.message, warning: '' });
      });
    return () => controller.abort();
  }, [attempt, isAuthenticated, simulateError]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
export function LoadState({ loading, error, retry, warning }) {
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
  if (warning)
    return (
      <p className="feedback warning" role="status">
        {warning}
      </p>
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
