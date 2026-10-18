import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Field, PageTitle, Panel } from '../components/UI';
import { useI18n } from '../i18n';
import { dateTime } from './api';
import { useSession } from './Session';
import { AcademicNotice, MutationError, QueryState, Status, useMutation, useQuery } from './shared';

export function Administration() {
  const { t } = useI18n();
  const { user } = useSession();
  const accounts = useQuery('/admin/usuarios');
  const config = useQuery('/demo/config');
  const action = useMutation(accounts.reload);
  const [settings, setSettings] = useState({
    paymentScenario: 'approved',
    issuerScenario: 'success',
  });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (config.data)
      setSettings({
        paymentScenario: config.data.paymentScenario,
        issuerScenario: config.data.issuerScenario,
      });
  }, [config.data]);
  const save = useMutation(() => {
    setSaved(true);
    config.reload();
  });
  const approval = { A: 'Aprovado', P: 'Pendente', R: 'Recusado' };
  const roles = { comprador: 'Participante', organizador: 'Organizador', fornecedor: 'Fornecedor' };
  return (
    <div className="workspace">
      <PageTitle
        title={t('Administração da demonstração')}
        subtitle={t('Permissões e cenários são verificados pelo servidor.')}
      >
        <Link className="button outline" to="/atendimentos">
          {t('Atendimentos e denúncias')}
        </Link>
        <Link className="button outline" to="/portaria">
          {t('Portaria simulada')}
        </Link>
      </PageTitle>
      <Panel
        title={t('Aprovação de contas')}
        subtitle={t('O cadastro público nunca concede permissão de administrador.')}
      >
        <QueryState state={accounts}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Conta')}</th>
                  <th>{t('Perfil')}</th>
                  <th>{t('Situação')}</th>
                  <th>{t('Ações')}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.data?.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}</strong>
                      <small className="cell-caption">{account.email}</small>
                    </td>
                    <td>
                      {t(roles[account.role])}
                      {account.admin && (
                        <small className="cell-caption">{t('Administrador')}</small>
                      )}
                    </td>
                    <td>
                      <Status value={approval[account.approval]} />
                    </td>
                    <td>
                      <div className="actions">
                        {[
                          ['A', 'Aprovar'],
                          ['P', 'Manter pendente'],
                          ['R', 'Recusar'],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            className="button outline"
                            disabled={
                              action.busy || value === account.approval || account.id === user.id
                            }
                            onClick={() =>
                              action.run(
                                `/admin/usuarios/${account.id}/aprovacao`,
                                { approval: value },
                                'PATCH',
                              )
                            }
                          >
                            {t(label)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        <MutationError action={action} />
      </Panel>
      <Panel
        title={t('Controles dos simuladores locais')}
        subtitle={t(
          'Estes controles afetam operações futuras da base de demonstração. Nenhum pagamento é real.',
        )}
      >
        <QueryState state={config}>
          <form
            className="mvp-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.run('/demo/config', settings, 'PATCH');
            }}
          >
            <div className="form-grid">
              <Field label={t('Cenário de pagamento fictício')} name="payment-scenario">
                <select
                  id="payment-scenario"
                  value={settings.paymentScenario}
                  onChange={(e) => {
                    setSaved(false);
                    setSettings((v) => ({ ...v, paymentScenario: e.target.value }));
                  }}
                >
                  <option value="approved">{t('Aprovado')}</option>
                  <option value="rejected">{t('Recusado')}</option>
                  <option value="unavailable">{t('Indisponível')}</option>
                </select>
              </Field>
              <Field label={t('Cenário de emissão e transferência')} name="issuer-scenario">
                <select
                  id="issuer-scenario"
                  value={settings.issuerScenario}
                  onChange={(e) => {
                    setSaved(false);
                    setSettings((v) => ({ ...v, issuerScenario: e.target.value }));
                  }}
                >
                  <option value="success">{t('Sucesso')}</option>
                  <option value="temporary_failure">{t('Falha temporária')}</option>
                </select>
              </Field>
            </div>
            <p>
              {t('Prazo da reserva')}: {config.data?.reservationMinutes} min ·{' '}
              {t('Prazo do convite')}: {config.data?.invitationMinutes} min ·{' '}
              {t('Limite por conta e evento')}: {config.data?.accountLimit}
            </p>
            <MutationError action={save} />
            {saved && (
              <p role="status">
                {t('Cenários salvos. As próximas operações usarão esta configuração.')}
              </p>
            )}
            <button className="button primary" disabled={save.busy}>
              {t('Salvar cenários de demonstração')}
            </button>
          </form>
        </QueryState>
      </Panel>
    </div>
  );
}

