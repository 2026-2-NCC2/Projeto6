import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { inicioDoPerfil, nomeDoPerfil, normalizarPerfil } from '../data/perfis';
import { initialsOf } from '../utils/format';
import { encerrarSessao } from '../services/api';
import DemoSwitcher from './DemoSwitcher';

// Menus de cada perfil. A página inicial de cada um fica no logotipo (inicioDoPerfil),
// por isso não há item "Início".
export const menus = {
  organizador: [
    ['Fornecedores', '/organizador/fornecedores'],
    ['Meus eventos', '/organizador/eventos'],
    ['Novo evento', '/organizador/novo'],
    ['Portaria', '/organizador/portaria'],
    ['Atendimentos', '/organizador/atendimentos'],
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
    ['Meus pedidos', '/pedidos'],
    ['Favoritos', '/favoritos'],
  ],
};

// Aliases para garantir compatibilidade se a sessão usar 'participante'
menus.participante = menus.comprador;

// Conta de administração (etapa 6): telas ligadas ao banco. A demonstração usa menus.admin.
export const menuAdminConta = [
  ['Painel geral', '/admin'],
  ['Aprovações', '/admin/moderacao'],
  ['Atendimentos', '/admin/atendimentos'],
  ['Eventos', '/eventos'],
];

// Distância mínima entre o texto do menu e o logotipo ou as ferramentas do header.
const FOLGA_MENU = 12;

// Recolhe o menu no botão ☰ quando os itens não cabem numa linha entre o logotipo e as
// ferramentas (em qualquer largura acima de 850 px, para qualquer perfil e texto). Mede o
// texto dos links: no modo recolhido o menu fica invisível, mas continua medível (CSS
// .is-compact em layout.css), então a decisão vale também ao aumentar a janela.
function useMenuCompacto(headerRef, navRef, ativo) {
  const [compacto, setCompacto] = useState(false);
  useLayoutEffect(() => {
    const header = headerRef.current;
    const nav = navRef.current;
    if (!ativo || !header || !nav || typeof ResizeObserver === 'undefined') {
      setCompacto(false);
      return undefined;
    }
    const texto = (elemento) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(elemento);
      return faixa.getBoundingClientRect();
    };
    function medir() {
      if (nav.classList.contains('is-open')) return; // aberto (em coluna): mantém a decisão
      const links = [...nav.querySelectorAll('a')].filter((link) => link.offsetWidth > 0);
      const marca = header.querySelector('.brand');
      const ferramentas = header.querySelector('.header-tools');
      if (!links.length || !marca || !ferramentas) return;
      const largura = texto(links[links.length - 1]).right - texto(links[0]).left;
      const espaco = ferramentas.getBoundingClientRect().left - marca.getBoundingClientRect().right;
      setCompacto(largura + 2 * FOLGA_MENU > espaco);
    }
    const observador = new ResizeObserver(medir);
    [header, nav, header.querySelector('.header-tools')].filter(Boolean).forEach((el) => observador.observe(el));
    medir();
    document.fonts?.ready.then(medir).catch(() => {});
    return () => observador.disconnect();
  }, [headerRef, navRef, ativo]);
  return compacto;
}

/**
 * Componente Navbar unificado.
 * Altera dinamicamente as opções exibidas de acordo com o perfil de usuário armazenado na sessão.
 */
export default function Navbar({ darkMode, toggleTheme }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, role, isAuthenticated, chooseRole, notify } = useStore();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const headerRef = useRef(null);
  const navRef = useRef(null);
  async function handleLogout() {
    // Encerra a sessão no servidor (o cookie deixa de valer) e depois limpa o navegador.
    // No modo demonstração não há sessão no servidor, então nada é enviado à API.
    if (isAuthenticated) await encerrarSessao();
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
  const currentSessionRole = normalizarPerfil(sessionRole || data?.profile?.role);
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

  // Visitante (sem conta e sem perfil de demonstração) vê sempre o header público.
  const isPublicView = !currentSessionRole && !isAuthenticated;
  const isDemo = !isAuthenticated && Boolean(currentSessionRole);

  // Informações específicas do perfil
  const supplier = activeRole === 'fornecedor' ? data?.supplierProfile : null;
  const supplierName = supplier ? supplier.tradeName || supplier.name : '';

  // Caminho da página de perfil (para fornecedor é /fornecedor/perfil; para participante e outros é /perfil)
  const profileUrl = activeRole === 'fornecedor' ? '/fornecedor/perfil' : '/perfil';
  const roleLabel = nomeDoPerfil(activeRole);

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

  const itensMenu =
    activeRole === 'admin' && isAuthenticated ? menuAdminConta : menus[activeRole] || menus.comprador;
  const compacto = useMenuCompacto(
    headerRef,
    navRef,
    isPublicView ? '' : itensMenu.map(([label]) => label).join('|'),
  );

  return (
    <header
      ref={headerRef}
      className={`header ${!isPublicView ? 'app-header' : ''} ${compacto ? 'is-compact' : ''} ${
        itensMenu.length >= 5 ? 'menu-longo' : ''
      }`}
    >
      <Link
        className="brand"
        to={isPublicView ? '/' : inicioDoPerfil(activeRole)}
        aria-label="TrocaTicket Eventos & Ingressos, página inicial"
      >
        <img src="/images/logo.png" alt="" />
        <span>
          TrocaTicket <small>EVENTOS & INGRESSOS</small>
        </span>
      </Link>

      {isPublicView ? (
        /* Navegação para visitantes sem perfil na sessão */
        <nav className="public-navigation" aria-label="Navegação principal">
          <Link to="/perfis" className="demo-link">
            <span className="nav-long">Explorar </span>demo
          </Link>
          <Link className="login-link" to="/entrar">
            Entrar
          </Link>
          <button
            type="button"
            className="theme-toggle"
            aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            aria-pressed={darkMode}
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
            ref={navRef}
            className={`app-navigation ${menu ? 'is-open' : ''}`}
            aria-label="Navegação principal"
          >
            {itensMenu.map(([label, to]) => (
              <NavLink end key={to} to={to}>
                {label}
              </NavLink>
            ))}
            {/* No celular o cartão do perfil some do header; o acesso fica no menu. */}
            <NavLink end className="nav-mobile-only" to={profileUrl}>
              Meu perfil
            </NavLink>
          </nav>

          <div className="header-tools">
            {isDemo && <DemoSwitcher perfilAtual={currentSessionRole} />}

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
              aria-pressed={darkMode}
              onClick={toggleTheme}
            >
              <span aria-hidden="true">{darkMode ? '☀' : '☾'}</span>
            </button>

            {/* Botão do perfil: leva para a página de perfil (profileUrl) */}
            <Link
              className="user-chip"
              to={profileUrl}
              title={`Abrir perfil de ${roleLabel}`}
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
              <span aria-hidden="true">↳</span>
              <span className="logout-text">Sair</span>
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
            to={inicioDoPerfil(activeRole)}
            onClick={() => setNotifications(false)}
          >
            Ir para meu painel →
          </Link>
        </div>
      )}
    </header>
  );
}
