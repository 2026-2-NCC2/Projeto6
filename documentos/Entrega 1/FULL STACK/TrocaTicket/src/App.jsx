import React from 'react';
import { Routes, Route, Link } from 'react-router';
import Layout from './components/Layout';
import Wallet from './pages/Wallet';
import SupplierDirectory from './pages/SupplierDirectory';
import Home from './pages/Home';
import Account, { Profiles, Recover } from './pages/Account';
import Profile from './pages/Profile';
import { Organizer, EventEditor, Consolidation } from './pages/Organizer';
import { Opportunities, Proposals, Quote, Inventory } from './pages/Supplier';
import { Admin, Report, Moderation } from './pages/Admin';
import { Catalog, EventDetails, Community } from './pages/Participant';
function Info({ title, children }) {
  return (
    <div className="workspace narrow">
      <section className="panel">
        <h1>{title}</h1>
        <p>{children}</p>
        <Link className="button primary" to="/perfis">
          Explorar os perfis
        </Link>
      </section>
    </div>
  );
}
// Cada endereço mostra uma página dentro do mesmo cabeçalho e rodapé.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="cadastro" element={<Account key="signup" />} />
        <Route path="entrar" element={<Account key="login" login />} />
        <Route path="recuperar" element={<Recover />} />
        <Route path="perfis" element={<Profiles />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="eventos" element={<Catalog />} />
        <Route path="eventos/:id" element={<EventDetailsRoute />} />
        <Route path="favoritos" element={<Catalog key="favorites" favorites />} />
        <Route path="ingressos" element={<Wallet />} />
        <Route path="comunidade" element={<Community />} />
        <Route path="organizador" element={<Organizer />} />
        <Route path="organizador/visualizar/:id" element={<EventDetailsRoute organizer />} />
        <Route path="organizador/eventos" element={<Organizer list />} />
        <Route path="organizador/novo" element={<EventEditor key="new" />} />
        <Route path="organizador/eventos/:id/editar" element={<EventEditorRoute />} />
        <Route path="organizador/eventos/:id/consolidar" element={<Consolidation />} />
        <Route path="organizador/fornecedores" element={<SupplierDirectory />} />
        <Route path="fornecedor" element={<Opportunities />} />
        <Route path="fornecedor/propostas" element={<Proposals />} />
        <Route path="fornecedor/cotacao/:id" element={<QuoteRoute />} />
        <Route path="fornecedor/inventario" element={<Inventory />} />
        <Route path="admin" element={<Admin />} />
        <Route path="admin/relatorios/:id" element={<Report />} />
        <Route path="admin/moderacao" element={<Moderation />} />
        <Route
          path="termos"
          element={
            <Info title="Termos da demonstração">
              Este é um protótipo acadêmico. Eventos, empresas, propostas, moderação e reservas são
              demonstrativos. Nenhuma compra, autenticação ou contratação real é realizada. As
              informações podem ser alteradas localmente para testar os fluxos.
            </Info>
          }
        />
        <Route
          path="privacidade"
          element={
            <Info title="Privacidade nesta demonstração">
              As alterações em eventos, propostas, inventário, perfil e preferências ficam no
              armazenamento local deste navegador. Use apenas dados fictícios. Senhas e documentos
              dos formulários de acesso não são salvos nem enviados. Limpar os dados do site no
              navegador remove as alterações.
            </Info>
          }
        />
        <Route
          path="ajuda"
          element={
            <Info title="Ajuda & Suporte">
              Use “Explorar demo” ou “Trocar perfil” para acessar cada área. O organizador cria e
              publica eventos; o fornecedor prepara cotações e gerencia itens; o participante salva
              favoritos e simula reservas; o administrador consulta relatórios e modera cadastros
              fictícios. A integração com serviços reais ainda não faz parte deste front-end.
            </Info>
          }
        />
        <Route
          path="*"
          element={
            <Info title="404 — Página não encontrada">
              O endereço acessado não existe. Escolha uma área para continuar.
            </Info>
          }
        />
      </Route>
    </Routes>
  );
}
import { useParams } from 'react-router';
function EventEditorRoute() {
  const { id } = useParams();
  return <EventEditor key={id} />;
}
function QuoteRoute() {
  const { id } = useParams();
  return <Quote key={id} />;
}

function EventDetailsRoute({ organizer = false }) {
  const { id } = useParams();
  return <EventDetails key={`${organizer}-${id}`} organizer={organizer} />;
}
