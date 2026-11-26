import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import CancelarEvento from '../../components/CancelarEvento';
import DonutChart from '../../components/DonutChart';
import { Icon } from '../../components/Icons';
import { Badge, NotFound, dateLabel, downloadCSV, money } from '../../components/UI';
import { useStore } from '../../context/Store';
import { SITUACAO_PEDIDO } from '../../services/orders';
import {
  dataHoraBrasilia,
  mensagemCancelamento,
  relatorioEvento,
  situacaoEvento,
} from '../../services/admin';

// Relatório de um evento com os números do banco (etapa 6). A versão de demonstração continua
// em pages/Report.jsx. A administração também cancela o evento por aqui (com estorno simulado).

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const CORES = { ativos: '#2860ee', utilizados: '#0b8a65', cancelados: '#c2410c' };

export default function RelatorioAdminRota() {
  const { id } = useParams();
  return <RelatorioAdmin key={id} id={id} />;
}

function RelatorioAdmin({ id }) {
  const { notify } = useStore();
  const valido = /^\d+$/.test(id);
  const [evento, setEvento] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (!valido) return undefined;
    const controller = new AbortController();
    setErro('');
    relatorioEvento(id, controller.signal)
      .then(setEvento)
      .catch((error) => {
        if (!controller.signal.aborted) setErro(error.message);
      });
    return () => controller.abort();
  }, [id, valido, tentativa]);

  if (!valido) return <NotFound title="Relatório não encontrado" />;
  if (!evento) {
    return (
      <div className="workspace">
        {erro ? (
          <div className="api-error" role="alert">
            <span>{erro}</span>
            <button
              type="button"
              className="button outline tiny"
              onClick={() => setTentativa((n) => n + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <p role="status">Carregando o relatório do evento…</p>
        )}
        <Link className="text-link" to="/admin">
          ← Voltar ao painel geral
        </Link>
      </div>
    );
  }

  const [situacao, tom] = situacaoEvento(evento);
  const cancelado = evento.status === 'Cancelado';
  const { tickets } = evento;
  const restantes = evento.capacity === null ? null : Math.max(0, evento.capacity - tickets.sold);
  const totalSituacoes = tickets.active + tickets.used + tickets.cancelled;
  const fatia = (valor) => (totalSituacoes ? Math.round((valor / totalSituacoes) * 100) : 0);
  const grafico = [
    { label: 'Ativos', value: tickets.active, color: CORES.ativos },
    { label: 'Utilizados na portaria', value: tickets.used, color: CORES.utilizados },
    { label: 'Cancelados', value: tickets.cancelled, color: CORES.cancelados },
  ].map((item) => ({ ...item, share: fatia(item.value) }));
  const estornos = evento.refunds.sales + evento.refunds.resales;

  function exportar() {
    downloadCSV(`relatorio-evento-${evento.id}.csv`, [
      [evento.title],
      ['Situação', situacao, 'Vendidos', tickets.sold, 'Receita bruta', evento.grossRevenue],
      ['Pedido', 'Comprador', 'Tipo', 'Quantidade', 'Total', 'Situação', 'Revenda', 'Criado em'],
      ...evento.orders.map((pedido) => [
        pedido.id,
        pedido.buyer,
        pedido.type,
        pedido.quantity,
        pedido.total,
        (SITUACAO_PEDIDO[pedido.status] || [pedido.status])[0],
        pedido.resale ? 'Sim' : 'Não',
        dataHoraBrasilia(pedido.createdAt),
      ]),
    ]);
  }

  return (
    <div className="workspace report admin-report">
      <div className="rp-topbar">
        <nav className="rp-crumbs" aria-label="Trilha de navegação">
          <Link to="/admin">Painel geral</Link>
          <Icon name="chevron-right" size={14} />
          <span>{evento.title}</span>
          <Icon name="chevron-right" size={14} />
          <strong aria-current="page">Relatório</strong>
        </nav>
        <div className="rp-tools">
          <button type="button" className="button dark" onClick={exportar}>
            <Icon name="download" size={15} /> Exportar CSV
          </button>
          {!cancelado && (
            <button
              type="button"
              className="button danger-outline"
              onClick={() => setCancelando(true)}
            >
              Cancelar evento
            </button>
          )}
        </div>
      </div>

      {cancelado && (
        <p className="info-note admin-cancel-note" role="note">
          <strong>
            Evento cancelado
            {evento.cancelledAt ? ` em ${dataHoraBrasilia(evento.cancelledAt)}` : ''}
          </strong>
          Motivo: {evento.cancelReason || 'não informado'}.
        </p>
      )}

      <div className="rp-grid">
        <section className="rp-card" aria-labelledby="rp-evento">
          <div className="rp-card-top">
            <span className="rp-tag">EVENTO Nº {evento.id}</span>
            <span className={`rp-status ${tom}`}>
              <i aria-hidden="true" />
              {situacao}
            </span>
          </div>
          <h1 className="rp-title" id="rp-evento">
            {evento.title}
          </h1>
          <p className="rp-tagline">
            {evento.organizer}
            {evento.organizerName && evento.organizerName !== evento.organizer
              ? ` · responsável: ${evento.organizerName}`
              : ''}
          </p>
          <div className="rp-info">
            <div className="rp-info-box">
              <span className="rp-info-icon blue">
                <Icon name="calendar" size={22} />
              </span>
              <div>
                <small>DATA DO EVENTO</small>
                <strong>{dateLabel(evento.startDate)}</strong>
                <span>
                  {evento.endDate && evento.endDate !== evento.startDate
                    ? `Até ${dateLabel(evento.endDate)}`
                    : 'Evento de um dia'}
                </span>
              </div>
            </div>
            <div className="rp-info-box">
              <span className="rp-info-icon orange">
                <Icon name="pin" size={22} />
              </span>
              <div>
                <small>LOCAL</small>
                <strong>{evento.location || 'A definir'}</strong>
              </div>
            </div>
          </div>
          <dl className="rp-facts">
            <div>
              <dt>CAPACIDADE</dt>
              <dd>{evento.capacity === null ? 'Sem limite' : `${numero(evento.capacity)} un.`}</dd>
            </div>
            <div>
              <dt>PREÇO BASE</dt>
              <dd>{money(evento.basePrice)}</dd>
            </div>
            <div>
              <dt>ATENDIMENTOS ABERTOS</dt>
              <dd className="blue">{numero(evento.openSupport)}</dd>
            </div>
          </dl>
          <div className="rp-buttons">
            <Link className="button soft" to="/admin/atendimentos">
              Ver atendimentos
            </Link>
            <Link className="button soft" to="/admin">
              Voltar ao painel
            </Link>
          </div>
        </section>

        <section className="rp-card" aria-labelledby="rp-vendas">
          <div className="rp-sales-head">
            <div>
              <p className="rp-eyebrow">TOTALIZADORES DE BILHETERIA</p>
              <h2 id="rp-vendas">
                INGRESSOS VENDIDOS: <span>{numero(tickets.sold)}</span>
              </h2>
            </div>
            <div className="rp-occupancy">
              <span className="rp-pill">
                {evento.occupancy === null
                  ? 'Sem capacidade'
                  : `${String(evento.occupancy).replace('.', ',')}% Ocupação`}
              </span>
              {restantes !== null && <small>Restam {numero(restantes)} lugares</small>}
            </div>
          </div>
          {evento.occupancy !== null && (
            <div
              className="rp-progress"
              role="progressbar"
              aria-label="Ocupação do evento"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, evento.occupancy)}
            >
              <span style={{ width: `${Math.min(100, evento.occupancy)}%` }} />
            </div>
          )}
          <div className="rp-kpis">
            <div>
              <small>Receita bruta (venda original)</small>
              <strong>{money(evento.grossRevenue)}</strong>
              <span>Estornos: {money(estornos)} (simulação)</span>
            </div>
            <div>
              <small>Revendas</small>
              <strong>{numero(evento.resales.count)}</strong>
              <span>Volume: {money(evento.resales.volume)}</span>
            </div>
          </div>
          <dl className="admin-report-facts">
            <div>
              <dt>Transferências aceitas</dt>
              <dd>{numero(evento.transfers)}</dd>
            </div>
            <div>
              <dt>Trocas concluídas</dt>
              <dd>{numero(evento.exchanges)}</dd>
            </div>
            <div>
              <dt>Estornos da venda</dt>
              <dd>{money(evento.refunds.sales)}</dd>
            </div>
            <div>
              <dt>Estornos de revenda</dt>
              <dd>{money(evento.refunds.resales)}</dd>
            </div>
          </dl>
          <div className="rp-chart-head">
            <h3>INGRESSOS POR SITUAÇÃO</h3>
          </div>
          {totalSituacoes ? (
            <div className="rp-chart">
              <DonutChart
                items={grafico}
                ariaLabel={`Ingressos por situação: ${grafico
                  .map((item) => `${item.label} ${item.value}`)
                  .join(', ')}`}
              >
                <small>Total</small>
                <strong>{numero(totalSituacoes)}</strong>
                <small>ingressos</small>
              </DonutChart>
              <ul className="rp-legend">
                {grafico.map((item) => (
                  <li key={item.label}>
                    <i style={{ background: item.color }} aria-hidden="true" />
                    <span>{item.label}</span>
                    <strong>{numero(item.value)} un.</strong>
                    <em>({item.share}%)</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted">Nenhum ingresso emitido para este evento.</p>
          )}
        </section>
      </div>

      <section className="rp-card rp-table-card" aria-labelledby="rp-tipos">
        <header className="rp-table-head">
          <div>
            <h2 id="rp-tipos">Ingressos por tipo</h2>
            <p>Emitidos para {evento.title}, pela situação atual de cada ingresso.</p>
          </div>
        </header>
        {evento.byType.length ? (
          // Rola de lado no celular: o foco pelo teclado permite rolar a tabela.
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Tabela de ingressos por tipo"
          >
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th className="center">Emitidos</th>
                  <th className="center">Ativos</th>
                  <th className="center">Utilizados</th>
                  <th className="center">Cancelados</th>
                </tr>
              </thead>
              <tbody>
                {evento.byType.map((linha) => (
                  <tr key={linha.type}>
                    <td>
                      <strong>{linha.type}</strong>
                    </td>
                    <td className="center">{numero(linha.total)}</td>
                    <td className="center">{numero(linha.active)}</td>
                    <td className="center">{numero(linha.used)}</td>
                    <td className="center">{numero(linha.cancelled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nenhum ingresso emitido ainda.</p>
        )}
      </section>

      <section className="rp-card rp-table-card" aria-labelledby="rp-pedidos">
        <header className="rp-table-head">
          <div>
            <h2 id="rp-pedidos">Últimos pedidos</h2>
            <p>Os 50 pedidos mais recentes do evento, da venda original e da revenda.</p>
          </div>
        </header>
        {evento.orders.length ? (
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Tabela dos últimos pedidos"
          >
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Comprador</th>
                  <th>Data e hora</th>
                  <th className="center">Qtd.</th>
                  <th className="right">Total</th>
                  <th className="center">Situação</th>
                </tr>
              </thead>
              <tbody>
                {evento.orders.map((pedido) => {
                  const [nome, cor] = SITUACAO_PEDIDO[pedido.status] || [pedido.status, 'blue'];
                  return (
                    <tr key={pedido.id}>
                      <td>
                        <code>nº {pedido.id}</code>
                        <small>{pedido.resale ? 'Revenda' : pedido.type}</small>
                      </td>
                      <td>{pedido.buyer}</td>
                      <td>{dataHoraBrasilia(pedido.createdAt)}</td>
                      <td className="center">{pedido.quantity}</td>
                      <td className="right">
                        <strong>{money(pedido.total)}</strong>
                      </td>
                      <td className="center">
                        <Badge tone={cor}>{nome}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nenhum pedido para este evento.</p>
        )}
      </section>

      {cancelando && (
        <CancelarEvento
          evento={evento}
          aoFechar={() => setCancelando(false)}
          aoConcluir={(resultado) => {
            setCancelando(false);
            notify(mensagemCancelamento(resultado));
            setTentativa((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
