import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { destinations, roleNames } from '../data/demo';
import { initialsOf } from '../utils/format';

export const menus = {
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

// Aliases para garantir compatibilidade se a sessão usar 'participante'
menus.participante = menus.comprador;

/**
 * Componente Navbar unificado.
 * Altera dinamicamente as opções exibidas de acordo com o perfil de usuário armazenado na sessão.
 */
export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, role, isAuthenticated, chooseRole, notify } = useStore();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('trocaticket-theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      darkMode ? '#0e1420' : '#f7f9fb',
    );
    try {
      localStorage.setItem('trocaticket-theme', darkMode ? 'dark' : 'light');
    } catch {}
  }, [darkMode]);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document
      .querySelector('.forum-frame')
      ?.contentWindow?.postMessage(
        { type: 'TROCATICKET_SET_THEME', dark: next },
        window.location.origin,
      );
  }

  function handleLogout() {
    chooseRole('');
    try {
      sessionStorage.removeItem('trocaticket-user');
      sessionStorage.removeItem('trocaticket-role');
    } catch {}
    notify('Sessão encerrada com sucesso.');
    navigate('/entrar');
  }

  // Fecha menus e notificações em qualquer mudança de rota
  useEffect(() => {
    setMenu(false);
    setNotifications(false);
  }, [pathname]);

  // Obtém o perfil da sessão (contexto da store com fallback no sessionStorage)
  const sessionRole =
    role || (typeof window !== 'undefined' ? sessionStorage.getItem('trocaticket-role') : '') || '';

  // Normaliza o identificador do perfil ('participante' -> 'comprador')
  const normalizeRole = (r) => {
    if (!r) return '';
    const lower = String(r).toLowerCase().trim();
    return lower === 'participante' ? 'comprador' : lower;
  };

  const currentSessionRole = normalizeRole(sessionRole || data?.profile?.role);
  const isPublicRoute = ['/', '/entrar', '/cadastro', '/perfis', '/recuperar'].includes(pathname);

  // A sessão define o perfil prioritariamente.
  // Caso não haja perfil na sessão:
  // - Em rotas públicas, exibe a navegação para visitantes (demo, login, cadastro).
  // - Em rotas internas diretas, faz o fallback baseado na URL.
  const activeRole =
    currentSessionRole ||
    (isPublicRoute
      ? ''
      : pathname.startsWith('/organizador')
        ? 'organizador'
        : pathname.startsWith('/fornecedor')
          ? 'fornecedor'
          : pathname.startsWith('/admin')
            ? 'admin'
            : 'comprador');

  const isPublicView = !activeRole && !isAuthenticated;

  // Informações específicas do perfil
  const supplier = activeRole === 'fornecedor' ? data?.supplierProfile : null;
  const supplierName = supplier ? supplier.tradeName || supplier.name : '';

  // Caminho da página de perfil (para fornecedor é /fornecedor/perfil; para participante e outros é /perfil)
  const profileUrl = activeRole === 'fornecedor' ? '/fornecedor/perfil' : '/perfil';
  const roleLabel = roleNames[activeRole] || 'Participante';

  const userName = supplier
    ? supplierName.toUpperCase()
    : data?.profile?.name || 'MINHA CONTA';

  const userAvatar = supplier?.photo ? (
    <img src={supplier.photo} alt={supplierName} />
  ) : supplier ? (
    initialsOf(supplierName)
  ) : data?.profile?.photo ? (
    <img src={data.profile.photo} alt={data?.profile?.name || 'Foto de perfil'} />
  ) : (
    initialsOf(data?.profile?.name || 'CM')
  );

  return (
    <header className={`header ${!isPublicRoute ? 'app-header' : ''}`}>
      <Link className="brand" to="/" aria-label="TrocaTicket, início">
        <img src="/images/logo.png" alt="" />
        <span>
          TrocaTicket<small>EVENTOS & INGRESSOS</small>
        </span>
      </Link>

      {isPublicView ? (
        /* Navegação para visitantes sem perfil na sessão */
        <nav aria-label="Navegação principal">
          <Link to="/perfis" className="demo-link">
            Explorar demo
          </Link>
          <Link className="login-link" to="/entrar">
            Entrar
          </Link>
          <button
            type="button"
            className="theme-toggle"
            aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            onClick={toggleTheme}
          >
            <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
          </button>
          <Link className="header-cta" to="/cadastro">
            Criar conta ↗
          </Link>
        </nav>
      ) : (
        /* Navegação adaptada ao tipo de perfil ativo na sessão */
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
            {(menus[activeRole] || menus.comprador).map(([label, to]) => (
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

            <button
              type="button"
              className="theme-toggle"
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              onClick={toggleTheme}
            >
              <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
            </button>

            {/* Botão do perfil/participante: leva para a página de perfil (profileUrl) */}
            <Link
              className="user-chip"
              to={profileUrl}
              aria-label={`Perfil de ${roleLabel}`}
            >
              <span className="avatar small">{userAvatar}</span>
              <span>
                {userName}
                <small>{roleLabel}</small>
              </span>
            </Link>

            {/* Botão de sair */}
            <button
              type="button"
              className="logout-button"
              aria-label="Sair da conta"
              title="Sair da conta"
              onClick={handleLogout}
            >
              <span aria-hidden="true">↳</span> Sair
            </button>
          </div>
        </>
      )}

      {notifications && !isPublicView && (
        <div className="notification-popover">
          <strong>Central de notificações</strong>
          <p>
            {isAuthenticated
              ? 'Você não tem notificações novas.'
              : 'Seu ambiente de demonstração está pronto.'}
          </p>
          <Link
            to={destinations[activeRole] || '/eventos'}
            onClick={() => setNotifications(false)}
          >
            Ir para meu painel →
          </Link>
        </div>
      )}
    </header>
  );
}
