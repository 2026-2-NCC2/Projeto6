import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Field, PageTitle, Panel } from '../components/UI';
import { useI18n } from '../i18n';
import { normalizeSearch } from '../services/rules';
import { parseCents, dateTime } from './api';
import {
  AcademicNotice,
  EmptyList,
  MutationError,
  Price,
  QueryState,
  Status,
  useMutation,
  useQuery,
} from './shared';
export default function Wallet() {
  const { t } = useI18n();
  const state = useQuery('/ingressos');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const action = useMutation(state.reload);
  const tickets = (state.data || []).filter(
    (ticket) =>
      normalizeSearch(ticket.eventTitle + ' ' + ticket.categoryName).includes(
        normalizeSearch(query),
      ) &&
      (!status || ticket.state === status),
  );
  const pages = Math.max(1, Math.ceil(tickets.length / 5));
  const actualPage = Math.min(page, pages);
  const visible = tickets.slice((actualPage - 1) * 5, actualPage * 5);
  const ticket = visible.find((item) => item.id === selected) || visible[0];
  return (
    <div className="workspace wallet-page">
      <PageTitle
        title={t('Meus ingressos')}
        subtitle={t('Titularidade, credencial e estados confirmados pelo servidor.')}
      >
        <Link className="button outline" to="/transferencias">
          {t('Transferências gratuitas')}
        </Link>
        <Link className="button outline" to="/pedidos">
          {t('Pedidos e fila')}
        </Link>
      </PageTitle>
      <Panel>
        <div className="filter-bar no-margin">
          <Field
            label={t('Buscar ingresso')}
            name="ticket-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <Field label={t('Estado de utilização')} name="ticket-status">
            <select
              id="ticket-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('Todos')}</option>
              <option value="valid">{t('Disponível')}</option>
              <option value="used">{t('Utilizado')}</option>
              <option value="cancelled">{t('Cancelado')}</option>
            </select>
          </Field>
          <button className="button outline" onClick={state.reload}>
            {t('Atualizar')}
          </button>
        </div>
      </Panel>
      <QueryState state={state}>
        {tickets.length ? (
          <div className="wallet-grid">
            <Panel title={t('Inventário de ingressos')}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Ingresso & evento')}</th>
                      <th>{t('Categoria')}</th>
                      <th>{t('Custo de aquisição')}</th>
                      <th>{t('Estado')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((item) => (
                      <tr key={item.id} className={ticket?.id === item.id ? 'selected-row' : ''}>
                        <td>
                          <button
                            className="mvp-table-select"
                            aria-pressed={ticket?.id === item.id}
                            onClick={() => setSelected(item.id)}
                          >
                            {item.eventTitle}
                            <small>DEMO-{item.id}</small>
                          </button>
                        </td>
                        <td>
                          {item.categoryName}
                          <small className="cell-caption">
                            {t(item.kind === 'half' ? 'Meia-entrada' : 'Inteira')}
                          </small>
                        </td>
                        <td>
                          <Price value={item.costCents} />
                        </td>
                        <td>
                          <Status value={item.state} />
                          {item.blocked && (
                            <small className="cell-caption">{t('Operação pendente')}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mvp-pagination">
                <button
                  className="button outline"
                  disabled={actualPage === 1}
                  onClick={() => setPage(actualPage - 1)}
                >
                  {t('Anterior')}
                </button>
                <span>
                  {actualPage}/{pages}
                </span>
                <button
                  className="button outline"
                  disabled={actualPage === pages}
                  onClick={() => setPage(actualPage + 1)}
                >
                  {t('Próxima')}
                </button>
              </div>
            </Panel>
            {ticket && (
              <aside className="wallet-detail">
                <div className="wallet-ticket-heading">
                  <small>{t('INGRESSO SELECIONADO')}</small>
                  <h2>{ticket.eventTitle}</h2>
                  <p>
                    {ticket.categoryName} · DEMO-{ticket.id}
                  </p>
                  <Status value={ticket.state} />
                </div>
                <div className="wallet-ticket-body mvp-stack">
                  <AcademicNotice />
                  <div className="mvp-credential">
                    <small>{t('CÓDIGO DE DEMONSTRAÇÃO')}</small>
                    {ticket.state === 'valid' && !ticket.blocked && ticket.credential ? (
                      <>
                        <code>{ticket.credential}</code>
                        <p>
                          {t(
                            'Somente o código vigente é aceito. Não compartilhe capturas de tela.',
                          )}
                        </p>
                      </>
                    ) : (
                      <p>
                        {t(
                          ticket.blocked
                            ? 'Resolva a operação pendente antes de apresentar o ingresso.'
                            : 'Este ingresso não permite uma nova entrada.',
                        )}
                      </p>
                    )}
                  </div>
                  <dl className="mvp-data">
                    <div>
                      <dt>{t('Valor original')}</dt>
                      <dd>
                        <Price value={ticket.originalCents} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('Custo de aquisição')}</dt>
                      <dd>
                        <Price value={ticket.costCents} />
                      </dd>
                    </div>
                    <div>
                      <dt>{t('Teto do próximo repasse')}</dt>
                      <dd>
                        <Price value={ticket.ceilingCents} />
                      </dd>
                    </div>
                  </dl>
                  {ticket.costCents === 0 && (
                    <p className="mvp-note">
                      {t('Recebido gratuitamente. Você só pode transferir novamente sem custo.')}
                    </p>
                  )}
                  <div className="wallet-actions">
                    <Link className="button outline" to={`/ingressos/${ticket.id}/historico`}>
                      {t('Ver histórico e ingresso atual')}
                    </Link>
                    {ticket.state === 'valid' && !ticket.blocked && !ticket.listingId && (
                      <>
                        <Link className="button primary" to={`/ingressos/${ticket.id}/transferir`}>
                          {t('Transferir gratuitamente')}
                        </Link>
                        {ticket.ceilingCents > 0 && (
                          <Link className="button outline" to={`/ingressos/${ticket.id}/anunciar`}>
                            {t('Repassar ingresso')}
                          </Link>
                        )}
                      </>
                    )}
                    {ticket.listingId && (
                      <button
                        className="button outline"
                        disabled={action.busy || ticket.blocked}
                        onClick={() => action.run(`/anuncios/${ticket.listingId}`, {}, 'DELETE')}
                      >
                        {t('Retirar anúncio sem reserva')}
                      </button>
                    )}
                    {ticket.invitationId && (
                      <Link className="button outline" to="/transferencias">
                        {t('Acompanhar convite')}
                      </Link>
                    )}
                    <MutationError action={action} />
                  </div>
                </div>
              </aside>
            )}
          </div>
        ) : (
          <EmptyList>{t('Nenhum ingresso nesta conta.')}</EmptyList>
        )}
      </QueryState>
    </div>
  );
}
export function TicketAction({ transfer = false }) {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useQuery('/ingressos');
  const ticket = state.data?.find((item) => item.id === Number(id));
  const [price, setPrice] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const action = useMutation(() => navigate(transfer ? '/transferencias' : '/ingressos'));
  const cents = parseCents(price);
  const eligible =
    ticket?.state === 'valid' && !ticket.blocked && !ticket.listingId && !ticket.invitationId;
  async function submit(e) {
    e.preventDefault();
    if (transfer) await action.run('/transferencias', { ticketId: ticket.id, email: email.trim() });
    else if (cents !== null && cents > 0 && cents <= ticket.ceilingCents)
      await action.run('/anuncios', { ticketId: ticket.id, priceCents: cents });
    else
      action.setError(
        t(
          'Informe um preço positivo dentro do teto. Para preço zero, use a transferência gratuita.',
        ),
      );
  }
  return (
    <div className="workspace">
      <PageTitle
        title={t(transfer ? 'Transferir gratuitamente' : 'Repassar ingresso')}
        subtitle={t(
          transfer
            ? 'Envie o ingresso para uma conta de demonstração conhecida.'
            : 'O preço é conferido pelo sistema antes de o anúncio ser publicado.',
        )}
      />
      <QueryState state={state}>
        {ticket ? (
          <div className="mvp-flow-grid">
            <Panel>
              <h2>{ticket.eventTitle}</h2>
              <p>
                {ticket.categoryName} · DEMO-{ticket.id}
              </p>
              {eligible ? (
                <form className="mvp-stack" onSubmit={submit}>
                  {transfer ? (
                    <>
                      <Field
                        label={t('E-mail da conta destinatária')}
                        name="recipient-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={254}
                      />
                      <p>
                        {t('Valor da transferência')}: <Price value={0} />
                        <br />
                        {t('Sem taxa e sem pagamento simulado.')}
                      </p>
                      <label className="mvp-check">
                        <input
                          type="checkbox"
                          required
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                        />
                        {t(
                          'Entendo que o destinatário deve aceitar na própria sessão e que o custo e o teto dele passarão a zero.',
                        )}
                      </label>
                    </>
                  ) : (
                    <>
                      <Field
                        label={t('Preço do repasse (R$)')}
                        name="resale-price"
                        inputMode="decimal"
                        placeholder="70,00"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                      <div className="mvp-note">
                        <strong>
                          {t('Seu limite é')} <Price value={ticket.ceilingCents} />
                        </strong>
                        <p>
                          {t(
                            'Você pode cobrar menos. O teto não aumenta quando outro lote do evento fica mais caro.',
                          )}
                        </p>
                      </div>
                      <p>
                        {t(
                          'O ingresso será oferecido à fila da mesma categoria. Um anúncio ativo por ingresso.',
                        )}
                      </p>
                      <Link className="text-link" to={`/ingressos/${id}/transferir`}>
                        {t('Prefere transferir gratuitamente?')}
                      </Link>
                    </>
                  )}
                  <MutationError action={action} />
                  <button className="button primary" disabled={action.busy}>
                    {t(
                      transfer
                        ? 'Enviar convite de transferência'
                        : 'Publicar anúncio de demonstração',
                    )}
                  </button>
                  <Link className="button outline" to="/ingressos">
                    {t('Voltar para meus ingressos')}
                  </Link>
                </form>
              ) : (
                <>
                  <p role="alert">
                    {t(
                      'Este ingresso possui impedimento para esta operação. Confira seu estado na carteira.',
                    )}
                  </p>
                  <Link className="button outline" to="/ingressos">
                    {t('Voltar para meus ingressos')}
                  </Link>
                </>
              )}
            </Panel>
            <Panel title={t(transfer ? 'O que acontece depois' : 'Resumo')}>
              <AcademicNotice />
              {transfer ? (
                <>
                  <h3>{t('Enquanto aguarda aceite')}</h3>
                  <p>
                    {t(
                      'Você continua titular, mas novas operações conflitantes ficam bloqueadas até aceite, recusa ou expiração.',
                    )}
                  </p>
                  <h3>{t('Após o aceite')}</h3>
                  <p>
                    {t(
                      'O ingresso passa ao destinatário, o código anterior é revogado e um novo código fica disponível.',
                    )}
                  </p>
                  <p className="mvp-note">
                    {t('Recebido gratuitamente. Você só pode transferir novamente sem custo.')}
                  </p>
                </>
              ) : (
                <>
                  <strong className="mvp-price">
                    <Price value={cents} />
                  </strong>
                  <p>
                    {t('Taxas nesta demo')}: <Price value={0} />
                    <br />
                    {t('Total do comprador')}: <Price value={cents} />
                    <br />
                    {t('Cobrança real')}: <Price value={0} />
                  </p>
                  <div className="mvp-note">
                    <strong>{t('Preço acima do teto é recusado')}</strong>
                    <p>
                      {t(
                        'O próximo titular terá como teto o menor valor entre a referência original e o custo de aquisição dele.',
                      )}
                    </p>
                  </div>
                </>
              )}
            </Panel>
          </div>
        ) : (
          <EmptyList>{t('Ingresso não disponível nesta conta.')}</EmptyList>
        )}
      </QueryState>
    </div>
  );
}
export function TicketHistory() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const state = useQuery(`/ingressos/${id}/historico`);
  const wallet = useQuery('/ingressos');
  const ticket = wallet.data?.find((item) => item.id === Number(id));
  const names = {
    issued: 'Emissão',
    primary: 'Compra primária',
    resale: 'Repasse',
    resold: 'Repasse',
    gifted: 'Transferência gratuita',
    entered: 'Entrada registrada',
    revoked: 'Credencial revogada',
    gift: 'Transferência gratuita',
    transferred: 'Transferência',
    used: 'Entrada registrada',
    cancelled: 'Cancelamento',
    refunded: 'Estorno',
  };
  return (
    <div className="workspace">
      <PageTitle title={t('Histórico e ingresso atual')} subtitle={`DEMO-${id}`} />
      <div className="mvp-flow-grid">
        <Panel title={ticket?.eventTitle || t('Histórico preservado')}>
          <QueryState state={state}>
            {state.data?.length ? (
              <ol className="mvp-timeline">
                {state.data.map((item) => (
                  <li key={item.id}>
                    <strong>{t(names[item.kind] || item.kind)}</strong>
                    <p>
                      {dateTime(item.createdAt, locale)} · <Price value={item.amountCents} />
                    </p>
                    <small>
                      {t('Conta de origem')}: {item.fromUserId || '—'} · {t('Conta destinatária')}:{' '}
                      {item.toUserId || '—'}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <p>{t('Nenhum histórico disponível.')}</p>
            )}
          </QueryState>
        </Panel>
        <Panel title={t('Somente o código vigente')}>
          <QueryState state={wallet}>
            {ticket ? (
              <>
                <Status value={ticket.state} />
                <p>
                  {t('Teto do próximo repasse')}: <Price value={ticket.ceilingCents} />
                </p>
                <div className="mvp-credential">
                  {ticket.credential && ticket.state === 'valid' && !ticket.blocked ? (
                    <code>{ticket.credential}</code>
                  ) : (
                    <p>{t('Este ingresso não permite uma nova entrada.')}</p>
                  )}
                </div>
                <p>
                  {t(
                    'A leitura consulta o estado atual do ingresso no servidor. Códigos revogados nunca autorizam entrada.',
                  )}
                </p>
              </>
            ) : (
              <p>
                {t(
                  'Você não é o titular atual. A credencial atual não é exibida para titulares anteriores.',
                )}
              </p>
            )}
          </QueryState>
          <Link className="button outline" to="/ingressos">
            {t('Voltar para meus ingressos')}
          </Link>
        </Panel>
      </div>
    </div>
  );
}
