import React from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/Store';
import Events from '../components/Events';
import Icon from '../components/Icon';

// Troque por 'Bem-vindo' ou 'Bem-vinda' se preferir.
const GREETING = 'Boas-vindas';

export default function UserHome() {
  const { data } = useStore();
  const firstName = (data.profile?.name || '').trim().split(' ')[0] || 'visitante';
  return (
    <div className="user-home">
      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">
            <span /> Troca e compra segura de ingressos
          </p>
          <h1>
            {GREETING} de volta, <em>{firstName}</em>!
          </h1>
          <p className="hero-description">
            Gerencie seus ingressos, explore novos eventos e acompanhe suas trocas ativas na
            plataforma.
          </p>
          <div className="hero-actions">
            <Link to="/eventos" className="button primary">
              Procurar eventos <Icon name="arrow" size={18} />
            </Link>
            <Link to="/comunidade" className="button secondary">
              Troca-Papo
            </Link>
            <Link to="/ingressos" className="button secondary">
              Meus ingressos
            </Link>
          </div>
        </div>
      </section>

      <section className="section uh-summary" aria-labelledby="uh-summary-title">
        <p className="eyebrow purple">Sua conta</p>
        <h2 id="uh-summary-title">Resumo de hoje</h2>
        <div className="uh-tiles">
          <Link className="uh-tile" to="/ingressos">
            <span className="uh-ic">
              <Icon name="ticket" size={24} />
            </span>
            <span>
              <strong>{data.tickets.length}</strong>
              <small>Ingressos reservados</small>
            </span>
          </Link>
          <Link className="uh-tile" to="/favoritos">
            <span className="uh-ic" aria-hidden="true">
              ♥
            </span>
            <span>
              <strong>{data.favorites.length}</strong>
              <small>Eventos favoritos</small>
            </span>
          </Link>
        </div>
      </section>

      <Events />

      <section className="section uh-papo-wrap" aria-labelledby="uh-papo-title">
        <div className="uh-papo">
          <div>
            <p className="eyebrow">Troca-Papo</p>
            <h2 id="uh-papo-title">Dúvidas sobre uma troca?</h2>
            <p>
              Converse com outros fãs, veja dicas de segurança e descubra quem está trocando
              ingressos para os seus eventos favoritos.
            </p>
          </div>
          <Link className="button" to="/comunidade">
            Entrar no Troca-Papo <Icon name="arrow" size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}