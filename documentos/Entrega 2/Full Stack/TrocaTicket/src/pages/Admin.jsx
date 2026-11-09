import React, { useState } from 'react';
import { Link } from 'react-router';
import { opportunities } from '../data/demo';
import { STATUS_TONE, eventReports } from '../data/reports';
import { Badge, DownloadButton, Empty, Panel, dateLabel, money } from '../components/UI';
import Pagination from '../components/Pagination';
import { Icon } from '../components/Icons';
import EventCard from '../components/EventCard';

// Tabela de lotes (dados de demonstração).
const lots = [
  ['LT-2032-TM1', 'tim-maia', 'Pista Premium', 5000, 3420, 'Aprovado'],
  ['LT-2031-LP2', 'lil-peep', 'Camarote Gold', 2500, 1890, 'Em revisão'],
  ['LT-2028-MJ3', 'michael', 'Arquibancada Geral', 12000, 8950, 'Pendente'],
  ['LT-2032-TM2', 'tim-maia', 'Cadeira Superior', 3800, 2110, 'Aprovado'],
  ['LT-2031-LP3', 'lil-peep', 'Pista Comum', 4200, 3010, 'Aprovado'],
  ['LT-2028-MJ4', 'michael', 'VIP Lounge', 800, 620, 'Aprovado'],
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const SORTS = {
  Data: (a, b) => a.date.localeCompare(b.date),
  Nome: (a, b) => a.title.localeCompare(b.title),
  Vendas: (a, b) => b.report.sold - a.report.sold,
};
const fmt = (n) => n.toLocaleString('pt-BR');
const asEvent = (event) => ({ ...event, report: eventReports[event.id] });

export default function Admin() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [sort, setSort] = useState('Data');
  const [more, setMore] = useState(false);
  const [minOccupancy, setMinOccupancy] = useState(0);
  const [page, setPage] = useState(1);
  const [updatedAt] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  );

  const all = opportunities.map(asEvent);
  const text = query.trim().toLowerCase();
  const events = all
    .filter(
      (e) =>
        `${e.title} ${e.subtitle} ${e.organizer}`.toLowerCase().includes(text) &&
        (status === 'Todos' || e.report.status === status) &&
        e.report.occupancy >= minOccupancy,
    )
    .sort(SORTS[sort]);
  const active = all.filter((e) => e.report.status !== 'Em auditoria').length;
  const auditing = all.length - active;

  const filteredLots = lots.filter((l) =>
    `${l[0]} ${opportunities.find((e) => e.id === l[1]).title}`.toLowerCase().includes(text),
  );
  const pages = Math.max(1, Math.ceil(filteredLots.length / 4));
  const current = Math.min(page, pages);

  return (
    <div className="workspace admin-home">
      <section className="ah-search" aria-label="Pesquisa de eventos">
        <div className="ah-search-row">
          <label className="search-box wide">
            <Icon name="search" size={18} />
            <input
              aria-label="Buscar eventos"
              placeholder="Buscar por evento, artista ou código..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="ah-filters">
            <label>
              Status:
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Todos">Todos os Eventos ({all.length})</option>
                {Object.keys(STATUS_TONE).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Ordenar:
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.keys(SORTS).map((s) => (
                  <option key={s} value={s}>
                    {s === 'Data' ? 'Data do Evento' : s === 'Nome' ? 'Nome' : 'Mais vendidos'}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button soft"
              aria-expanded={more}
              onClick={() => setMore(!more)}
            >
              <Icon name="filter" size={16} /> Mais Filtros
            </button>
          </div>
        </div>
        {more && (
          <div className="ah-more">
            <label>
              Ocupação mínima:
              <select
                value={minOccupancy}
                onChange={(e) => setMinOccupancy(Number(e.target.value))}
              >
                <option value={0}>Qualquer</option>
                <option value={80}>A partir de 80%</option>
                <option value={90}>A partir de 90%</option>
              </select>
            </label>
            <button
              type="button"
              className="text-link plain-button"
              onClick={() => {
                setStatus('Todos');
                setMinOccupancy(0);
                setQuery('');
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
        <div className="ah-summary">
          <span>
            Eventos em destaque: <strong>{active} ativos</strong>
          </span>
          <i aria-hidden="true" />
          <span>
            Relatórios em auditoria:{' '}
            <strong className="amber">
              {auditing} pendente{auditing === 1 ? '' : 's'}
            </strong>
          </span>
          <span className="ah-updated">Última atualização: Hoje às {updatedAt}</span>
        </div>
      </section>

      <div className="ah-heading">
        <h2>Grade de Eventos</h2>
        <span className="ah-count">
          {events.length} {events.length === 1 ? 'Evento' : 'Eventos'}
        </span>
      </div>
      <p className="ah-lead">
        Selecione um evento para acessar relatórios gerenciais e auditorias.
      </p>

      <div className="ah-grid">
        {events.map((event, i) => {
          const r = event.report;
          return (
            <EventCard
              key={event.id}
              event={event}
              variant="admin"
              metrics={{
                tag: `EVENTO ${ROMAN[i]}`,
                status: r.status,
                statusTone: STATUS_TONE[r.status],
                city: r.city.split(',')[0],
                rows: [
                  { label: 'Organizador', value: event.organizer },
                  { label: 'Ingressos vendidos', value: fmt(r.sold), tone: 'ah-pill' },
                  { label: 'Ocupação', value: `${String(r.occupancy).replace('.', ',')}%`, tone: 'green' },
                  { label: 'Faturamento bruto', value: money(r.revenue) },
                ],
                highlightText: (
                  <>
                    <Icon name="chart" size={18} />
                    <span>
                      {fmt(r.exchanges)} trocas · {r.conversion} de conversão
                    </span>
                    <Link to={`/admin/relatorios/${event.id}`}>Ver painel</Link>
                  </>
                ),
              }}
              actions={
                <Link className="ah-cta" to={`/admin/relatorios/${event.id}`}>
                  Visão e Relatórios ↗
                </Link>
              }
            />
          );
        })}
      </div>
      {!events.length && <Empty>Nenhum evento corresponde aos filtros selecionados.</Empty>}

      <Panel
        className="ah-table"
        title="Lista Consolidada de Relatórios Recentes e Lotes"
        subtitle="Histórico de validação e transferências demonstrativas."
        action={
          <DownloadButton
            name="relatorio-geral.csv"
            rows={[['Lote', 'Evento', 'Setor', 'Emitidos', 'Trocas', 'Status'], ...lots]}
          />
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID do lote</th>
                <th>Evento / artista</th>
                <th>Data prevista</th>
                <th>Emitidos</th>
                <th>Trocas concluídas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLots.slice((current - 1) * 4, current * 4).map((l) => {
                const event = opportunities.find((e) => e.id === l[1]);
                return (
                  <tr key={l[0]}>
                    <td>
                      <code>{l[0]}</code>
                    </td>
                    <td>
                      <strong>{event.title}</strong>
                      <small>{l[2]}</small>
                    </td>
                    <td>{dateLabel(event.date)}</td>
                    <td>{fmt(l[3])}</td>
                    <td className="green-text">{fmt(l[4])}</td>
                    <td>
                      <Badge>{l[5]}</Badge>
                    </td>
                    <td>
                      <Link className="text-link" to={`/admin/relatorios/${event.id}`}>
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filteredLots.length && <Empty />}
        <Pagination
          page={current}
          pageSize={4}
          total={filteredLots.length}
          onPage={setPage}
          summary={(from, to, total) => `${total} registros · página ${current} de ${pages}`}
        />
      </Panel>
    </div>
  );
}
