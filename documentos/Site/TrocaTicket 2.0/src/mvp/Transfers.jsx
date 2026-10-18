import React from 'react';
import { Link } from 'react-router';
import { PageTitle, Panel } from '../components/UI';
import { useI18n } from '../i18n';
import { dateTime } from './api';
import { useSession } from './Session';
import { EmptyList, MutationError, QueryState, Status, useMutation, useQuery } from './shared';
export default function Transfers() {
  const { t, locale } = useI18n();
  const { user } = useSession();
  const state = useQuery('/transferencias');
  const action = useMutation(state.reload);
  return (
    <div className="workspace">
      <PageTitle
        title={t('Transferências gratuitas')}
        subtitle={t(
          'Somente o destinatário pode aceitar na própria sessão. Nenhum e-mail real é enviado.',
        )}
      >
        <Link className="button outline" to="/ingressos">
          {t('Meus ingressos')}
        </Link>
      </PageTitle>
      <Panel>
        <QueryState state={state}>
          {state.data?.length ? (
            <div className="mvp-stack">
              {state.data.map((invite) => (
                <article className="mvp-list-row" key={invite.id}>
                  <div>
                    <h3>{invite.eventTitle}</h3>
                    <p>
                      DEMO-{invite.ticketId} ·{' '}
                      {t(invite.toUserId === user.id ? 'Convite recebido' : 'Convite enviado')}
                    </p>
                    <Status value={invite.status} />
                    <p>
                      {t('Vencimento')}: {dateTime(invite.expiresAt, locale)}
                    </p>
                    {invite.status === 'pending' && (
                      <>
                        <p className="mvp-note">
                          {t(
                            'Ao aceitar, seu custo e teto de repasse passam a R$ 0,00. Você só poderá transferir novamente gratuitamente.',
                          )}
                        </p>
                        <div className="actions">
                          {invite.toUserId === user.id ? (
                            <>
                              <button
                                className="button primary"
                                disabled={action.busy}
                                onClick={() => action.run(`/transferencias/${invite.id}/aceitar`)}
                              >
                                {t('Entendi, aceitar gratuitamente')}
                              </button>
                              <button
                                className="button outline"
                                disabled={action.busy}
                                onClick={() => action.run(`/transferencias/${invite.id}/recusar`)}
                              >
                                {t('Recusar convite')}
                              </button>
                            </>
                          ) : (
                            <button
                              className="button outline"
                              disabled={action.busy}
                              onClick={() => action.run(`/transferencias/${invite.id}/cancelar`)}
                            >
                              {t('Cancelar convite')}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyList>{t('Nenhum convite nesta conta.')}</EmptyList>
          )}
        </QueryState>
        <MutationError action={action} />
      </Panel>
    </div>
  );
}
