import React, { useEffect, useState } from 'react';
import { useStore } from '../context/Store';
import { minhaAprovacao } from '../services/admin';

// Etapa 6: contas de organizador e fornecedor esperam a aprovação da administração e contas
// recusadas só consultam. O aviso diz o que está liberado e deixa conferir a situação de novo.
export default function AvisoAprovacao() {
  const { isAuthenticated, role, aprovacao, atualizarAprovacao, notify } = useStore();
  const [motivo, setMotivo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState('');
  const pendente = aprovacao === 'P';
  const recusada = aprovacao === 'R';

  // O motivo da recusa vem do histórico de decisões da administração.
  useEffect(() => {
    if (!isAuthenticated || !recusada) return undefined;
    const controller = new AbortController();
    minhaAprovacao(controller.signal)
      .then((situacao) => setMotivo(situacao.lastDecision?.reason || ''))
      .catch(() => {});
    return () => controller.abort();
  }, [isAuthenticated, recusada]);

  if (!isAuthenticated || (!pendente && !recusada)) return null;

  async function verificar() {
    setVerificando(true);
    setErro('');
    try {
      const situacao = await minhaAprovacao();
      setMotivo(situacao.lastDecision?.reason || '');
      if (situacao.approval === aprovacao) {
        notify(
          pendente
            ? 'Sua conta continua aguardando a aprovação da administração.'
            : 'Sua conta continua recusada.',
        );
        return;
      }
      atualizarAprovacao(situacao.approval);
      notify(
        situacao.approval === 'A'
          ? 'Conta aprovada pela administração. As ações estão liberadas.'
          : situacao.approval === 'R'
            ? 'A administração recusou a conta. Veja o motivo no aviso.'
            : 'Sua conta voltou para a análise da administração.',
      );
    } catch (error) {
      setErro(error.message);
    } finally {
      setVerificando(false);
    }
  }

  const liberado =
    role === 'organizador'
      ? 'completar o perfil e preparar eventos como rascunho'
      : role === 'fornecedor'
        ? 'completar o perfil e consultar as oportunidades'
        : 'consultar os seus dados';

  return (
    <aside
      className={`approval-strip ${recusada ? 'rejected' : 'pending'}`}
      aria-label="Situação da conta"
    >
      <div>
        <strong>
          {pendente
            ? 'Conta aguardando aprovação da administração'
            : 'Conta recusada pela administração'}
        </strong>
        <p>
          {pendente
            ? `Enquanto isso, você pode ${liberado}. Publicar, vender e negociar ficam liberados depois da aprovação.`
            : `Motivo: ${motivo || 'não informado'}. Você ainda consulta os seus dados, mas as ações que gravam ficam bloqueadas.`}
        </p>
        {erro && (
          <p role="alert" className="field-error">
            {erro}
          </p>
        )}
      </div>
      <button
        type="button"
        className="button outline tiny"
        onClick={verificar}
        disabled={verificando}
      >
        {verificando ? 'Verificando…' : 'Verificar situação'}
      </button>
    </aside>
  );
}
