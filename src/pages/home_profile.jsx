import React from 'react';
import { Link, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { roleNames } from '../data/demo';
import Events from '../components/Events';

export default function HomeProfile() {
  const { role, chooseRole, notify } = useStore();
  const navigate = useNavigate();

  // Puxa o nome diretamente do que foi salvo no login/cadastro
  const userName = localStorage.getItem('userName') || 'Felipe';
  const currentRoleName = roleNames[role] || role || 'Participante';

  const handleLogout = () => {
    localStorage.removeItem('userName');
    chooseRole('');
    notify('Sessão encerrada com sucesso.');
    navigate('/');
  };

  return (
    <>
      <section className="hero user-hero" style={{ position: 'relative' }}>
        {/* Cantinho superior direito: Fórum e Sair */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <Link
            to="/conheca_forum"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              backdropFilter: 'blur(4px)',
              textDecoration: 'none',
            }}
          >
            💬 Fórum
          </Link>

          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(225, 29, 72, 0.2)',
              color: '#fff',
              border: '1px solid rgba(225, 29, 72, 0.5)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            Sair da conta
          </button>
        </div>

        <div className="hero-content">
          <p className="hero-badge">
            <span /> Conta ativa • {currentRoleName}
          </p>
          <h1>
            Bem-vindo de volta, <em>{userName}!</em>
          </h1>
          <p className="hero-description">
            Gerencie seus ingressos, explore novos eventos e acompanhe suas trocas ativas na
            plataforma.
          </p>

          <div className="hero-actions">
            <Link to="/ingressos" className="button primary">
              Meus Ingressos <span aria-hidden="true">→</span>
            </Link>
            <Link to="/perfil" className="button secondary">
              Meu Perfil
            </Link>
            <Link to="/vender_ingresso" className="button secondary">
              Venda seu Ingresso!
            </Link>
          </div>
        </div>
      </section>

      {/* Seção de Atalhos Rápidos */}
      <section className="profiles section">
        <div className="section-heading">
          <p className="eyebrow">Ações Rápidas</p>
          <h2>O que você deseja fazer agora?</h2>
        </div>

        <div className="grid">
          <article className="profile-card comprador">
            <div className="profile-top">
              <span className="profile-icon" aria-hidden="true">
                ♧
              </span>
              <span className="profile-tag">Ingressos</span>
            </div>
            <h3>Comprar & Trocar</h3>
            <p>Explore eventos disponíveis e gerencie seus bilhetes comprados.</p>
            <Link className="button dark" to="/eventos">
              Ver Eventos
            </Link>
          </article>

          <article className="profile-card organizador">
            <div className="profile-top">
              <span className="profile-icon" aria-hidden="true">
                ⚑
              </span>
              <span className="profile-tag">Eventos</span>
            </div>
            <h3>Organizar Evento</h3>
            <p>Crie, edite e acompanhe as vendas dos seus próprios eventos.</p>
            <Link className="button dark" to="/organizador">
              Painel do Organizador
            </Link>
          </article>

          <article className="profile-card fornecedor">
            <div className="profile-top">
              <span className="profile-icon" aria-hidden="true">
                ▣
              </span>
              <span className="profile-tag">Serviços</span>
            </div>
            <h3>Serviços B2B</h3>
            <p>Ofereça serviços e insumos diretamente para produtores.</p>
            <Link className="button dark" to="/fornecedor">
              Painel de Fornecedor
            </Link>
          </article>
        </div>
      </section>

      <Events />
    </>
  );
}
