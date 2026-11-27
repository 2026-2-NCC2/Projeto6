import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import EventCard from '../../components/EventCard';
import Pagination from '../../components/Pagination';
import { Icon } from '../../components/Icons';
import { DownloadButton, Empty, PageTitle, dateLabel, money } from '../../components/UI';
import { listarEventosAdmin, resumoAdmin, situacaoEvento } from '../../services/admin';
import { formatarNumero, localeAtual, t } from '../../i18n';

// Painel geral da administração com os dados do banco (etapa 6). A versão de demonstração,
// com dados fictícios, continua em pages/Admin.jsx para quem explora sem conta.

const POR_PAGINA = 9;
const ORDENS = {
  data: [
    'Data do evento',
    (a, b) => (a.startDate || '').localeCompare(b.startDate || '') || a.id - b.id,
  ],
  nome: ['Nome', (a, b) => a.title.localeCompare(b.title, 'pt-BR')],
  vendas: ['Mais vendidos', (a, b) => b.tickets.sold - a.tickets.sold || a.id - b.id],
  receita: ['Maior receita', (a, b) => b.grossRevenue - a.grossRevenue || a.id - b.id],
};
const numero = (valor) => formatarNumero(valor);
// Receita da venda original menos os estornos dessa venda (simulação).
const liquida = (e) => Math.round((e.grossRevenue - e.refunds.sales) * 100) / 100;
const percentual = (valor) =>
  valor === null || valor === undefined ? t('Sem capacidade') : `${formatarNumero(valor)}%`;

