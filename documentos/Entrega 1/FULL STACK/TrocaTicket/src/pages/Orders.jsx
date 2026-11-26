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
        <PageTitle title="Meus pedidos" subtitle="Reservas, pagamentos simulados e estornos." />
        <Empty heading="h2" title="Área disponível para usuários">
          Entre com uma conta de usuário para acompanhar seus pedidos.
        </Empty>
      </div>
    );
  }

  return (
    <div className="workspace participant-orders">
      <PageTitle
        title="Meus pedidos"
        subtitle="Acompanhe reservas, pagamentos simulados e estornos. Nenhum valor é cobrado de verdade."
      >
        <Link className="button outline" to="/ingressos">
          Meus ingressos
        </Link>
        <Link className="button outline" to="/atendimento">
          Atendimento
        </Link>
        <Link className="button primary" to="/eventos">
          Explorar eventos
        </Link>
      </PageTitle>
      {erro && (
        <div className="api-error" role="alert">
          <span>{erro}</span>
          <button
            type="button"
            className="button outline tiny"
            onClick={() => setTentativa((valor) => valor + 1)}
          >
            Atualizar
          </button>
        </div>
      )}
      {carregando && <p role="status">Carregando pedidos…</p>}
      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading">Pedidos da sua conta</h2>
        {pedidos.length ? (
          <div className="cards-three">
            {pedidos.map((pedido) => {
              const [situacao, tom] = SITUACAO_PEDIDO[pedido.status] || [pedido.status, 'blue'];
              const forma = formas[pedido.id] || 'pix';
              const ocupado = Boolean(emAndamento);
              return (
                <Panel key={pedido.id} className="order-card">
                  <img className="supplier-cover" src={pedido.image} alt={pedido.eventTitle} />
                  <Badge tone={tom}>{situacao}</Badge>
                  <h3>{pedido.eventTitle}</h3>
                  <p>
                    {pedido.eventDate} · {pedido.location}
                  </p>
                  <p>
                    {pedido.quantity} × {pedido.type} · <strong>{money(pedido.total)}</strong>
                  </p>
                  <p className="muted">
                    Pedido nº {pedido.id}
                    {pedido.resale ? ' · Revenda' : ''}
                    {pedido.paymentMethod
                      ? ` · ${FORMA_PAGAMENTO[pedido.paymentMethod] || pedido.paymentMethod}`
                      : ''}
                  </p>
                  {pedido.reason && pedido.status !== 'pago' && (
                    <p className="muted">{pedido.reason}</p>
                  )}

                  {pedido.canPay && (
                    <>
                      <p className="info-note">
                        Reservado até {horaLimite(pedido.secondsToExpire)}.{' '}
                        {pedido.resale
                          ? 'Depois disso, o ingresso volta para a revenda e passa para o próximo da fila.'
                          : 'Depois disso, os lugares são liberados.'}
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
                            ? 'Processando…'
                            : pedido.total > 0
                              ? `Pagar ${money(pedido.total)}`
                              : 'Confirmar inscrição'}
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
                          Cancelar reserva
                        </button>
                      </div>
                    </>
                  )}

                  {pedido.tickets.length > 0 && (
                    <ul className="order-tickets" aria-label={`Ingressos do pedido ${pedido.id}`}>
                      {pedido.tickets.map((ticket) => (
                        <li key={ticket.id}>
                          {ticket.code ? (
                            <code>{ticket.code}</code>
                          ) : (
                            <span>Ingresso nº {ticket.id}</span>
                          )}
                          <span className="muted">
                            {ticket.refunded
                              ? 'Estornado'
                              : !ticket.withBuyer
                                ? 'Repassado (troca, revenda ou transferência)'
                                : ticket.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pedido.refundedAmount > 0 && (
                    <p>
                      Estornado: <strong>{money(pedido.refundedAmount)}</strong> (simulação)
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
                        Solicitar estorno de {money(pedido.refundableAmount)}
                      </button>
                    </div>
                  )}
                  <Link className="text-link" to={`/atendimento?pedido=${pedido.id}`}>
                    Ajuda com o pedido nº {pedido.id}
                  </Link>
                </Panel>
              );
            })}
          </div>
        ) : (
          !carregando && (
            <Empty title="Você ainda não fez pedidos">
              Escolha um evento publicado e reserve seus ingressos. O pagamento é simulado.
            </Empty>
          )
        )}
      </section>

      {confirmarEstorno && (
        <Modal title="Solicitar estorno" onClose={() => !emAndamento && setConfirmarEstorno(null)}>
          <h3>{confirmarEstorno.eventTitle}</h3>
          <p>
            Os ingressos deste pedido que ainda estão com você serão cancelados e o valor de{' '}
            <strong>{money(confirmarEstorno.refundableAmount)}</strong> será estornado (simulação).
            Ingressos repassados em troca não entram no estorno.
          </p>
          {erro && (
            <p className="api-error" role="alert">
              {erro}
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
            {emAndamento ? 'Registrando…' : 'Confirmar estorno'}
          </button>
          <button
            type="button"
            className="button outline full"
            disabled={Boolean(emAndamento)}
            onClick={() => setConfirmarEstorno(null)}
          >
            Voltar
          </button>
        </Modal>
      )}
    </div>
  );
}
