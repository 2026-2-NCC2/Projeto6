import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/StoreContext';
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
  const { data, role, chooseRole } = useStore();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  let activeRole = role || 'comprador';
  if (pathname.startsWith('/organizador')) activeRole = 'organizador';
  else if (pathname.startsWith('/fornecedor')) activeRole = 'fornecedor';
  else if (pathname.startsWith('/admin')) activeRole = 'admin';
  else if (
    ['/eventos', '/favoritos', '/ingressos', '/comunidade'].some(
      (caminho) => pathname === caminho || pathname.startsWith(caminho + '/'),
    )
  )
    activeRole = 'comprador';

  // Mantém o perfil das configurações igual ao da área que está aberta.
  useEffect(() => {
    if (activeRole !== role) chooseRole(activeRole);
  }, [pathname, activeRole, role]);
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
                <span className="avatar small">
                  {data.profile.name
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('') || 'TT'}
                </span>
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
