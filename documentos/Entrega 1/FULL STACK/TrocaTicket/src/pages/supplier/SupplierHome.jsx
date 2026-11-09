import React, { useEffect, useMemo, useState } from 'react';
import { supplierOpportunities as opportunities } from '../../data/supplier';
import { Empty, PageTitle } from '../../components/UI';
import SearchToolbar from '../../components/supplier/SearchToolbar';
import SummaryBar from '../../components/supplier/SummaryBar';
import OpportunityCard from '../../components/supplier/OpportunityCard';
import { Chip } from '../../components/supplier/common';
import { useStore } from '../../context/Store';
import { getSupplierOpportunities } from '../../services/supplier';

const STATUSES = ['Cotação aberta', 'Em análise', 'Alta prioridade'];
const SORTS = [
  { value: 'date-desc', label: 'Data do evento' },
  { value: 'date-asc', label: 'Data mais próxima' },
  { value: 'name', label: 'Nome' },
];
const normalize = (text) =>
  text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
const clock = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function SupplierHome() {
  const { data, role } = useStore();
  const supplierId = Number(data.supplierProfile?.id);
  const connectedSupplier =
    role === 'fornecedor' && Number.isSafeInteger(supplierId) && supplierId > 0;
  const [databaseEvents, setDatabaseEvents] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [sort, setSort] = useState('date-desc');
  const [category, setCategory] = useState('Todas');
  const [onlyPending, setOnlyPending] = useState(false);
  const [updatedAt] = useState(clock);
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
    <div className="workspace sp-page">
      <SearchToolbar
        query={query}
        onQuery={setQuery}
        searchLabel="Buscar oportunidades"
        placeholder="Buscar por evento, artista ou código…"
        filters={[
          {
            id: 'status',
            label: 'Status:',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'Todos', label: `Todos os eventos (${list.length})` },
              ...STATUSES.map((value) => ({ value, label: `${value} (${countBy(value)})` })),
            ],
          },
          { id: 'sort', label: 'Ordenar:', value: sort, onChange: setSort, options: SORTS },
        ]}
        advancedCount={advancedCount}
        advanced={
          <>
            <label className="sp-select">
              <span>Categoria de serviço:</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {['Todas', ...categories].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="sp-check">
              <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
              Somente sem proposta enviada
            </label>
            <button type="button" className="sp-link-button" onClick={clearFilters}>
              Limpar filtros
            </button>
          </>
        }
      />

      <SummaryBar
        items={[
          { label: 'Oportunidades em destaque', value: `${list.length} ativas` },
          { label: 'Propostas aguardando envio', value: `${pending} pendentes`, tone: 'warning' },
        ]}
        trailing={`Última atualização: hoje às ${updatedAt}`}
      />
      {loadError && (
        <div className="api-error" role="alert">
          <span>Não foi possível carregar eventos do banco: {loadError}</span>
          <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading && <p role="status" className="muted">Carregando oportunidades do banco de dados…</p>}

      <PageTitle
        title={
          <span className="sp-title-with-chip">
            Grade de eventos disponíveis
            <span aria-live="polite">
              <Chip tone="blue">
                {events.length} {events.length === 1 ? 'oportunidade' : 'oportunidades'}
              </Chip>
            </span>
          </span>
        }
        subtitle="Selecione uma cotação para submeter valores e gerenciar escopos contratuais."
      />

      {events.length > 0 ? (
        <div className="sp-grid-cards">
          {events.map((event) => (
            // a numeração (EVENTO I, II…) acompanha a posição original, não muda ao filtrar
            <OpportunityCard key={event.id} event={event} index={list.indexOf(event)} />
          ))}
        </div>
      ) : (
        <Empty>
          Nenhuma oportunidade com esses filtros.{' '}
          <button type="button" className="sp-link-button" onClick={clearFilters}>
            Limpar filtros
          </button>
        </Empty>
      )}
    </div>
  );
}
