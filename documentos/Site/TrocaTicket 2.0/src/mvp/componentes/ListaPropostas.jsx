import React from 'react';
import { useI18n } from '../../i18n';
import { MutationError, Price, Status, useMutation } from '../shared';

// O componente recebe os dados e avisa a página quando uma decisão é salva.
const situacaoProposta = { P: 'Pendente', A: 'Aceito', R: 'Recusado', C: 'Cancelado' };
export default function ListaPropostas({ proposals, organizer = false, reload }) {
  const { t } = useI18n();
  const action = useMutation(reload);
  return (
    <>
      <div className="mvp-stack">
        {proposals?.length ? (
          proposals.map((p) => (
            <article key={p.id} className="mvp-list-row">
              <div>
                <h3>{p.productName}</h3>
                <p>
                  {p.eventTitle} · {p.supplierName}
                </p>
                <p>{p.description}</p>
                <p>
                  {p.quantity} × <Price value={p.unitCents} /> ={' '}
                  <strong>
                    <Price value={p.totalCents} />
                  </strong>
                </p>
                <Status value={situacaoProposta[p.status]} />
                {p.status === 'P' && (
                  <div className="actions">
                    {organizer ? (
                      <>
                        <button
                          className="button primary"
                          disabled={action.busy}
                          onClick={() =>
                            action.run(`/propostas/${p.id}/status`, { status: 'A' }, 'PATCH')
                          }
                        >
                          {t('Aceitar proposta')}
                        </button>
                        <button
                          className="button outline"
                          disabled={action.busy}
                          onClick={() =>
                            action.run(`/propostas/${p.id}/status`, { status: 'R' }, 'PATCH')
                          }
                        >
                          {t('Recusar proposta')}
                        </button>
                      </>
                    ) : (
                      <button
                        className="button outline"
                        disabled={action.busy}
                        onClick={() =>
                          action.run(`/propostas/${p.id}/status`, { status: 'C' }, 'PATCH')
                        }
                      >
                        {t('Cancelar proposta')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <p>{t('Nenhuma proposta encontrada.')}</p>
        )}
      </div>
      <MutationError action={action} />
    </>
  );
}
