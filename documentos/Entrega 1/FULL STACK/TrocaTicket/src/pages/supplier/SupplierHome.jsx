import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { supplierOpportunities as opportunities } from '../../data/supplier';
import { Empty, PageTitle } from '../../components/UI';
import SearchToolbar from '../../components/supplier/SearchToolbar';
import Icon from '../../components/supplier/Icon';
import OpportunityCard from '../../components/supplier/OpportunityCard';
import { useStore } from '../../context/Store';
import { getSupplierOpportunities } from '../../services/supplier';
import { t } from '../../i18n';

const STATUSES = ['Cotação aberta', 'Em análise', 'Alta prioridade'];
const SORTS = [
  { value: 'date-desc', label: 'Data do evento' },
  { value: 'date-asc', label: 'Data mais próxima' },
  { value: 'name', label: 'Nome' },
];
const normalize = (text) =>
  text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function SupplierHome() {
  const { data, role, isAuthenticated } = useStore();
  const supplierId = Number(data.supplierProfile?.id);
  const connectedSupplier =
    isAuthenticated && role === 'fornecedor' && Number.isSafeInteger(supplierId) && supplierId > 0;
  const [databaseEvents, setDatabaseEvents] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(connectedSupplier);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [sort, setSort] = useState('date-desc');
  const [category, setCategory] = useState('Todas');
  const [onlyPending, setOnlyPending] = useState(false);
  const list = connectedSupplier ? databaseEvents : opportunities;
  const categories = [...new Set(list.map((event) => event.category).filter(Boolean))];

  useEffect(() => {
    if (!connectedSupplier) return undefined;
    const controller = new AbortController();
    setLoading(true);
    getSupplierOpportunities(supplierId, controller.signal)
      .then((events) => {
        setDatabaseEvents(events);
        setLoadError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [connectedSupplier, retry, supplierId]);

  const countBy = (value) => list.filter((event) => event.status === value).length;
  const pending = list.filter((event) => !event.proposal).length;
  const countsReady = !loading && !loadError;
  const advancedCount = (category !== 'Todas') + onlyPending;

  const events = useMemo(() => {
    const term = normalize(query.trim());
    return list
      .filter((event) => {
        const haystack = normalize(
          [event.title, event.subtitle, event.organizer, event.location, ...(event.services || [])].join(' '),
        );
        return (
          haystack.includes(term) &&
          (status === 'Todos' || event.status === status) &&
          (category === 'Todas' || event.category === category) &&
          (!onlyPending || !event.proposal)
        );
      })
      .sort((a, b) => {
        if (sort === 'name') return a.title.localeCompare(b.title, 'pt-BR');
        if (sort === 'date-asc') return a.date.localeCompare(b.date);
        return b.date.localeCompare(a.date);
      });
  }, [list, query, status, sort, category, onlyPending]);

  function clearFilters() {
    setQuery('');
    setStatus('Todos');
    setCategory('Todas');
    setOnlyPending(false);
  }

  return (
    <div className="workspace sp-page sp-home">
      <PageTitle
        title={t('Painel do Fornecedor')}
        subtitle={data.supplierProfile?.tradeName || data.supplierProfile?.name}
      >
        <Link className="button outline" to="/fornecedor/inventario">
          <Icon name="box" /> {t('Inventário')}
        </Link>
        <Link className="button primary" to="/fornecedor/propostas">
          <Icon name="file" /> {t('Minhas propostas')}
        </Link>
      </PageTitle>

      <dl className="sp-home-counts" aria-label={t('Resumo das oportunidades')}>
        <div>
          <dt><Icon name="calendar" /> {t('Eventos disponíveis')}</dt>
          <dd>{countsReady ? list.length : '—'}</dd>
        </div>
        <div>
          <dt><Icon name="clock" /> {t('Sem proposta enviada')}</dt>
          <dd>{countsReady ? pending : '—'}</dd>
        </div>
        <div>
          <dt><Icon name="check" /> {t('Com proposta enviada')}</dt>
          <dd>{countsReady ? list.length - pending : '—'}</dd>
        </div>
      </dl>

      <h2 className="sp-home-heading">{t('Oportunidades de cotação')}</h2>
      <SearchToolbar
        query={query}
        onQuery={setQuery}
        searchLabel={t('Buscar oportunidades')}
        placeholder={t('Buscar por evento, artista ou código…')}
        filters={[
          {
            id: 'status',
            label: 'Status:',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'Todos', label: `${t('Todos os eventos')} (${list.length})` },
              ...STATUSES.map((value) => ({ value, label: `${t(value)} (${countBy(value)})` })),
            ],
          },
          { id: 'sort', label: 'Ordenar:', value: sort, onChange: setSort, options: SORTS },
        ]}
        advancedCount={advancedCount}
        advanced={
          <>
            <label className="sp-select">
              <span>{t('Categoria de serviço:')}</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {['Todas', ...categories].map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sp-check">
              <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
              {t('Somente sem proposta enviada')}
            </label>
            <button type="button" className="sp-link-button" onClick={clearFilters}>
              {t('Limpar filtros')}
            </button>
          </>
        }
      />

      {loadError && (
        <div className="api-error" role="alert">
          <span>{t('Não foi possível carregar eventos do banco:')} {t(loadError)}</span>
          <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
            {t('Tentar novamente')}
          </button>
        </div>
      )}
      {loading && <p role="status" className="muted">{t('Carregando oportunidades do banco de dados…')}</p>}

      {countsReady && events.length > 0 && (
        <p className="sp-home-results" role="status">
          {events.length} {events.length === 1 ? t('oportunidade disponível') : t('oportunidades disponíveis')}
        </p>
      )}
      {countsReady && (events.length > 0 ? (
        <div className="sp-grid-cards">
          {events.map((event) => (
            // a numeração (EVENTO I, II…) acompanha a posição original, não muda ao filtrar
            <OpportunityCard key={event.id} event={event} index={list.indexOf(event)} />
          ))}
        </div>
      ) : (
        <Empty>
          {list.length ? (
            <>
              {t('Nenhuma oportunidade com esses filtros.')}{' '}
              <button type="button" className="sp-link-button" onClick={clearFilters}>
                {t('Limpar filtros')}
              </button>
            </>
          ) : t('Quando houver eventos publicados para cotação, eles aparecerão aqui.')}
        </Empty>
      ))}
    </div>
  );
}
