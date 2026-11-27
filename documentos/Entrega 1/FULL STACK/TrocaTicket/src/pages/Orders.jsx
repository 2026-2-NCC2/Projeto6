import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/Store';
import { Badge, Empty, Modal, PageTitle, Panel, money } from '../components/UI';
import PaymentChoice from '../components/PaymentChoice';
import {
  FORMA_PAGAMENTO,
  SITUACAO_PEDIDO,
  cancelarPedido,
  criarChave,
  estornarPedido,
  horaLimite,
  listarPedidos,
  pagarPedido,
} from '../services/orders';
import { t } from '../i18n';

// "Meus pedidos" (etapa 3): reservas, pagamento simulado, cancelamento e estorno.
export default function Orders() {
  const { isAuthenticated, role, notify } = useStore();
  const podeUsar = isAuthenticated && role === 'comprador';
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [emAndamento, setEmAndamento] = useState('');
  const [formas, setFormas] = useState({});
  const [confirmarEstorno, setConfirmarEstorno] = useState(null);
  const chaves = useRef({});

  const recarregar = useCallback(async (signal) => {
    setPedidos(await listarPedidos(signal));
  }, []);

  useEffect(() => {
    if (!podeUsar) return undefined;
    const controller = new AbortController();
    setCarregando(true);
    setErro('');
    recarregar(controller.signal)
      .catch((error) => {
        if (error.name !== 'AbortError') setErro(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [podeUsar, recarregar, tentativa]);

  // Reaproveita a mesma chave se a ação ficou sem resposta, para nunca pagar ou estornar em dobro.
  async function executar(nome, acao, mensagem) {
    chaves.current[nome] ||= criarChave();
    setEmAndamento(nome);
    setErro('');
    try {
      const atualizado = await acao(chaves.current[nome]);
      delete chaves.current[nome];
      setPedidos((lista) => lista.map((item) => (item.id === atualizado.id ? atualizado : item)));
      notify(typeof mensagem === 'function' ? mensagem(atualizado) : mensagem);
      return atualizado;
    } catch (error) {
      if (!error.semResposta) delete chaves.current[nome];
      setErro(error.message);
      return null;
    } finally {
      setEmAndamento('');
    }
  }

  if (!podeUsar) {
    return (
      <div className="workspace">
        <PageTitle
          title={t('Meus pedidos')}
          subtitle={t('Reservas, pagamentos simulados e estornos.')}
        />
        <Empty heading="h2" title={t('Área disponível para usuários')}>
          {t('Entre com uma conta de usuário para acompanhar seus pedidos.')}
        </Empty>
      </div>
    );
  }

  return (
    <div className="workspace participant-orders">
      <PageTitle
        title={t('Meus pedidos')}
        subtitle={t(
          'Acompanhe reservas, pagamentos simulados e estornos. Nenhum valor é cobrado de verdade.',
        )}
      >
        <Link className="button outline" to="/ingressos">
          {t('Meus ingressos')}
        </Link>
        <Link className="button outline" to="/atendimento">
          {t('Atendimento')}
        </Link>
        <Link className="button primary" to="/eventos">
          {t('Explorar eventos')}
        </Link>
      </PageTitle>
      {erro && (
        <div className="api-error" role="alert">
          <span>{t(erro)}</span>
          <button
            type="button"
            className="button outline tiny"
            onClick={() => setTentativa((valor) => valor + 1)}
          >
            {t('Atualizar')}
          </button>
        </div>
      )}
      {carregando && <p role="status">{t('Carregando pedidos…')}</p>}
      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading">{t('Pedidos da sua conta')}</h2>
        {pedidos.length ? (
          <div className="cards-three">
            {pedidos.map((pedido) => {
              const [situacao, tom] = SITUACAO_PEDIDO[pedido.status] || [pedido.status, 'blue'];
              const forma = formas[pedido.id] || 'pix';
              const ocupado = Boolean(emAndamento);
              return (
                <Panel key={pedido.id} className="order-card">
                  <img className="supplier-cover" src={pedido.image} alt={pedido.eventTitle} />
                  <Badge tone={tom}>{t(situacao)}</Badge>
                  <h3>{pedido.eventTitle}</h3>
                  <p>
                    {pedido.eventDate} · {pedido.location}
                  </p>
                  <p>
                    {pedido.quantity} × {pedido.type} · <strong>{money(pedido.total)}</strong>
                  </p>
                  <p className="muted">
                    {t('Pedido nº')} {pedido.id}
                    {pedido.resale ? t(' · Revenda') : ''}
                    {pedido.paymentMethod
                      ? ` · ${FORMA_PAGAMENTO[pedido.paymentMethod] || pedido.paymentMethod}`
                      : ''}
                  </p>
                  {/* Etapa 6: evento cancelado pela organização ou pela administração. */}
                  {pedido.eventCancelled && (
                    <p className="info-note event-cancelled-note">
                      <strong>{t('Evento cancelado.')}</strong>{' '}
                      {pedido.cancelReason
                        ? t('Motivo: {cancelReason}. ', { cancelReason: pedido.cancelReason })
                        : ''}
                      {pedido.refundedAmount > 0
                        ? t('O estorno simulado já foi registrado neste pedido.')
                        : t('Não há valor a estornar neste pedido.')}
                    </p>
                  )}
                  {pedido.reason &&
                    pedido.status !== 'pago' &&
                    !(
                      pedido.eventCancelled &&
                      /^(Cancelamento do evento|Reserva cancelada: o evento)/.test(pedido.reason)
                    ) && <p className="muted">{pedido.reason}</p>}

                  {pedido.canPay && (
                    <>
                      <p className="info-note">
                        {t('Reservado até')} {horaLimite(pedido.secondsToExpire)}.{' '}
                        {pedido.resale
                          ? t(
                              'Depois disso, o ingresso volta para a revenda e passa para o próximo da fila.',
                            )
                          : t('Depois disso, os lugares são liberados.')}
                      </p>
                      {pedido.total > 0 && (
                        <PaymentChoice
                          value={forma}
                          onChange={(valor) =>
                            setFormas((atual) => ({ ...atual, [pedido.id]: valor }))
                          }
                          name={`forma-pagamento-${pedido.id}`}
                        />
                      )}
                      <div className="actions">
                        <button
                          type="button"
                          className="button primary"
                          disabled={ocupado}
                          onClick={() =>
                            executar(
                              `pagar:${pedido.id}`,
                              (chave) =>
                                pagarPedido(pedido.id, pedido.total > 0 ? forma : undefined, chave),
                              (atualizado) =>
                                atualizado.status === 'pago'
                                  ? 'Pagamento aprovado (simulação). Os ingressos estão em Meus ingressos.'
                                  : atualizado.reason || 'O pagamento simulado não foi aprovado.',
                            )
                          }
                        >
                          {emAndamento === `pagar:${pedido.id}`
                            ? t('Processando…')
                            : pedido.total > 0
                              ? t('Pagar {v1}', { v1: money(pedido.total) })
                              : t('Confirmar inscrição')}
                        </button>
                        <button
                          type="button"
                          className="button danger-outline"
                          disabled={ocupado}
                          onClick={() =>
                            executar(
                              `cancelar:${pedido.id}`,
                              (chave) => cancelarPedido(pedido.id, chave),
                              'Reserva cancelada. Os lugares foram liberados.',
                            )
                          }
                        >
                          {t('Cancelar reserva')}
                        </button>
                      </div>
                    </>
                  )}

                  {pedido.tickets.length > 0 && (
                    <ul
                      className="order-tickets"
                      aria-label={t('Ingressos do pedido {id}', { id: pedido.id })}
                    >
                      {pedido.tickets.map((ticket) => (
                        <li key={ticket.id}>
                          {ticket.code ? (
                            <code>{ticket.code}</code>
                          ) : (
                            <span>
                              {t('Ingresso nº')} {ticket.id}
                            </span>
                          )}
                          <span className="muted">
                            {ticket.refunded
                              ? t('Estornado')
                              : !ticket.withBuyer
                                ? t('Repassado (troca, revenda ou transferência)')
                                : ticket.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pedido.refundedAmount > 0 && (
                    <p>
                      {t('Estornado:')} <strong>{money(pedido.refundedAmount)}</strong>{' '}
                      {t('(simulação)')}
                    </p>
                  )}
                  {pedido.canRefund && (
                    <div className="actions">
                      <button
                        type="button"
                        className="button outline"
                        disabled={ocupado}
                        onClick={() => setConfirmarEstorno(pedido)}
                      >
                        {t('Solicitar estorno de')} {money(pedido.refundableAmount)}
                      </button>
                    </div>
                  )}
                  <Link className="text-link" to={`/atendimento?pedido=${pedido.id}`}>
                    {t('Ajuda com o pedido nº')} {pedido.id}
                  </Link>
                </Panel>
              );
            })}
          </div>
        ) : (
          !carregando && (
            <Empty title={t('Você ainda não fez pedidos')}>
              {t('Escolha um evento publicado e reserve seus ingressos. O pagamento é simulado.')}
            </Empty>
          )
        )}
      </section>

      {confirmarEstorno && (
        <Modal
          title={t('Solicitar estorno')}
          onClose={() => !emAndamento && setConfirmarEstorno(null)}
        >
          <h3>{confirmarEstorno.eventTitle}</h3>
          <p>
            {t('Os ingressos deste pedido que ainda estão com você serão cancelados e o valor de')}{' '}
            <strong>{money(confirmarEstorno.refundableAmount)}</strong>{' '}
            {t('será estornado (simulação). Ingressos repassados em troca não entram no estorno.')}
          </p>
          {erro && (
            <p className="api-error" role="alert">
              {t(erro)}
            </p>
          )}
          <button
            type="button"
            className="button primary full"
            disabled={Boolean(emAndamento)}
            onClick={async () => {
              const atualizado = await executar(
                `estornar:${confirmarEstorno.id}`,
                (chave) => estornarPedido(confirmarEstorno.id, chave),
                (pedido) => `Estorno de ${money(pedido.refundedAmount)} registrado (simulação).`,
              );
              if (atualizado) setConfirmarEstorno(null);
            }}
          >
            {emAndamento ? t('Registrando…') : t('Confirmar estorno')}
          </button>
          <button
            type="button"
            className="button outline full"
            disabled={Boolean(emAndamento)}
            onClick={() => setConfirmarEstorno(null)}
          >
            {t('Voltar')}
          </button>
        </Modal>
      )}
    </div>
  );
}
