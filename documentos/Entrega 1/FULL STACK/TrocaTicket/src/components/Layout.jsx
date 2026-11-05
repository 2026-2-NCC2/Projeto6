import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useStore } from '../context/Store';
import { destinations, roleNames } from '../data/demo';
import Icon from './Icon';
const menus = {
  organizador: [
    ['Fornecedores', '/organizador/fornecedores'],
    ['Meus eventos', '/organizador/eventos'],
    ['Novo evento', '/organizador/novo'],
  ],
  fornecedor: [
    ['Minhas propostas', '/fornecedor/propostas'],
    ['Nova proposta', '/fornecedor/cotacao/tim-maia'],
    ['Inventário', '/fornecedor/inventario'],
  ],
  admin: [
    ['Painel geral', '/admin'],
    ['Relatórios', '/admin/relatorios/tim-maia'],
    ['Moderação', '/admin/moderacao'],
    ['Eventos', '/eventos'],
  ],
  comprador: [
    ['Troca-Papo', '/comunidade'],
    ['Meus ingressos', '/ingressos'],
    ['Favoritos', '/favoritos'],
  ],
};
export default function Layout() {
  const { pathname } = useLocation();
  const { role, chooseRole, data } = useStore();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  // Primeira visita: tema claro. Depois, respeita a última escolha salva.
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('trocaticket-theme');
      return savedTheme === 'dark';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      darkMode ? '#080c14' : '#f4f7fc',
    );
    try { localStorage.setItem('trocaticket-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);
  const profilePhoto = data?.profile?.photo;
  const activeRole = pathname.startsWith('/organizador')
    ? 'organizador'
    : pathname.startsWith('/fornecedor')
      ? 'fornecedor'
      : pathname.startsWith('/admin')
        ? 'admin'
        : role || 'comprador';
  const publicPage = ['/', '/entrar', '/cadastro', '/perfis', '/recuperar'].includes(pathname);
  useEffect(() => {
    const routeRole = ['organizador', 'fornecedor', 'admin'].find((value) =>
      pathname.startsWith(`/${value}`),
    );
    if (routeRole && routeRole !== role) chooseRole(routeRole);
  }, [pathname, role, chooseRole]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
    setNotifications(false);
    document.title = 'TrocaTicket — Eventos & ingressos';
  }, [pathname]);
  return (
    <div
      className={
        publicPage ? `public-shell ${pathname !== '/' ? 'account-shell' : ''}` : 'app-shell'
      }
    >
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className={`header ${!publicPage ? 'app-header' : ''}`}>
        <Link className="brand" to="/" aria-label="TrocaTicket, início">
          <img src="/images/logo.png" alt="" />
          <span>
            TrocaTicket<small>EVENTOS & INGRESSOS</small>
          </span>
        </Link>
        {publicPage ? (
          pathname === '/' ? (
            <nav aria-label="Navegação principal">
              <Link className="login-link" to="/entrar">
                Entrar
              </Link>
              <Link className="header-cta" to="/cadastro">
                Criar conta ↗
              </Link>
            </nav>
          ) : (
            <button
              type="button"
              className="theme-toggle"
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo noturno'}
              title={darkMode ? 'Modo claro' : 'Modo noturno'}
              onClick={() => setDarkMode(!darkMode)}
            >
              <Icon name={darkMode ? 'sun' : 'moon'} />
            </button>
          ) 
        ) : (
          <>
            <button
              className="menu-toggle"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Icon name="menu" />
            </button>
            <nav
              className={`app-navigation ${menu ? 'is-open' : ''}`}
              aria-label="Navegação principal"
            >
              {menus[activeRole].map(([label, to]) => (
                <NavLink end key={to} to={to}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="header-tools">
              <button
                className="notification-button"
                aria-label="Notificações"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="bell" />
                <i />
              </button>
              <button
                type="button"
                className="theme-toggle"
                aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo noturno'}
                title={darkMode ? 'Modo claro' : 'Modo noturno'}
                onClick={() => {
                  const next = !darkMode;
                  setDarkMode(next);
                  document.querySelector('.forum-frame')?.contentWindow?.postMessage(
                    { type: 'TROCATICKET_SET_THEME', dark: next },
                    window.location.origin,
                  );
                }}
              >
                <Icon name={darkMode ? 'sun' : 'moon'} />
              </button>
              <Link to="/perfil" aria-label="Configurações do perfil">
                ⚙
              </Link>
              <Link className="user-chip" to="/perfis">
                <span className="avatar small">
                  <img
                    src={profilePhoto || '/images/avatar-default.png'}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/images/avatar-default.png';
                    }}
                  />
                </span>
                <span>
                  MINHA CONTA<small>{activeRole === 'comprador' ? 'Usuário' : roleNames[activeRole]}</small>
                </span>
              </Link>
            </div>
          </>
        )}
        {notifications && (
          <div className="notification-popover">
            <strong>Central de notificações</strong>
            <p>Seu ambiente de demonstração está pronto.</p>
            <Link to={destinations[activeRole]} onClick={() => setNotifications(false)}>
              Ir para meu painel →
            </Link>
          </div>
        )}
      </header>
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
