import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Modal } from '../components/UI';
import AccessibilityTools from '../accessibility/AccessibilityTools';
import { useI18n } from '../i18n';
import { useSession } from './Session';
import { AcademicNotice, MutationError, useMutation } from './shared';
const roleLabels = {
  comprador: 'Participante',
  organizador: 'Organizador',
  fornecedor: 'Fornecedor',
};
export default function IntegratedLayout() {
  const { user, loading, error, refresh } = useSession();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const action = useMutation(async () => {
    await refresh();
    navigate('/');
  });
  useEffect(() => {
    setMenu(false);
    setOpen(false);
    window.scrollTo(0, 0);
    document.title = 'TrocaTicket — MVP acadêmico';
  }, [pathname]);
  const links = [
    ['Eventos', '/eventos'],
    ['Meus favoritos', '/favoritos'],
    ['Meus ingressos', '/ingressos'],
    ['Pedidos e fila', '/pedidos'],
  ];
  if (user?.role === 'organizador')
    links.push(
      ['Meus eventos', '/organizador/eventos'],
      ['Fornecedores', '/organizador/fornecedores'],
    );
  if (user?.role === 'fornecedor')
    links.push(
      ['Oportunidades', '/fornecedor'],
      ['Inventário', '/fornecedor/inventario'],
      ['Propostas', '/fornecedor/propostas'],
    );
  if (user?.admin) links.push(['Administração', '/admin']);
  return (
    <div className="app-shell mvp-shell">
      <a className="skip-link" href="#conteudo">
        {t('Pular para o conteúdo')}
      </a>
      <header className="header app-header">
        <Link className="brand" to="/" aria-label={t('TrocaTicket, início')}>
          <img src="/images/logo.png" alt="" />
          <span>
            TrocaTicket<small>{t('EVENTOS & INGRESSOS')}</small>
          </span>
        </Link>
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
          {(user
            ? links
            : [
                ['Eventos', '/eventos'],
                ['Entrar', '/entrar'],
                ['Criar conta', '/cadastro'],
              ]
          ).map(([label, path]) => (
            <NavLink key={path} end to={path}>
              {t(label)}
            </NavLink>
          ))}
          {user && (
            <NavLink className="mvp-mobile-profile" to="/perfil">
              {t('Perfil')}
            </NavLink>
          )}
          {user && (
            <button type="button" className="mvp-mobile-notification" onClick={() => setOpen(true)}>
              {t('Notificações')}
            </button>
          )}
        </nav>
        <div className="header-tools">
          <AccessibilityTools />
          {user && (
            <>
              <button
                className="notification-button"
                aria-label={t('Notificações')}
                onClick={() => setOpen(true)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                </svg>
              </button>
              <Link className="user-chip" to="/perfil" aria-label={t('Configurações do perfil')}>
                <span className="avatar small">
                  {user.photo ? (
                    <img src={user.photo} alt="" />
                  ) : (
                    user.name.slice(0, 2).toUpperCase()
                  )}
                </span>
                <span>
                  {user.name}
                  <small>{t(roleLabels[user.role])}</small>
                </span>
              </Link>
            </>
          )}
        </div>
      </header>
      <div className="demo-strip">
        <span>{t('MVP acadêmico integrado • MySQL local')}</span>
        {user ? (
          <button disabled={action.busy} onClick={() => action.run('/auth/logout')}>
            {t('Sair')}
          </button>
        ) : loading ? (
          <span>{t('Conferindo sessão…')}</span>
        ) : (
          <Link to="/entrar">{t('Entrar')}</Link>
        )}
      </div>
      <AcademicNotice />
      <MutationError action={action} />
      {error && (
        <div className="mvp-api-warning" role="alert">
          <span>{error}</span>
          <button className="button outline" onClick={refresh}>
            {t('Tentar novamente')}
          </button>
        </div>
      )}
      <main id="conteudo">
        <Outlet />
      </main>
      <footer>
        <span>
          © 2026 <strong>TrocaTicket.</strong> {t('Projeto acadêmico com dados fictícios.')}
        </span>
        <nav>
          <Link to="/ajuda">{t('Ajuda & Suporte')}</Link>
          <Link to="/privacidade">{t('Privacidade')}</Link>
          <Link to="/termos">{t('Termos da demonstração')}</Link>
        </nav>
      </footer>
      {open && (
        <Modal title={t('Central de notificações')} onClose={() => setOpen(false)}>
          <p>{t('Consulte os estados atualizados dos seus pedidos, convites e atendimentos.')}</p>
          <div className="mvp-stack">
            <Link className="button outline" to="/pedidos">
              {t('Pedidos e fila')}
            </Link>
            <Link className="button outline" to="/transferencias">
              {t('Transferências gratuitas')}
            </Link>
            <Link className="button outline" to="/atendimentos">
              {t('Atendimento')}
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
