import React, { useState } from 'react';
import { Field, PageTitle, Panel, Tabs } from '../../components/UI';
import { useI18n } from '../../i18n';
import { normalizeSearch } from '../../services/rules';
import { EmptyList, Price, QueryState, useQuery } from '../shared';
import ListaPropostas from '../componentes/ListaPropostas';

export default function CatalogoFornecedores() {
  const { t } = useI18n();
  const suppliers = useQuery('/fornecedores');
  const products = useQuery('/produtos');
  const proposals = useQuery('/propostas');
  const [tab, setTab] = useState('Fornecedores');
  const [query, setQuery] = useState('');
  const source =
    tab === 'Fornecedores' ? suppliers : tab === 'Insumos & Materiais' ? products : proposals;
  const filtered = (source.data || []).filter((item) =>
    normalizeSearch(
      `${item.name || item.productName || ''} ${item.description || ''} ${item.eventTitle || ''}`,
    ).includes(normalizeSearch(query)),
  );
  return (
    <div className="workspace">
      <PageTitle
        title={t('Insumos e Fornecedores')}
        subtitle={t(
          'Consulte fornecedores aprovados, recursos e propostas acessíveis à sua conta.',
        )}
      />
      <Tabs
        options={['Fornecedores', 'Insumos & Materiais', 'Contratos & Propostas']}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setQuery('');
        }}
      />
      <Panel>
        <Field
          label={t('Buscar no catálogo de fornecedores')}
          name="directory-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <QueryState state={source}>
          {tab === 'Contratos & Propostas' ? (
            <ListaPropostas organizer proposals={filtered} reload={proposals.reload} />
          ) : filtered.length ? (
            <div className="mvp-stack">
              {filtered.map((item) => (
                <article className="mvp-list-row" key={item.id}>
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.description}</p>
                    {tab === 'Fornecedores' ? (
                      <ul>
                        {item.items.map((p) => (
                          <li key={p.id}>
                            {p.name} · <Price value={p.priceCents} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        <Price value={item.priceCents} /> · {t('Disponíveis')}:{' '}
                        {item.available ?? item.stock}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyList />
          )}
        </QueryState>
      </Panel>
    </div>
  );
}
