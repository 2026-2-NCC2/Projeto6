import React from 'react';
import { PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { QueryState, useQuery } from '../shared';
import ListaPropostas from '../componentes/ListaPropostas';

export default function MinhasPropostas() {
  const { t } = useI18n();
  const state = useQuery('/propostas');
  return (
    <div className="workspace">
      <PageTitle
        title={t('Minhas propostas')}
        subtitle={t('Acompanhe os valores e as decisões registradas pelo organizador.')}
      />
      <Panel>
        <QueryState state={state}>
          <ListaPropostas proposals={state.data} reload={state.reload} />
        </QueryState>
      </Panel>
    </div>
  );
}
