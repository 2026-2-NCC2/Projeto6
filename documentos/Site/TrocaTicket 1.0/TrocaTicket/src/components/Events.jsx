import React, { useEffect, useState } from 'react';
import { useI18n, getLocale } from '../i18n';
import { Link, useSearchParams } from 'react-router';
import { getEvents } from '../services/events';
export const currency = (value) =>
  value.toLocaleString(getLocale(), { style: 'currency', currency: 'BRL' });
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
  const { t } = useI18n();
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
  return null;
}
export default function Events({ catalog = false }) {
  const { t } = useI18n();
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
          <p className="eyebrow purple">{t('Eventos')}</p>
          <h2 id="events-title">
            {catalog ? t('Encontre seu próximo evento') : t('Festivais de Música')}
          </h2>
        </div>
        {!catalog && (
          <Link className="text-link" to="/eventos">
            {t('Ver todos os eventos')}
            <span aria-hidden="true">›</span>
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
              <article className="event-card" key={event.id}>
                <div className="event-image">
                  <img loading="lazy" src={event.image} alt={event.imageAlt} />
                  <span className="verified">{t('✓ Verificado')}</span>
                </div>
                <div className="event-info">
                  <p className="event-meta">
                    {event.date} • {event.location}
                  </p>
                  <h3>{event.title}</h3>
                  <div className="event-bottom">
                    <div>
                      <small>{t('A partir de')}</small>
                      <strong>{currency(event.price)}</strong>
                    </div>
                    <Link
                      to={`/eventos/${event.id}`}
                      className="ticket-link"
                      aria-label={t('Ver ingressos: {title}', { title: event.title })}
                    >
                      {t('Ver Ingressos')}
                    </Link>
                  </div>
                </div>
              </article>
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
