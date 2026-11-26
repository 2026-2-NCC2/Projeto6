import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import Navbar from './Navbar';
import AvisoAprovacao from './AvisoAprovacao';
import { inicioDoPerfil } from '../data/perfis';

export default function Layout({ darkMode, toggleTheme }) {
  const { pathname } = useLocation();
  const { role, isAuthenticated, chooseRole } = useStore();
  const navigate = useNavigate();

  const sessionRole =
    role || (typeof window !== 'undefined' ? sessionStorage.getItem('trocaticket-role') : '') || '';

  const isPublicRoute = ['/', '/entrar', '/cadastro', '/perfis', '/recuperar'].includes(pathname);
  const isVisitor = !sessionRole && !isAuthenticated;
  const isDemoMode = Boolean(sessionRole) && !isAuthenticated;
  // Só a homepage pública deixa o header flutuar sobre a imagem; as demais telas
  // reservam o espaço do header (ver layout.css).
  // A homepage do Usuário (referência 01) também deixa a imagem do hero passar por trás
  // do header: "hero-shell" não reserva o espaço e o próprio hero desce o conteúdo.
  const shellClass =
    isVisitor && pathname === '/'
      ? 'public-shell'
      : isVisitor && isPublicRoute
        ? 'account-shell'
        : pathname === '/'
          ? 'app-shell hero-shell'
          : 'app-shell';

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'TrocaTicket — Eventos & ingressos';
  }, [pathname]);

  useEffect(() => {
    if (isAuthenticated) {
      if (['/perfis', '/entrar', '/cadastro'].includes(pathname)) {
        navigate('/', { replace: true });
        return;
      }
      const wrongRole =
        (pathname.startsWith('/organizador') && role !== 'organizador') ||
        (pathname.startsWith('/fornecedor') && role !== 'fornecedor') ||
        (pathname.startsWith('/admin') && role !== 'admin');
      if (wrongRole) navigate(inicioDoPerfil(role), { replace: true });
      return;
    }
    if (!sessionRole && (
      pathname.startsWith('/organizador') ||
      pathname.startsWith('/fornecedor') ||
      pathname.startsWith('/admin') ||
      pathname === '/favoritos' ||
      pathname === '/ingressos' ||
      pathname === '/pedidos' ||
      pathname === '/repasses' ||
      pathname === '/atendimento' ||
      pathname === '/perfil'
    )) {
      navigate('/perfis', { replace: true });
    }
  }, [isAuthenticated, navigate, pathname, role, sessionRole]);

  return (
    <div className={shellClass}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      {/* Componente Navbar modularizado e controlado pelo perfil na sessão */}
      <Navbar darkMode={darkMode} toggleTheme={toggleTheme} />

      {/* Conta aguardando aprovação ou recusada pela administração (etapa 6). */}
      <AvisoAprovacao />

      {isDemoMode && pathname !== '/perfis' && (
        <aside className="demo-strip" aria-label="Modo demonstração">
          <span>
            <i aria-hidden="true" /> Ambiente de demonstração · dados fictícios salvos neste
            navegador
          </span>
          <button
            onClick={() => {
              chooseRole('');
              navigate('/perfis');
            }}
          >
            Trocar perfil ↗
          </button>
        </aside>
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
