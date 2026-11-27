import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getEvents, getPublishedEvents } from '../services/events';
import EventCard from './EventCard';
import { useStore } from '../context/Store';
import { t } from '../i18n';
import { money } from './UI';

export const currency = (value) => money(value);

// Eventos exibidos no site:
// - conta autenticada: só os eventos do banco (API);
// - modo demonstração: só a vitrine local (/data/events.json), sem chamar a API;
// - visitante: vitrine local + eventos publicados na API, quando ela estiver no ar.
//   Se a API não responder, a vitrine local aparece normalmente, sem aviso técnico.
export function useEvents() {
  const [params] = useSearchParams();
  const { isAuthenticated, role } = useStore();
  const isDemo = !isAuthenticated && Boolean(role);
  const simulateError = params.get('erro') === '1';
  const [state, setState] = useState({ loading: true, events: [], error: '', warning: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, events: [], error: '', warning: '' });
    (isAuthenticated ? Promise.resolve([]) : getEvents(controller.signal, simulateError && attempt === 0))
      .then(async (events) => {
        if (isDemo) {
          setState({ loading: false, events, error: '', warning: '' });
          return;
        }
        try {
          const published = await getPublishedEvents(controller.signal);
          const byId = new Map([...events, ...published].map((event) => [String(event.id), event]));
          setState({ loading: false, events: [...byId.values()], error: '', warning: '' });
        } catch (error) {
          if (error.name === 'AbortError') return;
          setState(
            isAuthenticated
              ? {
                  loading: false,
                  events: [],
                  error: `Não foi possível carregar eventos do banco de dados. ${error.message}`,
                  warning: '',
                }
              : { loading: false, events, error: '', warning: '' },
          );
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ loading: false, events: [], error: error.message, warning: '' });
      });
    return () => controller.abort();
  }, [attempt, isAuthenticated, isDemo, simulateError]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
export function LoadState({ loading, error, retry, warning }) {
  if (loading)
    return (
      <p className="feedback" role="status">
        {t('Carregando eventos…')}
      </p>
    );
  if (error)
    return (
      <div className="feedback" role="alert">
        <p>{t(error)}</p>
        <button className="button primary" onClick={retry}>
          {t('Tentar novamente')}
        </button>
      </div>
    );
  if (warning)
    return (
      <p className="feedback warning" role="status">
        {t(warning)}
      </p>
    );
  return null;
}

export default function Events({ catalog = false }) {
  return <EventList catalog={catalog} state={useEvents()} />;
}

export function EventList({ catalog = false, state, title = 'Festivais de Música' }) {
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
          <p className="eyebrow purple">{t('Eventos')}</p>
          <h2 id="events-title">
            {catalog ? t('Encontre seu próximo evento') : t(title)}
          </h2>
        </div>
        {!catalog && (
          <Link className="text-link" to="/eventos">
            {t('Ver todos os eventos')} <span aria-hidden="true">›</span>
          </Link>
        )}
      </div>
      {catalog && (
        <label className="search">
          {t('Buscar por evento ou local')}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Busque por nome ou cidade')}
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
            <p role="status">{t('Nenhum evento encontrado. Experimente outro nome ou cidade.')}</p>
          )}
        </>
      )}
    </section>
  );
}
