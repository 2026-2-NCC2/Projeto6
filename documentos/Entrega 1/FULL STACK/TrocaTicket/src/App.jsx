import React from 'react';
import { Routes, Route } from 'react-router';
import Layout from './components/Layout';

import Home from './pages/Home';
import Account, { Profiles, Recover } from './pages/Account';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import { Catalog, Community } from './pages/Participant';

// Módulos e Utilitários
import { Info, EventDetailsRoute } from '../routes/helpers';
import OrganizerRoutes from '../routes/OrganizerRoutes';
import SupplierRoutes from '../routes/SupplierRoutes';
import AdminRoutes from '../routes/AdminRoutes';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Rotas Públicas e do Participante */}
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

        {/* Módulos Delegados (Note o uso do "/*") */}
        <Route path="organizador/*" element={<OrganizerRoutes />} />
        <Route path="fornecedor/*" element={<SupplierRoutes />} />
        <Route path="admin/*" element={<AdminRoutes />} />

        {/* Páginas Estáticas / Info */}
        <Route path="termos" element={<Info title="Termos da demonstração">...</Info>} />
        <Route path="privacidade" element={<Info title="Privacidade nesta demonstração">...</Info>} />
        <Route path="ajuda" element={<Info title="Ajuda & Suporte">...</Info>} />
        
        {/* Fallback */}
        <Route path="*" element={<Info title="404 — Página não encontrada">O endereço acessado não existe.</Info>} />
      </Route>
    </Routes>
  );
}