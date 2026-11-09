import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import Navbar from './Navbar';
import { destinations } from '../data/demo';

export default function Layout() {
  const { pathname } = useLocation();
  const { role, isAuthenticated, chooseRole } = useStore();
  const navigate = useNavigate();

  const sessionRole =
    role || (typeof window !== 'undefined' ? sessionStorage.getItem('trocaticket-role') : '') || '';

  const isPublicRoute = ['/', '/entrar', '/cadastro', '/perfis', '/recuperar'].includes(pathname);
  const isPublic = !sessionRole && isPublicRoute;
  const isDemoMode = Boolean(sessionRole) && !isAuthenticated;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'TrocaTicket — Eventos & ingressos';
  }, [pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      if (['/', '/perfis', '/entrar', '/cadastro'].includes(pathname)) {
        navigate(destinations[role] || '/eventos', { replace: true });
        return;
      }
      const wrongRole =
        (pathname.startsWith('/organizador') && role !== 'organizador') ||
        (pathname.startsWith('/fornecedor') && role !== 'fornecedor') ||
        (pathname.startsWith('/admin') && role !== 'admin');
      if (wrongRole) navigate(destinations[role] || '/eventos', { replace: true });
      return;
    }
    if (!sessionRole && (
      pathname.startsWith('/organizador') ||
      pathname.startsWith('/fornecedor') ||
      pathname.startsWith('/admin') ||
      pathname === '/favoritos' ||
      pathname === '/ingressos'
    )) {
      navigate('/perfis', { replace: true });
    }
  }, [isAuthenticated, navigate, pathname, role, sessionRole]);

  return (
    <div className={isPublic ? 'public-shell' : 'app-shell'}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      {/* Componente Navbar modularizado e controlado pelo perfil na sessão */}
      <Navbar />

      {!isPublicRoute && isDemoMode && (
        <div className="demo-strip">
          <span>Ambiente de demonstração · alterações salvas neste navegador</span>
          <button
            onClick={() => {
              chooseRole('');
              navigate('/perfis');
            }}
          >
            Trocar perfil ↗
          </button>
        </div>
      )}

      <main id="conteudo">
        <Outlet />
      </main>

      <footer>
        <span>
          © 2026 <strong>TrocaTicket.</strong> Todos os direitos reservados.
        </span>
        <nav aria-label="Links institucionais">
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
          <Link to="/ajuda">Ajuda & Suporte</Link>
        </nav>
      </footer>
    </div>
  );
}
