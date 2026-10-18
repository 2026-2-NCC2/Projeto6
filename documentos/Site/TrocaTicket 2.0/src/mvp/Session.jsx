import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useI18n } from '../i18n';
import { api, setCsrfToken } from './api';
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accept = useCallback((data) => {
    setUser(data.user);
    setCsrfToken(data.csrfToken);
    setError('');
    return data.user;
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      accept(await api('/auth/session'));
    } catch (e) {
      setUser(null);
      setCsrfToken(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accept]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  async function login(values) {
    return accept(await api('/auth/login', { method: 'POST', body: values }));
  }
  async function register(values) {
    return accept(await api('/auth/register', { method: 'POST', body: values }));
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST', body: {} });
    setCsrfToken(null);
    setUser(null);
  }
  return (
    <SessionContext.Provider
      value={{ user, loading, error, refresh, login, register, logout, accept }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  return useContext(SessionContext);
}
export function RequireSession({ children, role, approved = true, admin = false }) {
  const session = useSession();
  const location = useLocation();
  const { t } = useI18n();
  if (session.loading)
    return (
      <p className="feedback" role="status">
        {t('Conferindo sessão…')}
      </p>
    );
  if (session.error)
    return (
      <div className="workspace">
        <div className="feedback" role="alert">
          <p>{session.error}</p>
          <button className="button primary" onClick={session.refresh}>
            {t('Tentar novamente')}
          </button>
        </div>
      </div>
    );
  if (!session.user)
    return (
      <Navigate
        replace
        to={`/entrar?voltar=${encodeURIComponent(location.pathname + location.search)}`}
      />
    );
  if ((admin && !session.user.admin) || (role && session.user.role !== role && !session.user.admin))
    return (
      <div className="workspace">
        <section className="panel">
          <h1>{t('Acesso restrito')}</h1>
          <p>{t('Seu perfil não tem permissão para esta área.')}</p>
        </section>
      </div>
    );
  if (approved && session.user.approval !== 'A') return <Navigate replace to="/perfil" />;
  return children;
}
