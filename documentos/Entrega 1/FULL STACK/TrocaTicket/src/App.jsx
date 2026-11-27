import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router';
import Layout from './components/Layout';
import Home from './pages/Home';
import UserHome from './pages/UserHome';
import Account, { Profiles, Recover } from './pages/Account';
import Profile from './pages/Profile';
import SupplierHome from './pages/supplier/SupplierHome';
import SupplierProposals from './pages/supplier/SupplierProposals';
import SupplierQuote from './pages/supplier/SupplierQuote';
import SupplierInventory from './pages/supplier/SupplierInventory';
import SupplierProfile from './pages/supplier/SupplierProfile';
import { Organizer, EventEditor, Consolidation, Suppliers } from './pages/Organizer';
import Admin from './pages/Admin';
import Moderation  from './pages/Moderation';
import Report from './pages/Report';
import PainelAdmin from './pages/admin/PainelAdmin';
import AprovacoesAdmin from './pages/admin/AprovacoesAdmin';
import RelatorioAdmin from './pages/admin/RelatorioAdmin';
import { Catalog, EventDetails, Tickets, Community } from './pages/Participant';
import Orders from './pages/Orders';
import Gate from './pages/Gate';
import Support from './pages/Support';
import Resale from './pages/Resale';
import ForumPage from './pages/ForumPage';
import { useStore } from './context/Store';
import { inicioDoPerfil, normalizarPerfil } from './data/perfis';
// Página inicial: visitante vê a homepage pública; o Usuário (conta ou demonstração)
// vê a homepage logada; os demais perfis vão para a página inicial do próprio perfil.
function Inicio() {
  const { role } = useStore();
  const perfil = normalizarPerfil(role);
  if (!perfil) return <Home />;
  if (perfil === 'comprador') return <UserHome />;
  return <Navigate to={inicioDoPerfil(perfil)} replace />;
}
function Info({ title, children, acao }) {
  const { isAuthenticated } = useStore();
  return (
    <div className="workspace narrow">
      <section className="panel">
        <h1>{t(title)}</h1>
        <p>{children}</p>
        {isAuthenticated && acao}
        {!isAuthenticated && (
          <Link className="button primary" to="/perfis">
            {t('Explorar os perfis')}
          </Link>
        )}
      </section>
    </div>
  );
}
// Administração (etapa 6): com conta, as telas usam o banco; no modo demonstração, os dados
// fictícios de antes continuam disponíveis.
function ContaOuDemo({ conta, demo }) {
  const { isAuthenticated } = useStore();
  return isAuthenticated ? conta : demo;
}
export default function App() {
  const { isAuthenticated } = useStore();
  const { idioma } = useIdioma(); // trocar o idioma redesenha as telas com os textos traduzidos
  useEffect(() => {
    // Título da aba no idioma escolhido, também no fórum público (fora do Layout).
    document.title = t('TrocaTicket — Eventos & ingressos');
  }, [idioma]);
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
      darkMode ? '#080c14' : '#f4f7fc',
    );
    try {
      localStorage.setItem('trocaticket-theme', darkMode ? 'dark' : 'light');
    } catch {}
  }, [darkMode]);

  useEffect(() => {
    const syncForumTheme = (event) => {
      const frame = document.querySelector('.forum-frame');
      if (frame && event.origin === window.location.origin && event.source === frame.contentWindow &&
          event.data?.type === 'TROCATICKET_THEME_CHANGED') {
        setDarkMode(Boolean(event.data.dark));
      }
    };
    window.addEventListener('message', syncForumTheme);
    return () => window.removeEventListener('message', syncForumTheme);
  }, []);

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

  return (
    <Routes>
      <Route element={<Layout darkMode={darkMode} toggleTheme={toggleTheme} />}>
        <Route index element={<Inicio />} />
        <Route path="cadastro" element={<Account key="signup" />} />
        <Route path="entrar" element={<Account key="login" login />} />
        <Route path="recuperar" element={<Recover />} />
        <Route path="perfis" element={<Profiles />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="eventos" element={<Catalog />} />
        <Route path="eventos/:id" element={<EventDetails />} />
        <Route path="favoritos" element={<Catalog favorites />} />
        <Route path="ingressos" element={<Tickets />} />
        <Route path="repasses" element={<Resale />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="atendimento" element={<Support />} />
        {isAuthenticated && <Route path="comunidade/*" element={<Community />} />}
        <Route path="comunidade/eventos" element={<Community />} />
        <Route path="organizador" element={<Organizer />} />
        <Route path="organizador/eventos" element={<Organizer list />} />
        <Route path="organizador/novo" element={<EventEditor key="new" />} />
        <Route path="organizador/eventos/:id/editar" element={<EventEditorRoute />} />
        <Route path="organizador/eventos/:id/consolidar" element={<Consolidation />} />
        <Route path="organizador/fornecedores" element={<Suppliers />} />
        <Route path="organizador/portaria" element={<Gate />} />
        <Route path="organizador/atendimentos" element={<Support />} />
        <Route path="fornecedor" element={<SupplierHome />} />
        <Route path="fornecedor/propostas" element={<SupplierProposals />} />
        <Route path="fornecedor/cotacao/:id" element={<QuoteRoute />} />
        <Route path="fornecedor/inventario" element={<SupplierInventory />} />
        <Route path="fornecedor/perfil" element={<SupplierProfile />} />
        <Route path="admin" element={<ContaOuDemo conta={<PainelAdmin />} demo={<Admin />} />} />
        <Route
          path="admin/relatorios/:id"
          element={<ContaOuDemo conta={<RelatorioAdmin />} demo={<Report />} />}
        />
        <Route
          path="admin/moderacao"
          element={<ContaOuDemo conta={<AprovacoesAdmin />} demo={<Moderation />} />}
        />
        <Route path="admin/atendimentos" element={<Support />} />
        <Route
          path="termos"
          element={
            <Info title={t('Termos da demonstração')}>
              {t('Este é um protótipo acadêmico. Eventos, empresas, propostas, moderação e reservas são demonstrativos. Nenhuma compra, autenticação ou contratação real é realizada. As informações podem ser alteradas localmente para testar os fluxos.')}
            </Info>
          }
        />
        
        <Route
          path="privacidade"
          element={
            <Info title={t('Privacidade nesta demonstração')}>
              {t('As alterações em eventos, propostas, inventário, perfil e preferências ficam no armazenamento local deste navegador. Use apenas dados fictícios. Senhas e documentos dos formulários de acesso não são salvos nem enviados. Limpar os dados do site no navegador remove as alterações.')}
            </Info>
          }
        />
        <Route
          path="ajuda"
          element={
            <Info
              title={t('Ajuda & Suporte')}
              acao={
                <Link className="button primary" to="/atendimento">
                  {t('Abrir atendimento')}
                </Link>
              }
            >
              {t('Use “Explorar demo” ou “Trocar perfil” para acessar cada área. O organizador cria e publica eventos; o fornecedor prepara cotações e gerencia itens; o usuário salva favoritos e simula reservas; o administrador consulta relatórios e modera cadastros fictícios. A integração com serviços reais ainda não faz parte deste front-end.')}
            </Info>
          }
        />
        <Route
          path="*"
          element={
            <Info title={t('404 — Página não encontrada')}>
              {t('O endereço acessado não existe. Escolha uma área para continuar.')}
            </Info>
          }
        />
      </Route>
      {!isAuthenticated && <Route path="comunidade/*" element={<ForumPage />} />}
    </Routes>
  );
}
import { useParams } from 'react-router';
import { t, useIdioma } from './i18n';
function EventEditorRoute() {
  const { id } = useParams();
  return <EventEditor key={id} />;
}
function QuoteRoute() {
  const { id } = useParams();
  return <SupplierQuote key={id} />;
}