export default function PainelAdmin() {
  const [resumo, setResumo] = useState(null);
  const [eventos, setEventos] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState('Todos');
  const [ordem, setOrdem] = useState('data');
  const [pagina, setPagina] = useState(1);
  const [atualizadoEm, setAtualizadoEm] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setErro('');
    Promise.all([resumoAdmin(controller.signal), listarEventosAdmin(controller.signal)])
      .then(([numeros, lista]) => {
        setResumo(numeros);
        setEventos(lista);
        setAtualizadoEm(
          new Date().toLocaleTimeString(localeAtual(), { hour: '2-digit', minute: '2-digit' }),
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErro(error.message);
      });
    return () => controller.abort();
  }, [tentativa]);

  const comSituacao = useMemo(
    () => (eventos || []).map((evento) => ({ ...evento, situacao: situacaoEvento(evento) })),
    [eventos],
  );
  const situacoes = [...new Set(comSituacao.map((evento) => evento.situacao[0]))].sort();
  const texto = busca.trim().toLowerCase();
  const filtrados = comSituacao
    .filter((evento) =>
      `${evento.id} ${evento.title} ${evento.organizer} ${evento.location}`
        .toLowerCase()
        .includes(texto),
    )
    .filter((evento) => situacao === 'Todos' || evento.situacao[0] === situacao)
    .sort(ORDENS[ordem][1]);
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const visiveis = filtrados.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);

  const planilha = [
    [
      'Nº',
      'Evento',
      'Situação',
      'Início',
      'Fim',
      'Organização',
      'Capacidade',
      'Vendidos',
      'Utilizados',
      'Cancelados',
      'Ocupação (%)',
      'Receita bruta',
      'Estornos da venda',
      'Estornos de revenda',
      'Revendas',
      'Volume de revenda',
      'Transferências',
      'Trocas',
      'Atendimentos abertos',
      'Motivo do cancelamento',
    ],
    ...filtrados.map((e) => [
      e.id,
      e.title,
      e.situacao[0],
      e.startDate,
      e.endDate,
      e.organizer,
      e.capacity ?? '',
      e.tickets.sold,
      e.tickets.used,
      e.tickets.cancelled,
      e.occupancy ?? '',
      e.grossRevenue,
      e.refunds.sales,
      e.refunds.resales,
      e.resales.count,
      e.resales.volume,
      e.transfers,
      e.exchanges,
      e.openSupport,
      e.cancelReason || '',
    ]),
  ];

  return (
    <div className="workspace admin-home admin-live">
      <PageTitle
        title={t('Painel Geral')}
        subtitle={t('Eventos, contas e atendimentos com os dados do banco.')}
      >
        <Link className="button primary" to="/admin/moderacao">
          {t('Aprovar contas')}
          {resumo?.pendingAccounts ? ` (${resumo.pendingAccounts})` : ''}{' '}
          <span aria-hidden="true">→</span>
        </Link>
      </PageTitle>

      {erro && (
        <div className="api-error" role="alert">
          <span>{t(erro)}</span>
          <button
            type="button"
            className="button outline tiny"
            onClick={() => setTentativa((n) => n + 1)}
          >
            {t('Tentar novamente')}
          </button>
        </div>
      )}
      {!erro && !eventos && <p role="status">{t('Carregando o painel…')}</p>}

      {resumo && (
        <div className="metrics admin-metrics">
          {[
            ['Contas aguardando', resumo.pendingAccounts, 'Ver aprovações', '/admin/moderacao'],
            ['Eventos publicados', resumo.publishedEvents, 'Em venda ou a acontecer'],
            ['Ingressos ativos', resumo.activeTickets, 'Com os participantes'],
            ['Atendimentos abertos', resumo.openSupport, 'Ver atendimentos', '/admin/atendimentos'],
          ].map(([rotulo, valor, nota, destino]) => (
            <div className="metric" key={rotulo}>
              <span>{t(rotulo)}</span>
              <strong>{numero(valor)}</strong>
              {destino ? (
                <Link className="text-link" to={destino}>
                  {t(nota)} →
                </Link>
              ) : (
                <small>{t(nota)}</small>
              )}
            </div>
          ))}
        </div>
      )}

      {eventos && (
        <>
          <section className="ah-search" aria-label={t('Pesquisa de eventos')}>
            <div className="ah-search-row">
              <label className="search-box wide">
                <Icon name="search" size={18} />
                <input
                  aria-label={t('Buscar eventos')}
                  placeholder={t('Buscar por evento, organização, local ou número...')}
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                />
              </label>
              <div className="ah-filters">
                <label>
                  {t('Situação:')}
                  <select
                    value={situacao}
                    onChange={(e) => {
                      setSituacao(e.target.value);
                      setPagina(1);
                    }}
                  >
                    <option value="Todos">
                      {t('Todos os eventos')} ({comSituacao.length})
                    </option>
                    {situacoes.map((nome) => (
                      <option key={nome} value={nome}>
                        {t(nome)} ({comSituacao.filter((e) => e.situacao[0] === nome).length})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('Ordenar:')}
                  <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                    {Object.entries(ORDENS).map(([valor, [nome]]) => (
                      <option key={valor} value={valor}>
                        {t(nome)}
                      </option>
                    ))}
                  </select>
                </label>
                <DownloadButton name="eventos-trocaticket.csv" rows={planilha} />
              </div>
            </div>
            <div className="ah-summary">
              <span>
                {t('Eventos cancelados:')} <strong>{numero(resumo?.cancelledEvents)}</strong>
              </span>
              <i aria-hidden="true" />
              <span>
                {t('Contas recusadas:')}{' '}
                <strong className="amber">{numero(resumo?.rejectedAccounts)}</strong>
              </span>
              <span className="ah-updated">
                {t('Atualizado às')} {atualizadoEm} ·{' '}
                <button
                  type="button"
                  className="text-link plain-button"
                  onClick={() => setTentativa((n) => n + 1)}
                >
                  {t('Atualizar')}
                </button>
              </span>
            </div>
          </section>

          <div className="ah-heading">
            <h2>{t('Grade de Eventos')}</h2>
            <span className="ah-count">
              {filtrados.length} {filtrados.length === 1 ? t('Evento') : t('Eventos')}
            </span>
          </div>
          <p className="ah-lead">
            {t(
              'Abra um evento para ver o relatório completo e, se preciso, cancelá-lo com estorno.',
            )}
          </p>

          <div className="ah-grid">
            {visiveis.map((e) => (
              <EventCard
                key={e.id}
                event={{
                  id: e.id,
                  title: e.title,
                  subtitle: e.cancelReason
                    ? t('Cancelado: {motivo}', { motivo: e.cancelReason })
                    : e.location,
                  date: dateLabel(e.startDate),
                }}
                variant="admin"
                metrics={{
                  tag: t('EVENTO Nº {id}', { id: e.id }),
                  status: e.situacao[0],
                  statusTone: e.situacao[1],
                  rows: [
                    { label: 'Organização', value: e.organizer },
                    { label: 'Ingressos vendidos', value: numero(e.tickets.sold), tone: 'ah-pill' },
                    { label: 'Ocupação', value: percentual(e.occupancy), tone: 'green' },
                    { label: 'Receita líquida', value: money(liquida(e)) },
                  ],
                  highlightText: (
                    <>
                      <Icon name="chart" size={18} />
                      <span>
                        {numero(e.resales.count)} {t('revendas ·')} {numero(e.transfers)}{' '}
                        {t('transferências ·')} {numero(e.exchanges)} {t('trocas')}
                      </span>
                    </>
                  ),
                }}
                actions={
                  <Link className="ah-cta" to={`/admin/relatorios/${e.id}`}>
                    {t('Visão e Relatórios')}
                    <span className="sr-only">
                      {' '}
                      {t('de')} {e.title}
                    </span>{' '}
                    <span aria-hidden="true">↗</span>
                  </Link>
                }
              />
            ))}
          </div>
          {!filtrados.length && (
            <Empty
              title={
                comSituacao.length
                  ? t('Nenhum resultado encontrado')
                  : t('Nenhum evento cadastrado')
              }
            >
              {comSituacao.length
                ? t('Nenhum evento corresponde aos filtros selecionados.')
                : t('Os eventos aparecem aqui assim que os organizadores os cadastram.')}
            </Empty>
          )}
          {filtrados.length > POR_PAGINA && (
            <Pagination
              page={atual}
              pageSize={POR_PAGINA}
              total={filtrados.length}
              onPage={setPagina}
            />
          )}
        </>
      )}
    </div>
  );
}
