import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { destinations, roleNames } from '../data/demo';
const menus = {
  organizador: [
    ['Início', '/organizador'],
    ['Fornecedores', '/organizador/fornecedores'],
    ['Meus eventos', '/organizador/eventos'],
    ['Novo evento', '/organizador/novo'],
  ],
  fornecedor: [
    ['Início', '/fornecedor'],
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
    ['Início', '/eventos'],
    ['Comunidade', '/comunidade'],
    ['Meus ingressos', '/ingressos'],
    ['Favoritos', '/favoritos'],
  ],
};
export default function Layout() {
  const { pathname } = useLocation();
  const { role, chooseRole } = useStore();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const activeRole = pathname.startsWith('/organizador')
    ? 'organizador'
    : pathname.startsWith('/fornecedor')
      ? 'fornecedor'
      : pathname.startsWith('/admin')
        ? 'admin'
        : role || 'comprador';
  const publicPage = ['/', '/entrar', '/cadastro', '/perfis', '/recuperar'].includes(pathname);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
    setNotifications(false);
    document.title = 'TrocaTicket — Eventos & ingressos';
  }, [pathname]);
  return (
    <div className={publicPage ? 'public-shell' : 'app-shell'}>
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
          <nav aria-label="Navegação principal">
            <Link to="/perfis" className="demo-link">
              Explorar demo
            </Link>
            <Link className="login-link" to="/entrar">
              Entrar
            </Link>
            <Link className="header-cta" to="/cadastro">
              Criar conta ↗
            </Link>
          </nav>
        ) : (
          <>
            <button
              className="menu-toggle"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ☰
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
                ♧<i />
              </button>
              <Link to="/perfil" aria-label="Configurações do perfil">
                ⚙
              </Link>
              <Link className="user-chip" to="/perfis">
                <span className="avatar small">CM</span>
                <span>
                  MINHA CONTA<small>{roleNames[activeRole]}</small>
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
      {!publicPage && (
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
