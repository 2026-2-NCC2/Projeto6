import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/StoreContext';
import { destinations, roleNames } from '../data/demo';
import AccessibilityTools from '../accessibility/AccessibilityTools';
import { useI18n } from '../i18n';
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
  const { t, locale } = useI18n();
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
  }, [pathname]);
  useEffect(() => {
    document.title = t('TrocaTicket — Eventos & ingressos');
  }, [locale]);
  return (
    <div className={publicPage ? 'public-shell' : 'app-shell'}>
      <a className="skip-link" href="#conteudo">
        {t('Pular para o conteúdo')}
      </a>
      <header className={`header ${!publicPage ? 'app-header' : ''}`}>
        <Link className="brand" to="/" aria-label={t('TrocaTicket, início')}>
          <img src="/images/logo.png" alt="" />
          <span>
            TrocaTicket<small>{t('EVENTOS & INGRESSOS')}</small>
          </span>
        </Link>
        {publicPage ? (
          <nav aria-label={t('Navegação principal')}>
            <Link to="/perfis" className="demo-link">
              {t('Explorar demo')}
            </Link>
            <Link className="login-link" to="/entrar">
              {t('Entrar')}
            </Link>
            <Link className="header-cta" to="/cadastro">
              {t('Criar conta ↗')}
            </Link>
          </nav>
        ) : (
          <>
            <button
              className="menu-toggle"
              aria-label={t(menu ? 'Fechar menu' : 'Abrir menu')}
              aria-expanded={menu}
              aria-controls="main-navigation"
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <nav
              id="main-navigation"
              className={`app-navigation ${menu ? 'is-open' : ''}`}
              aria-label={t('Navegação principal')}
            >
              {menus[activeRole].map(([label, to]) => (
                <NavLink end key={to} to={to}>
                  {t(label)}
                </NavLink>
              ))}
            </nav>
            <div className="header-tools">
              <button
                className="notification-button"
                aria-label={t('Notificações')}
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                ♧<i />
              </button>
              <Link to="/perfil" aria-label={t('Configurações do perfil')}>
                ⚙
              </Link>
              <Link className="user-chip" to="/perfis">
                <span className="avatar small">CM</span>
                <span>
                  {t('MINHA CONTA')}
                  <small>{t(roleNames[activeRole])}</small>
                </span>
              </Link>
            </div>
          </>
        )}
        {notifications && (
          <div className="notification-popover">
            <strong>{t('Central de notificações')}</strong>
            <p>{t('Seu ambiente de demonstração está pronto.')}</p>
            <Link to={destinations[activeRole]} onClick={() => setNotifications(false)}>
              {t('Ir para meu painel →')}
            </Link>
          </div>
        )}
        <AccessibilityTools />
      </header>
      {!publicPage && (
        <div className="demo-strip">
          <span>{t('Ambiente de demonstração · alterações salvas neste navegador')}</span>
          <button
            onClick={() => {
              chooseRole('');
              navigate('/perfis');
            }}
          >
            {t('Trocar perfil ↗')}
          </button>
        </div>
      )}
      <main id="conteudo">
        <Outlet />
      </main>
      <footer>
        <span>
          © 2026 <strong>TrocaTicket.</strong> {t('Todos os direitos reservados.')}
        </span>
        <nav aria-label={t('Links institucionais')}>
          <Link to="/termos">{t('Termos de Uso')}</Link>
          <Link to="/privacidade">{t('Política de Privacidade')}</Link>
          <Link to="/ajuda">{t('Ajuda & Suporte')}</Link>
        </nav>
      </footer>
    </div>
  );
}
