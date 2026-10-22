import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/StoreContext';
import { destinations, roleNames } from '../data/demo';
import AccessibilityTools from '../accessibility/AccessibilityTools';
import { assetUrl } from '../services/assets';
import { useI18n } from '../i18n';
import '../styles/demo-publica.css';
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
  const { t } = useI18n();
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
    <div className={`${publicPage ? 'public-shell' : 'app-shell'} demo-browser-shell`}>
      <a
        className="skip-link"
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault();
          const content = document.getElementById('conteudo');
          content?.focus();
          content?.scrollIntoView();
        }}
      >
        {t('Pular para o conteúdo')}
      </a>
      <header className={`header ${!publicPage ? 'app-header' : ''}`}>
        <Link className="brand" to="/" aria-label={t('TrocaTicket, início')}>
          <img src={assetUrl('/images/logo.png')} alt="" />
          <span>
            TrocaTicket
            <small>{t('EVENTOS & INGRESSOS')}</small>
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
              {t('Criar conta')} ↗
            </Link>
          </nav>
        ) : (
          <>
            <button
              className="menu-toggle"
              aria-label={t('Abrir menu')}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
            <nav
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
                <span className="avatar small">
                  {data.profile.name
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('') || 'TT'}
                </span>
                <span>
                  {t('MINHA CONTA')}
                  <small>{t(roleNames[activeRole])}</small>
                </span>
              </Link>
            </div>
          </>
        )}
        <AccessibilityTools />
        {notifications && (
          <div className="notification-popover">
            <strong>{t('Central de notificações')}</strong>
            <p>{t('Seu ambiente de demonstração está pronto.')}</p>
            <Link to={destinations[activeRole]} onClick={() => setNotifications(false)}>
              {t('Ir para meu painel')} →
            </Link>
          </div>
        )}
      </header>
      <div className="demo-strip demo-browser-notice" role="note">
        <span>
          <strong>{t('Demonstração acadêmica • sem pagamentos ou ingressos reais')}</strong>
          <small>
            {t('Dados fictícios salvos neste navegador • sem backend ou banco de dados')}
          </small>
        </span>
        {!publicPage && (
          <button
            onClick={() => {
              chooseRole('');
              navigate('/perfis');
            }}
          >
            {t('Trocar perfil')} ↗
          </button>
        )}
      </div>
      <main id="conteudo" tabIndex={-1}>
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
