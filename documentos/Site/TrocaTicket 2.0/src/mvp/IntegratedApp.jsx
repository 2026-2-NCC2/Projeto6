import React from 'react';
import { Link, Navigate, Route, Routes, useParams } from 'react-router';
import { useI18n } from '../i18n';
import IntegratedLayout from './Layout';
import { SessionProvider, RequireSession } from './Session';
import { Account, Profile } from './Account';
import { Catalog, EventDetails, Home } from './Catalog';
import Wallet, { TicketAction, TicketHistory } from './Wallet';
import Transfers from './Transfers';
import { OrderDetails, Orders } from './Orders';
import {
  Consolidation,
  EventEditor,
  Inventory,
  Opportunities,
  Organizer,
  Proposals,
  Quote,
  SupplierDirectory,
} from './Business';
import { Administration, Gate, Support } from './Administration';

function Info({ title, text, support = false }) {
  const { t } = useI18n();
  return (
    <div className="workspace narrow">
      <section className="panel">
        <h1>{t(title)}</h1>
        <p>{t(text)}</p>
        <div className="actions">
          <Link className="button primary" to={support ? '/atendimentos' : '/eventos'}>
            {t(support ? 'Abrir atendimento' : 'Ver eventos')}
          </Link>
          <Link className="button outline" to="/">
            {t('Voltar ao início')}
          </Link>
        </div>
      </section>
    </div>
  );
}
function Secured({ children, ...permissions }) {
  return <RequireSession {...permissions}>{children}</RequireSession>;
}
function EditorRoute() {
  const { id } = useParams();
  return <EventEditor key={id || 'new'} />;
}
function DetailsRoute() {
  const { id } = useParams();
  return <EventDetails key={id} />;
}
export default function IntegratedApp() {
  return (
    <SessionProvider>
      <Routes>
        <Route element={<IntegratedLayout />}>
          <Route index element={<Home />} />
          <Route path="entrar" element={<Account key="login" login />} />
          <Route path="cadastro" element={<Account key="register" />} />
          <Route path="perfis" element={<Navigate replace to="/cadastro" />} />
          <Route
            path="recuperar"
            element={
              <Info
                title="Recuperação de senha"
                text="O envio de e-mail e a recuperação automática de senha não estão habilitados nesta demonstração. Use outra conta fictícia para os testes."
              />
            }
          />
          <Route
            path="perfil"
            element={
              <Secured approved={false}>
                <Profile />
              </Secured>
            }
          />
          <Route path="eventos" element={<Catalog />} />
          <Route path="eventos/:id" element={<DetailsRoute />} />
          <Route path="favoritos" element={<Catalog key="favorites" favorites />} />
          <Route
            path="ingressos"
            element={
              <Secured>
                <Wallet />
              </Secured>
            }
          />
          <Route
            path="ingressos/:id/anunciar"
            element={
              <Secured>
                <TicketAction />
              </Secured>
            }
          />
          <Route
            path="ingressos/:id/transferir"
            element={
              <Secured>
                <TicketAction transfer />
              </Secured>
            }
          />
          <Route
            path="ingressos/:id/historico"
            element={
              <Secured>
                <TicketHistory />
              </Secured>
            }
          />
          <Route
            path="transferencias"
            element={
              <Secured>
                <Transfers />
              </Secured>
            }
          />
          <Route
            path="pedidos"
            element={
              <Secured>
                <Orders />
              </Secured>
            }
          />
          <Route
            path="pedidos/:id"
            element={
              <Secured>
                <OrderDetails />
              </Secured>
            }
          />
          <Route
            path="organizador"
            element={
              <Secured role="organizador">
                <Organizer />
              </Secured>
            }
          />
          <Route
            path="organizador/eventos"
            element={
              <Secured role="organizador">
                <Organizer />
              </Secured>
            }
          />
          <Route
            path="organizador/novo"
            element={
              <Secured role="organizador">
                <EditorRoute />
              </Secured>
            }
          />
          <Route
            path="organizador/eventos/:id/editar"
            element={
              <Secured role="organizador">
                <EditorRoute />
              </Secured>
            }
          />
          <Route
            path="organizador/visualizar/:id"
            element={
              <Secured role="organizador">
                <DetailsRoute />
              </Secured>
            }
          />
          <Route
            path="organizador/eventos/:id/consolidar"
            element={
              <Secured role="organizador">
                <Consolidation />
              </Secured>
            }
          />
          <Route
            path="organizador/fornecedores"
            element={
              <Secured role="organizador">
                <SupplierDirectory />
              </Secured>
            }
          />
          <Route
            path="fornecedor"
            element={
              <Secured role="fornecedor">
                <Opportunities />
              </Secured>
            }
          />
          <Route
            path="fornecedor/inventario"
            element={
              <Secured role="fornecedor">
                <Inventory />
              </Secured>
            }
          />
          <Route
            path="fornecedor/propostas"
            element={
              <Secured role="fornecedor">
                <Proposals />
              </Secured>
            }
          />
          <Route
            path="fornecedor/cotacao/:id"
            element={
              <Secured role="fornecedor">
                <Quote />
              </Secured>
            }
          />
          <Route
            path="admin"
            element={
              <Secured admin>
                <Administration />
              </Secured>
            }
          />
          <Route
            path="admin/moderacao"
            element={
              <Secured admin>
                <Administration />
              </Secured>
            }
          />
          <Route
            path="admin/relatorios/:id"
            element={
              <Secured admin>
                <Support />
              </Secured>
            }
          />
          <Route
            path="atendimentos"
            element={
              <Secured approved={false}>
                <Support />
              </Secured>
            }
          />
          <Route
            path="portaria"
            element={
              <Secured role="organizador">
                <Gate />
              </Secured>
            }
          />
          <Route
            path="comunidade"
            element={
              <Info
                title="Comunidade"
                text="As avaliações dos eventos ficam disponíveis na página de cada evento. O chat em tempo real não faz parte desta demonstração."
              />
            }
          />
          <Route
            path="ajuda"
            element={
              <Info
                support
                title="Ajuda & Suporte"
                text="Cadastre contas fictícias para testar compras simuladas, repasses e transferências. Pedidos e anúncios podem receber solicitações de atendimento com histórico persistido."
              />
            }
          />
          <Route
            path="termos"
            element={
              <Info
                title="Termos da demonstração"
                text="Este é um projeto acadêmico com contas, eventos e ingressos fictícios. Pagamentos, emissão, transferências e portaria são simulações locais. Nenhum dinheiro é cobrado. A demonstração não oferece ingressos reais nem garantia contra fraude."
              />
            }
          />
          <Route
            path="privacidade"
            element={
              <Info
                title="Privacidade nesta demonstração"
                text="Use somente dados fictícios. Contas, sessões e operações são persistidas no MySQL local. Preferências e favoritos ficam no navegador. A senha é processada com hash pelo servidor e não é armazenada no navegador. Não envie documentos nem informações financeiras reais."
              />
            }
          />
          <Route
            path="*"
            element={
              <Info
                title="404 — Página não encontrada"
                text="O endereço acessado não existe. Escolha uma área para continuar."
              />
            }
          />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
