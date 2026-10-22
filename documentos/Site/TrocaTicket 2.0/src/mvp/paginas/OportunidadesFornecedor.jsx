import React, { useState } from 'react';
import { Link } from 'react-router';
import { Field, PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { normalizeSearch } from '../../services/rules';
import { dateTime } from '../api';
import { EmptyList, QueryState, useQuery } from '../shared';

export default function OportunidadesFornecedor() {
  const state = useQuery('/eventos');
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const events = (state.data || []).filter(
    (e) =>
      e.status === 'published' &&
      normalizeSearch(e.title + ' ' + e.venue).includes(normalizeSearch(query)),
  );
  return (
    <div className="workspace">
      <PageTitle
        title={t('Oportunidades para fornecedores')}
        subtitle={t('Ofereça produtos ou serviços aos eventos fictícios publicados.')}
      >
        <Link className="button outline" to="/fornecedor/inventario">
          {t('Meu inventário')}
        </Link>
      </PageTitle>
      <Panel>
        <Field
          label={t('Buscar evento')}
          name="opportunity-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <QueryState state={state}>
          {events.length ? (
            events.map((event) => (
              <article className="mvp-list-row" key={event.id}>
                <div>
                  <h2>{event.title}</h2>
                  <p>
                    {dateTime(event.dateISO, locale)} · {event.venue}
                  </p>
                  <p>{event.description}</p>
                </div>
                <Link className="button primary" to={`/fornecedor/cotacao/${event.id}`}>
                  {t('Preparar proposta')}
                </Link>
              </article>
            ))
          ) : (
            <EmptyList />
          )}
        </QueryState>
      </Panel>
    </div>
  );
}
