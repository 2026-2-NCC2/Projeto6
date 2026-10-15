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

const GROUPS = { 'Por Setor': 'sector', 'Por Canal': 'channel', 'Por Idade': 'age' };
const fmt = (n) => n.toLocaleString('pt-BR');
const compact = (n) => `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;

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
  if (!event || !report) return <NotFound title="Relatório não encontrado" />;

  const items = report.groups[GROUPS[group]];
  const rows = report.transactions.filter((t) =>
    `${t.id} ${t.sector} ${t.detail}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const words = event.title.toUpperCase().split(' ');
  const middle = Math.ceil(words.length / 2);

  return (
    <div className="workspace report">
      <div className="rp-topbar">
        <nav className="rp-crumbs" aria-label="Trilha de navegação">
          <Link to="/admin">Início</Link>
          <Icon name="chevron-right" size={14} />
          <span>{event.title}</span>
          <Icon name="chevron-right" size={14} />
          <strong aria-current="page">Relatórios Gerenciais</strong>
        </nav>
        <div className="rp-tools">
          <label className="search-box">
            <Icon name="search" size={16} />
            <input
              aria-label="Buscar lote, setor ou ID"
              placeholder="Buscar lote, setor, ID..."
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
                ...rows.map((t) => [
                  t.id,
                  t.sector,
                  t.detail,
                  t.date,
                  t.time,
                  t.qty,
                  t.total,
                  t.status,
                ]),
              ])
            }
          >
            <Icon name="download" size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="rp-grid">
        <section className="rp-card" aria-labelledby="rp-event">
          <div className="rp-card-top">
            <span className="rp-tag">{report.tag}</span>
            <span className={`rp-status ${STATUS_TONE[report.status] || 'blue'}`}>
              <i aria-hidden="true" />
              {report.status}
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
                <small>DATA DO EVENTO</small>
                <strong>{dateLabel(event.date)}</strong>
                <span>
                  Abertura: {report.doors} • Início: {report.start}
                </span>
              </div>
            </div>
            <div className="rp-info-box">
              <span className="rp-info-icon orange">
                <Icon name="pin" size={22} />
              </span>
              <div>
                <small>LOCAL / PRAÇA</small>
                <strong>{report.venue}</strong>
                <span>
                  {report.city}{' '}
                  <i className="rp-stars" role="img" aria-label={`${report.rating} de 5 estrelas`}>
                    {'★'.repeat(report.rating)}
                    {'☆'.repeat(5 - report.rating)}
                  </i>
                </span>
              </div>
            </div>
          </div>
          <dl className="rp-facts">
            <div>
              <dt>CAPACIDADE MAX</dt>
              <dd>{fmt(report.capacity)} un.</dd>
            </div>
            <div>
              <dt>LOTE VIGENTE</dt>
              <dd>{report.lot}</dd>
            </div>
            <div>
              <dt>PRODUÇÃO</dt>
              <dd className="blue">{report.producer}</dd>
            </div>
          </dl>
          <div className="rp-buttons">
            <Link className="button soft" to="/admin">
              Gerenciar Lotes
            </Link>
            <button
              type="button"
              className="button soft"
              onClick={() => notify('Mapa de assentos disponível quando o backend for conectado.')}
            >
              Mapa de Assentos
            </button>
          </div>
        </section>

        <section className="rp-card" aria-labelledby="rp-sales">
          <div className="rp-sales-head">
            <div>
              <p className="rp-eyebrow">TOTALIZADORES DE BILHETERIA</p>
              <h2 id="rp-sales">
                TICKETS VENDIDOS: <span>{compact(report.sold)}</span>
              </h2>
            </div>
            <div className="rp-occupancy">
              <span className="rp-pill">
                {String(report.occupancy).replace('.', ',')}% Ocupação
              </span>
              <small>Restam {fmt(report.remaining)} un.</small>
            </div>
          </div>
          <div
            className="rp-progress"
            role="progressbar"
            aria-label="Ocupação do evento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={report.occupancy}
          >
            <span style={{ width: `${report.occupancy}%` }} />
          </div>
          <div className="rp-kpis">
            <div>
              <small>Faturamento Bruto</small>
              <strong>{money(report.revenue)}</strong>
              <em>▲ +{report.projection}% vs projeção</em>
            </div>
            <div>
              <small>Ticket Médio</small>
              <strong>{money(report.avgTicket)}</strong>
              <span>Em 5 setores ativos</span>
            </div>
          </div>
          <div className="rp-chart-head">
            <h3>GRÁFICO: DISTRIBUIÇÃO {group.toUpperCase()}</h3>
            <Tabs
              label="Agrupar gráfico"
              options={Object.keys(GROUPS)}
              value={group}
              onChange={setGroup}
            />
          </div>
          <div className="rp-chart">
            <DonutChart
              items={items}
              ariaLabel={`Distribuição de ingressos ${group.toLowerCase()}: ${items
                .map((i) => `${i.label} ${i.share}%`)
                .join(', ')}`}
            >
              <small>Total</small>
              <strong>{fmt(report.sold)}</strong>
              <small>ingressos</small>
            </DonutChart>
            <ul className="rp-legend">
              {items.map((item) => (
                <li key={item.label}>
                  <i style={{ background: item.color }} aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{fmt(item.value)} un.</strong>
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
            <h2 id="rp-table">Detalhamento de Lotes e Transações Recentes do Evento</h2>
            <p>Auditoria contábil e status de transferências processadas para {event.title}</p>
          </div>
          <label className="rp-rows">
            Linhas por página:
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
                <th>ID Transação / Lote</th>
                <th>Setor / Categoria</th>
                <th>Data & Hora</th>
                <th className="center">Qtd. Ingressos</th>
                <th className="right">Valor Total</th>
                <th className="center">Status</th>
                <th className="center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.id}</code>
                  </td>
                  <td>
                    <strong>{t.sector}</strong>
                    <small>{t.detail}</small>
                  </td>
                  <td>
                    {t.date} <span className="muted">{t.time}</span>
                  </td>
                  <td className="center">
                    <strong>{t.qty} un.</strong>
                  </td>
                  <td className="right">
                    <strong>{money(t.total)}</strong>
                  </td>
                  <td className="center">
                    <Badge>{t.status}</Badge>
                  </td>
                  <td className="center">
                    <button
                      type="button"
                      className="icon-action"
                      aria-label={`Ver detalhes da transação ${t.id}`}
                      onClick={() => setSelected(t)}
                    >
                      <Icon name="eye" size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty>Nenhuma transação corresponde à busca.</Empty>}
        <Pagination page={current} pageSize={pageSize} total={rows.length} onPage={setPage} />
      </section>

      {selected && (
        <Modal title="Detalhes da transação" onClose={() => setSelected(null)}>
          <dl className="rp-detail">
            <dt>ID</dt>
            <dd>{selected.id}</dd>
            <dt>Setor</dt>
            <dd>
              {selected.sector} · {selected.detail}
            </dd>
            <dt>Data e hora</dt>
            <dd>
              {selected.date} às {selected.time}
            </dd>
            <dt>Ingressos</dt>
            <dd>
              {selected.qty} un. · {money(selected.total)}
            </dd>
            <dt>Status</dt>
            <dd>
              <Badge>{selected.status}</Badge>
            </dd>
          </dl>
          <p className="muted">
            Registro fictício para demonstrar a consulta de transações. Não existe cobrança
            associada.
          </p>
        </Modal>
      )}
    </div>
  );
}
