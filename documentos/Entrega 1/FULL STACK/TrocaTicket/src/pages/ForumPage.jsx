import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { Community } from './Participant';

/**
 * O fórum permanece isolado em iframe, mas recebe a identidade ativa do site.
 * Isso mantém o mesmo perfil demonstrativo nas duas áreas sem criar uma segunda conta.
 */
export default function ForumPage() {
  const frame = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from;
  const { role, data, isAuthenticated } = useStore();
  const perfil = data?.profile || {};
  const identidade = {
    type: 'TROCATICKET_IDENTITY',
    payload: {
      name: perfil.name || 'Visitante TrocaTicket',
      email: perfil.email || '',
      role: role || 'comprador',
      photo: perfil.photo || '/images/avatar-default.png',
      username: perfil.username || '',
    },
  };

  const enviarIdentidade = useCallback(() => {
    frame.current?.contentWindow?.postMessage(identidade, window.location.origin);
  }, [perfil.name, perfil.email, perfil.photo, perfil.username, role]);

  useEffect(() => {
    if (isAuthenticated) return undefined;
    const aoReceber = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'TROCATICKET_FORUM_BACK') {
        const destino =
          typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
            ? returnTo
            : '/eventos';

        navigate(destino);
      }
      if (event.data?.type === 'TROCATICKET_FORUM_READY') {
        enviarIdentidade();
        frame.current?.contentWindow?.postMessage(
          { type: 'TROCATICKET_SET_THEME', dark: document.documentElement.dataset.theme === 'dark' },
          window.location.origin,
        );
      }
    };
    window.addEventListener('message', aoReceber);
    enviarIdentidade();
    return () => window.removeEventListener('message', aoReceber);
  }, [enviarIdentidade, isAuthenticated, navigate, returnTo]);

  if (isAuthenticated) {
    return <Community />;
  }

  return (
    <iframe
      ref={frame}
      className="forum-frame"
      src="/forum/index.html"
      title="Comunidade TrocaTicket — Fórum"
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => {
        enviarIdentidade();
        const dark = (() => {
          try {
            return localStorage.getItem('trocaticket-theme') === 'dark';
          } catch {
            return false;
          }
        })();
        frame.current?.contentWindow?.postMessage(
          { type: 'TROCATICKET_SET_THEME', dark },
          window.location.origin,
        );
      }}
    />
  );
}
