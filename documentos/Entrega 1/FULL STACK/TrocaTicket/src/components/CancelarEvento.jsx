import React, { useState } from 'react';
import { Modal } from './UI';
import { cancelarEvento } from '../services/admin';
import useGravacao from '../utils/useGravacao';
import { t } from '../i18n';

// Cancelamento de evento do banco (etapa 6), usado pela administração e pelo organizador dono.
// O motivo é obrigatório e aparece para quem comprou; quem pagou recebe o estorno simulado.
export default function CancelarEvento({ evento, aoConcluir, aoFechar }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const gravacao = useGravacao();
  const ocupado = Boolean(gravacao.ocupado);

  async function confirmar(event) {
    event.preventDefault();
    const texto = motivo.trim();
    if (texto.length < 5) {
      setErro('Informe o motivo do cancelamento (pelo menos 5 caracteres).');
      return;
    }
    setErro('');
    const resultado = await gravacao.gravar(`cancelar:${evento.id}:${texto}`, (chave) =>
      cancelarEvento(evento.id, texto, chave),
    );
    if (resultado?.erro) setErro(resultado.erro);
    if (resultado?.resposta) aoConcluir(resultado.resposta);
  }

  return (
    <Modal title={t('Cancelar este evento?')} onClose={() => !ocupado && aoFechar()}>
      <form className="cancel-event-form" onSubmit={confirmar} noValidate>
        <p>
          <strong>{evento.title}</strong>
        </p>
        <p>
          {t(
            'Os ingressos ativos serão cancelados e quem pagou recebe o estorno simulado: quem comprou na revenda recebe o valor da revenda; os demais, o valor da compra. Reservas em aberto, anúncios, fila de espera, convites e trocas pendentes são encerrados. Ingressos já utilizados na portaria não são estornados. Não é possível desfazer.',
          )}
        </p>
        <label htmlFor="motivo-cancelamento">
          {t('Motivo do cancelamento (aparece para quem comprou)')}
        </label>
        <textarea
          id="motivo-cancelamento"
          required
          minLength={5}
          maxLength={500}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? 'motivo-cancelamento-erro' : undefined}
        />
        {erro && (
          <p id="motivo-cancelamento-erro" role="alert" className="field-error">
            {t(erro)}
          </p>
        )}
        <div className="actions">
          <button type="button" className="button outline" onClick={aoFechar} disabled={ocupado}>
            {t('Voltar')}
          </button>
          <button type="submit" className="button danger" disabled={ocupado}>
            {ocupado ? t('Cancelando…') : t('Confirmar cancelamento')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
