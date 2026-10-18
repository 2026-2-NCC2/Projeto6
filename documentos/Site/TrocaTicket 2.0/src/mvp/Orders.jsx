import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { PageTitle, Panel } from '../components/UI';
import { useI18n } from '../i18n';
import { dateTime } from './api';
import {
  AcademicNotice,
  Countdown,
  EmptyList,
  MutationError,
  Price,
  QueryState,
  Status,
  useMutation,
  useQuery,
} from './shared';
export function Orders() {
  const { t, locale } = useI18n();
  const orders = useQuery('/pedidos');
  const queue = useQuery('/fila');
  const action = useMutation(() => {
    orders.reload();
    queue.reload();
  });
  return (
    <div className="workspace">
      <PageTitle
        title={t('Pedidos e fila')}
        subtitle={t('Pagamento fictício e entrega possuem estados separados.')}
      >
        <Link className="button outline" to="/transferencias">
          {t('Transferências gratuitas')}
        </Link>
      </PageTitle>
      <div className="mvp-flow-grid">
        <Panel
          title={t('Meus pedidos')}
          action={
            <button className="button outline" onClick={orders.reload}>
              {t('Atualizar')}
            </button>
          }
        >
          <QueryState state={orders}>
            {orders.data?.length ? (
              <div className="mvp-stack">
                {orders.data.map((order) => (
                  <article className="mvp-list-row" key={order.id}>
                    <div>
                      <h3>{order.eventTitle}</h3>
                      <p>
                        DEMO-{order.id} · {order.quantity} {t('unidade(s)')} ·{' '}
                        <Price value={order.amountCents} />
                      </p>
                      <p>
                        {t('Pagamento')}: <Status value={order.paymentState} /> · {t('Entrega')}:{' '}
                        <Status value={order.deliveryState} />
                      </p>
                      <small>{dateTime(order.createdAt, locale)}</small>
                    </div>
                    <Link className="button outline" to={`/pedidos/${order.id}`}>
                      {t('Acompanhar pedido')}
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyList>{t('Nenhum pedido nesta conta.')}</EmptyList>
            )}
          </QueryState>
        </Panel>
        <Panel
          title={t('Minhas filas')}
          subtitle={t(
            'Ordem e prazo são controlados pelo servidor. Não existe prioridade por lance.',
          )}
        >
          <QueryState state={queue}>
            {queue.data?.length ? (
              queue.data.map((row) => (
                <article className="mvp-list-row" key={row.id}>
                  <div>
                    <p>
                      {t('Evento')} #{row.eventId} · {t('Categoria')} #{row.categoryId}
                    </p>
                    <Status value={row.status} />
                    <p>
                      {t('Posição')}: {row.position ?? '—'}
                    </p>
                    {row.orderId && (
                      <Link className="button primary" to={`/pedidos/${row.orderId}`}>
                        {t('Ver oportunidade reservada')}
                      </Link>
                    )}
                    {['queued', 'reserved'].includes(row.status) && (
                      <button
                        className="button outline"
                        disabled={action.busy}
                        onClick={() => action.run(`/fila/${row.id}`, {}, 'DELETE')}
                      >
                        {t('Sair da fila')}
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p>{t('Você ainda não participa de uma fila.')}</p>
            )}
          </QueryState>
          <MutationError action={action} />
        </Panel>
      </div>
    </div>
  );
}
export function OrderDetails() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const state = useQuery(`/pedidos/${id}`);
  const action = useMutation(state.reload);
  const order = state.data;
  useEffect(() => {
    if (!['reserved', 'pending'].includes(order?.deliveryState)) return;
    const timer = setInterval(state.reload, 15000);
    return () => clearInterval(timer);
  }, [order?.deliveryState, state.reload]);
  return (
    <div className="workspace">
      <PageTitle
        title={t('Acompanhar pedido')}
        subtitle={t('Pagamento e entrega têm estados separados. Nenhuma cobrança é real.')}
      />
      <QueryState state={state}>
        {order && (
          <div className="mvp-flow-grid">
            <Panel title={`${t('Pedido')} DEMO-${order.id}`} subtitle={order.eventTitle}>
              <div className="mvp-stack">
                <AcademicNotice />
                <dl className="mvp-data">
                  <div>
                    <dt>{t('Pagamento fictício')}</dt>
                    <dd>
                      <Status value={order.paymentState} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Entrega')}</dt>
                    <dd>
                      <Status value={order.deliveryState} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Quantidade')}</dt>
                    <dd>{order.quantity}</dd>
                  </div>
                  <div>
                    <dt>{t('Preço por unidade')}</dt>
                    <dd>
                      <Price
                        value={order.quantity > 0 ? order.amountCents / order.quantity : null}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Total simulado')}</dt>
                    <dd>
                      <Price value={order.amountCents} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Taxas nesta demo')}</dt>
                    <dd>
                      <Price value={0} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Cobrança real')}</dt>
                    <dd>
                      <Price value={0} />
                    </dd>
                  </div>
                </dl>
                <p>{dateTime(order.createdAt, locale)}</p>
                {order.deliveryState === 'reserved' && (
                  <>
                    <Countdown until={order.expiresAt} />
                    <p>
                      {t(
                        'O preço permanece congelado durante a reserva. Ao expirar, a oportunidade é liberada pelo servidor.',
                      )}
                    </p>
                    <button
                      className="button primary"
                      disabled={action.busy}
                      onClick={() => action.run(`/pedidos/${id}/pagar`)}
                    >
                      {t('Confirmar compra simulada')}
                    </button>
                    <button
                      className="button outline"
                      disabled={action.busy}
                      onClick={() => action.run(`/pedidos/${id}/cancelar`)}
                    >
                      {t('Desistir da reserva')}
                    </button>
                  </>
                )}
                {order.deliveryState === 'pending' && (
                  <>
                    <div className="mvp-note">
                      <strong>{t('Entrega pendente')}</strong>
                      <p>
                        {t(
                          'Pagamento fictício aprovado não significa ingresso entregue. Acompanhe até a entrega ou o estorno simulado.',
                        )}
                      </p>
                    </div>
                    <button
                      className="button primary"
                      disabled={action.busy}
                      onClick={() => action.run(`/pedidos/${id}/recuperar`)}
                    >
                      {t('Tentar entregar novamente')}
                    </button>
                    <button
                      className="button outline"
                      disabled={action.busy}
                      onClick={() => action.run(`/pedidos/${id}/estornar`)}
                    >
                      {t('Solicitar estorno simulado')}
                    </button>
                  </>
                )}
                {order.deliveryState === 'delivered' && (
                  <Link className="button primary" to="/ingressos">
                    {t('Ver ingresso na carteira')}
                  </Link>
                )}
                {['cancelled', 'expired', 'refunded'].includes(order.deliveryState) && (
                  <div className="mvp-note">
                    <p>
                      {t(
                        'Esta operação foi encerrada. Consulte os estados acima ou volte ao evento para uma nova tentativa.',
                      )}
                    </p>
                    <Link className="button outline" to={`/eventos/${order.eventId}`}>
                      {t('Visualizar evento')}
                    </Link>
                  </div>
                )}
                <MutationError action={action} />
                <button className="button outline" onClick={state.reload}>
                  {t('Consultar atualização')}
                </button>
                <Link className="text-link" to="/pedidos">
                  {t('Voltar aos pedidos')}
                </Link>
              </div>
            </Panel>
            <Panel title={t('Precisa de ajuda?')}>
              <p>{t('Abra uma solicitação vinculada ao pedido e acompanhe sua resposta.')}</p>
              <Link className="button outline" to={`/atendimentos?pedido=${id}`}>
                {t('Abrir solicitação')}
              </Link>
              <div className="mvp-note">
                <strong>{t('Evento cancelado?')}</strong>
                <p>
                  {t(
                    'As unidades são canceladas e a cadeia de operações fictícias é conciliada uma única vez.',
                  )}
                </p>
              </div>
              <p className="muted">
                {t(
                  'Cenários do simulador são configurados apenas pelo administrador. Nenhum cartão ou Pix é solicitado.',
                )}
              </p>
            </Panel>
          </div>
        )}
      </QueryState>
    </div>
  );
}
