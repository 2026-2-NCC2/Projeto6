import React from 'react';
import { Link, useParams } from 'react-router';
import { PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { Price, QueryState, useQuery } from '../shared';
import ListaPropostas from '../componentes/ListaPropostas';

export default function OrcamentoEvento() {
  const { id } = useParams();
  const { t } = useI18n();
  const event = useQuery(`/eventos/${id}`);
  const proposals = useQuery('/propostas');
  const budget = useQuery(`/eventos/${id}/orcamento`);
  const reload = () => {
    proposals.reload();
    budget.reload();
  };
  return (
    <div className="workspace">
      <PageTitle title={t('Propostas e orçamento')} subtitle={event.data?.title} />
      <div className="mvp-flow-grid">
        <Panel title={t('Propostas recebidas')}>
          <QueryState state={proposals}>
            <ListaPropostas
              organizer
              proposals={proposals.data?.filter((p) => p.eventId === Number(id))}
              reload={reload}
            />
          </QueryState>
        </Panel>
        <Panel
          title={t('Orçamento consolidado')}
          subtitle={t('Somente propostas aceitas entram no cálculo do servidor.')}
        >
          <QueryState state={budget}>
            <strong className="mvp-price">
              <Price value={budget.data?.totalCents} />
            </strong>
            <p>{t('Sem cobrança ou contratação real nesta demonstração.')}</p>
          </QueryState>
          <Link className="button outline" to="/organizador/fornecedores">
            {t('Consultar fornecedores')}
          </Link>
        </Panel>
      </div>
    </div>
  );
}
