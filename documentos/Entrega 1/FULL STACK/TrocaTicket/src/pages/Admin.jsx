import React, { useState } from 'react';
import { Link } from 'react-router';
import { opportunities } from '../data/demo';
import { STATUS_TONE, eventReports } from '../data/reports';
import { Badge, DownloadButton, Empty, PageTitle, Panel, dateLabel, money } from '../components/UI';
import Pagination from '../components/Pagination';
import { Icon } from '../components/Icons';
import EventCard from '../components/EventCard';
import { formatarNumero, localeAtual, t, tn } from '../i18n';

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
const fmt = (n) => n.toLocaleString(localeAtual());
const asEvent = (event) => ({ ...event, report: eventReports[event.id] });

export default function Admin() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [sort, setSort] = useState('Data');
  const [more, setMore] = useState(false);
  const [minOccupancy, setMinOccupancy] = useState(0);
  const [page, setPage] = useState(1);
  const [updatedAt] = useState(() =>
    new Date().toLocaleTimeString(localeAtual(), { hour: '2-digit', minute: '2-digit' }),
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
      <PageTitle
        title={t('Painel Geral')}
        subtitle={t('Visão consolidada dos eventos e relatórios de demonstração.')}
      >
        <Link className="button primary" to="/admin/moderacao">
          {t('Moderar cadastros')} <span aria-hidden="true">→</span>
        </Link>
      </PageTitle>
      <section className="ah-search" aria-label={t('Pesquisa de eventos')}>
        <div className="ah-search-row">
          <label className="search-box wide">
            <Icon name="search" size={18} />
            <input
              aria-label={t('Buscar eventos')}
              placeholder={t('Buscar por evento, artista ou código...')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="ah-filters">
            <label>
              {t('Status:')}
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Todos">
                  {t('Todos os eventos')} ({all.length})
                </option>
                {Object.keys(STATUS_TONE).map((s) => (
                  <option value={s} key={s}>{t(s)}</option>
                ))}
              </select>
            </label>
            <label>
              {t('Ordenar:')}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.keys(SORTS).map((s) => (
                  <option key={s} value={s}>
                    {s === 'Data' ? t('Data do Evento') : s === 'Nome' ? t('Nome') : t('Mais vendidos')}
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
              <Icon name="filter" size={16} /> {t('Mais Filtros')}
            </button>
          </div>
        </div>
        {more && (
          <div className="ah-more">
            <label>
              {t('Ocupação mínima:')}
              <select
                value={minOccupancy}
                onChange={(e) => setMinOccupancy(Number(e.target.value))}
              >
                <option value={0}>{t('Qualquer')}</option>
                <option value={80}>{t('A partir de 80%')}</option>
                <option value={90}>{t('A partir de 90%')}</option>
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
              {t('Limpar filtros')}
            </button>
          </div>
        )}
        <div className="ah-summary">
          <span>
            {t('Eventos em destaque:')} <strong>{active} {t('ativos')}</strong>
          </span>
          <i aria-hidden="true" />
          <span>
            {t('Relatórios em auditoria:')}{' '}
            <strong className="amber">
              {tn(auditing, '{n} pendente', '{n} pendentes')}
            </strong>
          </span>
          <span className="ah-updated">{t('Última atualização: Hoje às')} {updatedAt}</span>
        </div>
      </section>

      <div className="ah-heading">
        <h2>{t('Grade de Eventos')}</h2>
        <span className="ah-count">
          {events.length} {events.length === 1 ? t('Evento') : t('Eventos')}
        </span>
      </div>
      <p className="ah-lead">
        {t('Selecione um evento para acessar relatórios gerenciais e auditorias.')}
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
                tag: t('EVENTO {numero}', { numero: ROMAN[i] }),
                status: r.status,
                statusTone: STATUS_TONE[r.status],
                city: r.city.split(',')[0],
                rows: [
                  { label: 'Organizador', value: event.organizer },
                  { label: 'Ingressos vendidos', value: fmt(r.sold), tone: 'ah-pill' },
                  { label: 'Ocupação', value: `${formatarNumero(r.occupancy)}%`, tone: 'green' },
                  { label: 'Faturamento bruto', value: money(r.revenue) },
                ],
                highlightText: (
                  <>
                    <Icon name="chart" size={18} />
                    <span>
                      {fmt(r.exchanges)} {t('trocas ·')} {r.conversion} {t('de conversão')}
                    </span>
                    <Link to={`/admin/relatorios/${event.id}`}>{t('Ver painel')}</Link>
                  </>
                ),
              }}
              actions={
                <Link className="ah-cta" to={`/admin/relatorios/${event.id}`}>
                  {t('Visão e Relatórios ↗')}
                </Link>
              }
            />
          );
        })}
      </div>
      {!events.length && <Empty>{t('Nenhum evento corresponde aos filtros selecionados.')}</Empty>}

      <Panel
        className="ah-table"
        title={t('Lista Consolidada de Relatórios Recentes e Lotes')}
        subtitle={t('Histórico de validação e transferências demonstrativas.')}
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
                <th>{t('ID do lote')}</th>
                <th>{t('Evento / artista')}</th>
                <th>{t('Data prevista')}</th>
                <th>{t('Emitidos')}</th>
                <th>{t('Trocas concluídas')}</th>
                <th>{t('Status')}</th>
                <th>{t('Ações')}</th>
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
                        {t('Ver →')}
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
          summary={(from, to, total) => t('{total} registros · página {current} de {pages}', { total, current, pages })}
        />
      </Panel>
    </div>
  );
}
