import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n';
import { api, operationKey, moneyCents } from './api';
import { Badge } from '../components/UI';
export const NOTICE = 'Demonstração acadêmica • sem pagamentos ou ingressos reais';
export function AcademicNotice() {
  const { t } = useI18n();
  return (
    <p className="mvp-academic" role="note">
      {t(NOTICE)}
    </p>
  );
}
export function useQuery(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!path) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    setState({ data: null, loading: true, error: '' });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError')
          setState({ data: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [path, version]);
  return { ...state, reload: useCallback(() => setVersion((v) => v + 1), []) };
}
// Uma falha de rede conserva a chave para que a repetição não duplique a operação.
export function useMutation(onSuccess) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  const lock = useRef(false);
  async function run(path, body = {}, method = 'POST') {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError('');
    const signature = JSON.stringify({ path, method, body });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: operationKey() };
    try {
      const result = await api(path, { method, body, key: pending.current.key });
      pending.current = null;
      await onSuccess?.(result);
      return result ?? true;
    } catch (e) {
      if (e.status !== 0) pending.current = null;
      setError(e.message);
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { run, busy, error, setError };
}
export function QueryState({ state, children }) {
  const { t } = useI18n();
  if (state.loading)
    return (
      <p className="feedback" role="status">
        {t('Carregando…')}
      </p>
    );
  if (state.error)
    return (
      <div className="feedback" role="alert">
        <p>{state.error}</p>
        <button className="button primary" onClick={state.reload}>
          {t('Tentar novamente')}
        </button>
      </div>
    );
  return children;
}
export function MutationError({ action }) {
  return action.error ? (
    <p className="feedback error" role="alert">
      {action.error}
    </p>
  ) : null;
}
export function Price({ value }) {
  const { locale } = useI18n();
  return <>{moneyCents(value, locale)}</>;
}
const labels = {
  valid: 'Disponível',
  used: 'Utilizado',
  cancelled: 'Cancelado',
  active: 'Ativo',
  reserved: 'Reservado',
  pending: 'Pendente',
  delivered: 'Entregue',
  expired: 'Expirado',
  approved: 'Aprovado',
  rejected: 'Recusado',
  unavailable: 'Indisponível',
  refunded: 'Estornado',
  published: 'Publicado',
  draft: 'Rascunho',
  closed: 'Encerrado',
  waiting: 'Aguardando',
  queued: 'Aguardando na fila',
  left: 'Retirado da fila',
  offered: 'Sua vez',
  completed: 'Concluído',
  accepted: 'Aceito',
  declined: 'Recusado',
  sold: 'Vendido',
  open: 'Aberto',
  reviewing: 'Em análise',
};
export function Status({ value }) {
  const { t } = useI18n();
  return <Badge>{t(labels[value] || value || 'Pendente')}</Badge>;
}
export function EmptyList({ children }) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <h3>{children || t('Nenhum resultado encontrado')}</h3>
      <Link className="button outline" to="/eventos">
        {t('Ver eventos')}
      </Link>
    </div>
  );
}
export function Countdown({ until }) {
  const [now, setNow] = useState(Date.now());
  const { t } = useI18n();
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return (
    <span className="mvp-countdown">
      {t('Tempo restante')}:{' '}
      {Number.isFinite(seconds)
        ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
        : '—'}
      <small>{t('O prazo e a validade são confirmados pelo servidor.')}</small>
    </span>
  );
}