function SupportThread({ item, reload, admin }) {
  const { t, locale } = useI18n();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(item.status);
  const action = useMutation(() => {
    setMessage('');
    reload();
  });
  return (
    <article className="mvp-support-thread">
      <div className="panel-heading">
        <h2>
          #{item.id} · {item.subject}
        </h2>
        <Status value={item.status} />
      </div>
      <p>
        {item.orderId ? `${t('Pedido')} #${item.orderId}` : `${t('Anúncio')} #${item.listingId}`} ·{' '}
        {dateTime(item.createdAt, locale)}
      </p>
      <ol className="mvp-timeline">
        {item.messages.map((row) => (
          <li key={row.id}>
            <small>
              {t(row.userId === item.userId ? 'Solicitante' : 'Administração')} ·{' '}
              {dateTime(row.createdAt, locale)}
            </small>
            <p className="mvp-preline">{row.message}</p>
          </li>
        ))}
      </ol>
      {admin && (
        <form
          className="mvp-stack"
          onSubmit={(e) => {
            e.preventDefault();
            action.run(`/atendimentos/${item.id}/respostas`, { message, status });
          }}
        >
          <Field label={t('Resposta administrativa')} name={`support-answer-${item.id}`}>
            <textarea
              id={`support-answer-${item.id}`}
              required
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <Field label={t('Situação do atendimento')} name={`support-status-${item.id}`}>
            <select
              id={`support-status-${item.id}`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">{t('Aberto')}</option>
              <option value="reviewing">{t('Em análise')}</option>
              <option value="closed">{t('Encerrado')}</option>
            </select>
          </Field>
          <MutationError action={action} />
          <button className="button primary" disabled={action.busy}>
            {t('Salvar resposta e situação')}
          </button>
        </form>
      )}
    </article>
  );
}
export function Support() {
  const { t } = useI18n();
  const { user } = useSession();
  const [params] = useSearchParams();
  const state = useQuery('/atendimentos');
  const [kind, setKind] = useState(params.get('anuncio') ? 'listing' : 'order');
  const [reference, setReference] = useState(params.get('pedido') || params.get('anuncio') || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [created, setCreated] = useState(false);
  const action = useMutation(() => {
    state.reload();
    setMessage('');
    setSubject('');
    setCreated(true);
  });
  return (
    <div className="workspace">
      <PageTitle
        title={t('Atendimentos e denúncias')}
        subtitle={t('Acompanhe o histórico e a resposta administrativa, sem chat ou e-mail real.')}
      />
      <div className="mvp-flow-grid">
        <Panel
          title={t('Histórico de atendimento')}
          action={
            <button className="button outline" onClick={state.reload}>
              {t('Atualizar')}
            </button>
          }
        >
          <QueryState state={state}>
            {state.data?.length ? (
              state.data.map((item) => (
                <SupportThread key={item.id} item={item} reload={state.reload} admin={user.admin} />
              ))
            ) : (
              <p>{t('Nenhum atendimento registrado.')}</p>
            )}
          </QueryState>
        </Panel>
        <Panel title={t('Abrir solicitação ou denúncia')}>
          <form
            className="mvp-stack"
            onSubmit={(e) => {
              e.preventDefault();
              action.run('/atendimentos', {
                [kind === 'order' ? 'orderId' : 'listingId']: Number(reference),
                subject,
                message,
              });
            }}
          >
            <Field label={t('Vincular a')} name="support-kind">
              <select
                id="support-kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setCreated(false);
                }}
              >
                <option value="order">{t('Pedido')}</option>
                <option value="listing">{t('Anúncio')}</option>
              </select>
            </Field>
            <Field
              label={t('Número do pedido ou anúncio')}
              name="support-reference"
              required
              type="number"
              min="1"
              step="1"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setCreated(false);
              }}
            />
            <Field
              label={t('Assunto')}
              name="support-subject"
              required
              maxLength={150}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setCreated(false);
              }}
            />
            <Field label={t('Mensagem')} name="support-message">
              <textarea
                id="support-message"
                required
                maxLength={2000}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setCreated(false);
                }}
              />
            </Field>
            <p className="muted">
              {t('Não envie documentos, dados financeiros ou informações pessoais reais.')}
            </p>
            <MutationError action={action} />
            {created && (
              <p role="status">
                {t('Solicitação registrada no banco. Acompanhe o histórico nesta página.')}
              </p>
            )}
            <button className="button primary" disabled={action.busy || user.approval !== 'A'}>
              {t('Registrar solicitação')}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export function Gate() {
  const { t } = useI18n();
  const { user } = useSession();
  const events = useQuery(user.admin ? '/eventos' : '/organizador/eventos');
  const [eventId, setEventId] = useState('');
  const [credential, setCredential] = useState('');
  const [result, setResult] = useState(null);
  const action = useMutation(setResult);
  return (
    <div className="workspace narrow">
      <PageTitle
        title={t('Portaria simulada')}
        subtitle={t(
          'Validação central online. Uma credencial válida autoriza somente uma entrada.',
        )}
      />
      <Panel>
        <AcademicNotice />
        <QueryState state={events}>
          <form
            className="mvp-stack"
            onSubmit={(e) => {
              e.preventDefault();
              setResult(null);
              action.run('/portaria', { eventId: Number(eventId), credential: credential.trim() });
            }}
          >
            <Field label={t('Evento')} name="gate-event">
              <select
                id="gate-event"
                value={eventId}
                required
                onChange={(e) => {
                  setEventId(e.target.value);
                  setResult(null);
                  action.setError('');
                }}
              >
                <option value="">{t('Selecione um evento')}</option>
                {events.data
                  ?.filter((e) => e.status !== 'draft')
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
              </select>
            </Field>
            <Field
              label={t('Código manual da credencial')}
              name="credential"
              required
              value={credential}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setCredential(e.target.value);
                setResult(null);
                action.setError('');
              }}
            />
            <p className="muted">
              {t(
                'Copie o código vigente da carteira da conta fictícia. Câmera e leitura offline não estão habilitadas.',
              )}
            </p>
            <button className="button primary" disabled={action.busy || !eventId}>
              {t('Validar entrada simulada')}
            </button>
            <MutationError action={action} />
            {result?.accepted && (
              <div className="mvp-entry-success" role="status">
                <strong>{t('Entrada autorizada nesta demonstração.')}</strong>
                <p>
                  {t('O ingresso foi marcado como utilizado. Uma segunda leitura será recusada.')}
                </p>
                <p>DEMO-{result.ticketId}</p>
              </div>
            )}
          </form>
        </QueryState>
      </Panel>
    </div>
  );
}
