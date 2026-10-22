import React, { useState } from 'react';
import { Field, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { MutationError, useMutation } from '../shared';

export default function CancelarEvento({ eventoId, aoCancelar }) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const cancel = useMutation(aoCancelar);
  return (
    <Panel
      title={t('Cancelar evento')}
      subtitle={t(
        'O cancelamento encerra operações e concilia estornos simulados. Não pode ser desfeito.',
      )}
    >
      <form
        className="mvp-stack"
        onSubmit={(e) => {
          e.preventDefault();
          cancel.run(`/eventos/${eventoId}/cancelar`, { reason });
        }}
      >
        <Field
          label={t('Motivo do cancelamento')}
          name="cancel-reason"
          required
          minLength={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <label className="mvp-check">
          <input type="checkbox" required />
          {t('Confirmo o cancelamento deste evento fictício.')}
        </label>
        <button className="button danger" disabled={cancel.busy}>
          {t('Cancelar evento e conciliar operações')}
        </button>
        <MutationError action={cancel} />
      </form>
    </Panel>
  );
}
