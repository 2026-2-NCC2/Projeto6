import React from 'react';
import { Link } from 'react-router';
import { PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { dateTime } from '../api';
import { EmptyList, QueryState, Status, useQuery } from '../shared';

export default function MeusEventos() {
  const { t, locale } = useI18n();
  const state = useQuery('/organizador/eventos');
  return (
    <div className="workspace">
      <PageTitle
        title={t('Meus eventos')}
        subtitle={t('Organize eventos fictícios e acompanhe as categorias e propostas.')}
      >
        <Link className="button primary" to="/organizador/novo">
          + {t('Novo evento')}
        </Link>
        <Link className="button outline" to="/portaria">
          {t('Portaria simulada')}
        </Link>
      </PageTitle>
      <Panel>
        <QueryState state={state}>
          {state.data?.length ? (
            <div className="organizer-grid">
              {state.data.map((event) => (
                <article className="event-card" key={event.id}>
                  <img className="mvp-card-cover" src={event.image || '/images/hero.jpg'} alt="" />
                  <div className="event-info">
                    <Status value={event.status} />
                    <h2>{event.title}</h2>
                    <p>
                      {dateTime(event.dateISO, locale)} · {event.venue}
                    </p>
                    <div className="mvp-stack">
                      <Link
                        className="button primary"
                        to={`/organizador/eventos/${event.id}/editar`}
                      >
                        {t('Editar evento')}
                      </Link>
                      <Link
                        className="button outline"
                        to={`/organizador/eventos/${event.id}/consolidar`}
                      >
                        {t('Propostas e orçamento')}
                      </Link>
                      <Link className="text-link" to={`/eventos/${event.id}`}>
                        {t('Visualizar evento')}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyList>{t('Você ainda não cadastrou eventos.')}</EmptyList>
          )}
        </QueryState>
      </Panel>
    </div>
  );
}
