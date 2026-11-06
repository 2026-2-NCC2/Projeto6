import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/Store';
import Events, { useEvents, currency } from '../components/Events';
import Icon from '../components/Icon';

// Troque por 'Bem-vindo' ou 'Bem-vinda' se preferir.
const GREETING = 'Boas-vindas';
const SLIDE_SECONDS = 10;

function EventCarousel({ events }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const total = events.length;

  useEffect(() => {
    if (total < 2) return;
    const img = new Image();
    img.src = events[(index + 1) % total].image;
  }, [index, total, events]);

  if (!total) return <section className="uh-car" aria-busy="true" />;

  const go = (n) => setIndex((n + total) % total);
  const event = events[index % total];

  return (
    <section
      className="uh-car"
      aria-roledescription="carrossel"
      aria-label="Eventos que você provavelmente vai gostar"
    >
      <div className="uh-car-top">
        <span className="uh-k">Eventos que você provavelmente vai gostar</span>
        <div className="uh-nav">
          <button type="button" aria-label="Evento anterior" onClick={() => go(index - 1)}>
            ‹
          </button>
          <button
            type="button"
            aria-label={paused ? 'Retomar troca automática' : 'Pausar troca automática'}
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? '▶' : '❚❚'}
          </button>
          <button type="button" aria-label="Próximo evento" onClick={() => go(index + 1)}>
            ›
          </button>
        </div>
      </div>
      <Link
        key={event.id}
        to={`/eventos/${event.id}`}
        className="uh-slide"
        aria-live={paused ? 'polite' : 'off'}
      >
        <img src={event.image} alt={event.imageAlt} decoding="async" />
        <span className="uh-tx">
          <span className="uh-price">A partir de {currency(event.price)}</span>
          <b>{event.title}</b>
          <span>
            {event.date} · {event.location}
          </span>
          <span className="uh-go">Ver ingressos</span>
        </span>
      </Link>
      <div className="uh-bar" aria-hidden="true">
        <i
          key={index}
          className={`uh-fill${paused ? ' is-paused' : ''}`}
          style={{ animationDuration: `${SLIDE_SECONDS}s` }}
          onAnimationEnd={() => go(index + 1)}
        />
      </div>
    </section>
  );
}

export default function UserHome() {
  const { data, toggleFavorite } = useStore();
  const { events } = useEvents();
  const firstName = (data.profile?.name || '').trim().split(' ')[0] || 'visitante';
  const tickets = data.tickets;
  const favorites = data.favorites;
  const favoriteEvents = favorites
    .slice(0, 3)
    .map((id) => events.find((e) => e.id === id))
    .filter(Boolean);
  const recommended = events.find((e) => !favorites.includes(e.id)) || events[0];

  return (
    <div className="user-home">
      <section className="hero">
        <div className="hero-content">
          <div className="uh-two">
            <div>
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
            <EventCarousel events={events.slice(3)} />
          </div>

          <div className="uh-strip">
            <Link to="/ingressos" className="uh-card">
              <span className="uh-k">Meus ingressos</span>
              <span className="uh-big">
                {tickets.length} {tickets.length === 1 ? 'reservado' : 'reservados'}
              </span>
              <span className="uh-chips">
                {tickets.slice(0, 2).map((t) => (
                  <span key={t.id}>{t.title}</span>
                ))}
              </span>
              <span className="uh-go">Abrir meus ingressos</span>
            </Link>

            <Link to="/favoritos" className="uh-card">
              <span className="uh-k">Favoritos</span>
              <span className="uh-big">
                {favorites.length} {favorites.length === 1 ? 'evento' : 'eventos'}
              </span>
              <span className="uh-thumbs">
                {favoriteEvents.map((e) => (
                  <img key={e.id} src={e.image} alt="" loading="lazy" decoding="async" />
                ))}
              </span>
              <span className="uh-go">Ver favoritos</span>
            </Link>

            <Link to="/comunidade" className="uh-card">
              <span className="uh-k">Troca-Papo</span>
              <span className="uh-big">Fale com outros fãs</span>
              <span className="uh-sub">Tire dúvidas e combine trocas com mais segurança.</span>
              <span className="uh-go">Entrar no Troca-Papo</span>
            </Link>

            {recommended && (
              <article className="uh-card">
                <span className="uh-k">Recomendado para você</span>
                <button
                  type="button"
                  className="uh-heart"
                  aria-pressed={favorites.includes(recommended.id)}
                  aria-label={
                    favorites.includes(recommended.id)
                      ? 'Remover dos favoritos'
                      : 'Adicionar aos favoritos'
                  }
                  onClick={() => toggleFavorite(recommended.id)}
                >
                  {favorites.includes(recommended.id) ? '♥' : '♡'}
                </button>
                <Link to={`/eventos/${recommended.id}`} className="uh-big uh-stretch">
                  {recommended.title}
                </Link>
                <span className="uh-sub">a partir de {currency(recommended.price)}</span>
                <span className="uh-go">Ver ingressos</span>
              </article>
            )}
          </div>
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