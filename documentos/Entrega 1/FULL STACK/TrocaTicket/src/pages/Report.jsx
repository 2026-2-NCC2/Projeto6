import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import { opportunities } from '../data/demo';
import { STATUS_TONE, eventReports } from '../data/reports';
import { useStore } from '../context/Store';
import {
  Badge,
  Empty,
  Modal,
  NotFound,
  Tabs,
  dateLabel,
  downloadCSV,
  money,
} from '../components/UI';
import DonutChart from '../components/DonutChart';
import Pagination from '../components/Pagination';
import { Icon } from '../components/Icons';
import { formatarNumero, localeAtual, t } from '../i18n';

const GROUPS = { 'Por Setor': 'sector', 'Por Canal': 'channel', 'Por Idade': 'age' };
// Descrição do gráfico para leitores de tela, uma frase completa por agrupamento.
const DESCRICAO_GRAFICO = {
  'Por Setor': 'Distribuição de ingressos por setor: {itens}',
  'Por Canal': 'Distribuição de ingressos por canal: {itens}',
  'Por Idade': 'Distribuição de ingressos por idade: {itens}',
};
const fmt = (n) => n.toLocaleString(localeAtual());
const compact = (n) => `${(n / 1000).toLocaleString(localeAtual(), { maximumFractionDigits: 1 })}K`;

// Relatório gerencial: o mesmo painel para qualquer evento de `eventReports`.
export default function ReportPage() {
  const { id } = useParams();
  return <Report key={id} id={id} />;
}

function Report({ id }) {
  const { notify } = useStore();
  const event = opportunities.find((e) => e.id === id);
  const report = eventReports[id];
  const [group, setGroup] = useState('Por Setor');
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  if (!event || !report) return <NotFound title={t('Relatório não encontrado')} />;

  const items = report.groups[GROUPS[group]];
  const rows = report.transactions.filter((tk) =>
    `${tk.id} ${tk.sector} ${tk.detail}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const words = event.title.toUpperCase().split(' ');
  const middle = Math.ceil(words.length / 2);

  return (
    <div className="workspace report">
      <div className="rp-topbar">
        <nav className="rp-crumbs" aria-label={t('Trilha de navegação')}>
          <Link to="/admin">{t('Início')}</Link>
          <Icon name="chevron-right" size={14} />
          <span>{event.title}</span>
          <Icon name="chevron-right" size={14} />
          <strong aria-current="page">{t('Relatórios Gerenciais')}</strong>
        </nav>
        <div className="rp-tools">
          <label className="search-box">
            <Icon name="search" size={16} />
            <input
              aria-label={t('Buscar lote, setor ou ID')}
              placeholder={t('Buscar lote, setor, ID...')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button
            type="button"
            className="button dark"
            onClick={() =>
              downloadCSV(`relatorio-${id}.csv`, [
                [event.title],
                ['ID', 'Setor', 'Detalhe', 'Data', 'Hora', 'Quantidade', 'Valor total', 'Status'],
                ...rows.map((tk) => [
                  tk.id,
                  tk.sector,
                  tk.detail,
                  tk.date,
                  tk.time,
                  tk.qty,
                  tk.total,
                  tk.status,
                ]),
              ])
            }
          >
            <Icon name="download" size={15} /> {t('Exportar CSV')}
          </button>
        </div>
      </div>

      <div className="rp-grid">
        <section className="rp-card" aria-labelledby="rp-event">
          <div className="rp-card-top">
            <span className="rp-tag">{report.tag}</span>
            <span className={`rp-status ${STATUS_TONE[report.status] || 'blue'}`}>
              <i aria-hidden="true" />
              {t(report.status)}
            </span>
          </div>
          <h1 className="rp-title" id="rp-event">
            {words.slice(0, middle).join(' ')}
            <span>{words.slice(middle).join(' ')}</span>
          </h1>
          <p className="rp-tagline">{report.tagline}</p>
          <div className="rp-info">
            <div className="rp-info-box">
              <span className="rp-info-icon blue">
                <Icon name="calendar" size={22} />
              </span>
              <div>
                <small>{t('DATA DO EVENTO')}</small>
                <strong>{dateLabel(event.date)}</strong>
                <span>
                  {t('Abertura:')} {report.doors} {t('• Início:')} {report.start}
                </span>
              </div>
            </div>
            <div className="rp-info-box">
              <span className="rp-info-icon orange">
                <Icon name="pin" size={22} />
              </span>
              <div>
                <small>{t('LOCAL / PRAÇA')}</small>
                <strong>{report.venue}</strong>
                <span>
                  {report.city}{' '}
                  <i
                    className="rp-stars"
                    role="img"
                    aria-label={t('{rating} de 5 estrelas', { rating: report.rating })}
                  >
                    {'★'.repeat(report.rating)}
                    {'☆'.repeat(5 - report.rating)}
                  </i>
                </span>
              </div>
            </div>
          </div>
          <dl className="rp-facts">
            <div>
              <dt>{t('CAPACIDADE MAX')}</dt>
              <dd>
                {fmt(report.capacity)} {t('un.')}
              </dd>
            </div>
            <div>
              <dt>{t('LOTE VIGENTE')}</dt>
              <dd>{report.lot}</dd>
            </div>
            <div>
              <dt>{t('PRODUÇÃO')}</dt>
              <dd className="blue">{report.producer}</dd>
            </div>
          </dl>
          <div className="rp-buttons">
            <Link className="button soft" to="/admin">
              {t('Gerenciar Lotes')}
            </Link>
            <button
              type="button"
              className="button soft"
              onClick={() => notify('Mapa de assentos disponível quando o backend for conectado.')}
            >
              {t('Mapa de Assentos')}
            </button>
          </div>
        </section>

        <section className="rp-card" aria-labelledby="rp-sales">
          <div className="rp-sales-head">
            <div>
              <p className="rp-eyebrow">{t('TOTALIZADORES DE BILHETERIA')}</p>
              <h2 id="rp-sales">
                {t('TICKETS VENDIDOS:')} <span>{compact(report.sold)}</span>
              </h2>
            </div>
            <div className="rp-occupancy">
              <span className="rp-pill">
                {t('{percentual}% Ocupação', { percentual: formatarNumero(report.occupancy) })}
              </span>
              <small>
                {t('Restam')} {fmt(report.remaining)} {t('un.')}
              </small>
            </div>
          </div>
          <div
            className="rp-progress"
            role="progressbar"
            aria-label={t('Ocupação do evento')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={report.occupancy}
          >
            <span style={{ width: `${report.occupancy}%` }} />
          </div>
          <div className="rp-kpis">
            <div>
              <small>{t('Faturamento Bruto')}</small>
              <strong>{money(report.revenue)}</strong>
              <em>
                ▲ +{report.projection}
                {t('% vs projeção')}
              </em>
            </div>
            <div>
              <small>{t('Ticket Médio')}</small>
              <strong>{money(report.avgTicket)}</strong>
              <span>{t('Em 5 setores ativos')}</span>
            </div>
          </div>
          <div className="rp-chart-head">
            <h3>
              {t('GRÁFICO: DISTRIBUIÇÃO')} {t(group).toLocaleUpperCase(localeAtual())}
            </h3>
            <Tabs
              label={t('Agrupar gráfico')}
              options={Object.keys(GROUPS)}
              value={group}
              onChange={setGroup}
            />
          </div>
          <div className="rp-chart">
            <DonutChart
              items={items}
              ariaLabel={t(DESCRICAO_GRAFICO[group], {
                itens: items.map((i) => `${t(i.label)} ${i.share}%`).join(', '),
              })}
            >
              <small>{t('Total')}</small>
              <strong>{fmt(report.sold)}</strong>
              <small>{t('ingressos')}</small>
            </DonutChart>
            <ul className="rp-legend">
              {items.map((item) => (
                <li key={item.label}>
                  <i style={{ background: item.color }} aria-hidden="true" />
                  <span>{t(item.label)}</span>
                  <strong>
                    {fmt(item.value)} {t('un.')}
                  </strong>
                  <em>({item.share}%)</em>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="rp-card rp-table-card" aria-labelledby="rp-table">
        <header className="rp-table-head">
          <div>
            <h2 id="rp-table">{t('Detalhamento de Lotes e Transações Recentes do Evento')}</h2>
            <p>
              {t('Auditoria contábil e status de transferências processadas para')} {event.title}
            </p>
          </div>
          <label className="rp-rows">
            {t('Linhas por página:')}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </header>
        <div className="table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                <th>{t('ID Transação / Lote')}</th>
                <th>{t('Setor / Categoria')}</th>
                <th>{t('Data & Hora')}</th>
                <th className="center">{t('Qtd. Ingressos')}</th>
                <th className="right">{t('Valor Total')}</th>
                <th className="center">{t('Status')}</th>
                <th className="center">{t('Ações')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((tk) => (
                <tr key={tk.id}>
                  <td>
                    <code>{tk.id}</code>
                  </td>
                  <td>
                    <strong>{tk.sector}</strong>
                    <small>{tk.detail}</small>
                  </td>
                  <td>
                    {tk.date} <span className="muted">{tk.time}</span>
                  </td>
                  <td className="center">
                    <strong>
                      {tk.qty} {t('un.')}
                    </strong>
                  </td>
                  <td className="right">
                    <strong>{money(tk.total)}</strong>
                  </td>
                  <td className="center">
                    <Badge>{tk.status}</Badge>
                  </td>
                  <td className="center">
                    <button
                      type="button"
                      className="icon-action"
                      aria-label={t('Ver detalhes da transação {id}', { id: tk.id })}
                      onClick={() => setSelected(tk)}
                    >
                      <Icon name="eye" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>{t('Nenhuma transação corresponde à busca.')}</Empty>}
        <Pagination page={current} pageSize={pageSize} total={rows.length} onPage={setPage} />
      </section>

      {selected && (
        <Modal title={t('Detalhes da transação')} onClose={() => setSelected(null)}>
          <dl className="rp-detail">
            <dt>{t('ID')}</dt>
            <dd>{selected.id}</dd>
            <dt>{t('Setor')}</dt>
            <dd>
              {selected.sector} · {selected.detail}
            </dd>
            <dt>{t('Data e hora')}</dt>
            <dd>
              {selected.date} {t('às')} {selected.time}
            </dd>
            <dt>{t('Ingressos')}</dt>
            <dd>
              {selected.qty} {t('un. ·')} {money(selected.total)}
            </dd>
            <dt>{t('Status')}</dt>
            <dd>
              <Badge>{t(selected.status)}</Badge>
            </dd>
          </dl>
          <p className="muted">
            {t(
              'Registro fictício para demonstrar a consulta de transações. Não existe cobrança associada.',
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
