import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/Store';
import Events, { useEvents, currency } from '../components/Events';
import Icon from '../components/Icon';
import { notificacoesIniciais } from '../../forum/src/data/forum.js';

// Troque por 'Bem-vindo' ou 'Bem-vinda' se preferir.
const GREETING = 'Boas-vindas';
const SLIDE_SECONDS = 10;
function EventCarousel({ events }) {
  const [index, setIndex] = useState(0);
  const [paused] = useState(
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
function daysLeft(iso) {
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

function dayLabel(n) {
  if (n <= 0) return 'É hoje!';
  return n === 1 ? 'É amanhã!' : `Faltam ${n} dias`;
}

function useForumNews() {
  const [lidas, setLidas] = useState([]);
  useEffect(() => {
    try {
      setLidas(JSON.parse(localStorage.getItem('forum-trocaticket:v1'))?.notificacoesLidas || []);
    } catch {
      setLidas([]);
    }
  }, []);
  const unread = notificacoesIniciais.filter((n) => !lidas.includes(n.id));
  return { count: unread.length, last: unread[0]?.texto || '' };
}
export default function UserHome() {
  const { data } = useStore();
  const { events } = useEvents();
  const firstName = (data.profile?.name || '').trim().split(' ')[0] || 'visitante';
  const tickets = data.tickets;
  const forum = useForumNews();
  const byId = (id) => events.find((e) => e.id === id);
  const favorites = data.favorites;
  const favoriteEvents = favorites.map(byId).filter(Boolean);
  const ticketEvents = data.tickets.map((t) => byId(t.eventId)).filter(Boolean);
  const pool = ticketEvents.length ? ticketEvents : favoriteEvents.length ? favoriteEvents : events;
  const next = pool
    .filter((e) => e.startsAt && daysLeft(e.startsAt) >= 0)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const alerts = favoriteEvents
    .map((e) => ({
      e,
      text:
        e.oldPrice > e.price
          ? `Preço caiu ${Math.round((1 - e.price / e.oldPrice) * 100)}%`
          : e.left && e.left <= 50
            ? `Restam ${e.left} ingressos`
            : '',
    }))
    .filter((a) => a.text);
  const p = data.profile || {};
  const fields = [p.name, p.email, p.phone, p.photo];
  const profilePct = Math.round((fields.filter(Boolean).length / fields.length) * 100);
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
              </div>
            </div>
            <EventCarousel events={events.slice(3)} />
          </div>

          <div className="uh-strip">
            {next && (
              <Link
                to={ticketEvents.length ? '/ingressos' : `/eventos/${next.id}`}
                className="uh-card"
              >
                <span className="uh-k">
                  {ticketEvents.length ? 'Seu próximo evento' : 'Próximo evento'}
                </span>
                <span className="uh-big">{dayLabel(daysLeft(next.startsAt))}</span>
                <span className="uh-sub">
                  {next.title} · {next.date}
                </span>
                <span className="uh-go">
                  {ticketEvents.length ? 'Ver meus ingressos' : 'Ver ingressos'}
                </span>
              </Link>
            )}

            <Link to="/favoritos" className="uh-card">
              <span className="uh-k">Favoritos</span>
              {alerts.length ? (
                <>
                  <span className="uh-big">
                    {alerts.length} {alerts.length === 1 ? 'novidade' : 'novidades'}
                  </span>
                  {alerts.slice(0, 2).map(({ e, text }) => (
                    <span key={e.id} className="uh-sub">
                      {e.title}: {text}
                    </span>
                  ))}
                </>
              ) : favoriteEvents.length ? (
                <>
                  <span className="uh-big">
                    {favoriteEvents.length} {favoriteEvents.length === 1 ? 'evento' : 'eventos'}
                  </span>
                  <span className="uh-thumbs">
                    {favoriteEvents.slice(0, 3).map((e) => (
                      <img key={e.id} src={e.image} alt="" loading="lazy" decoding="async" />
                    ))}
                  </span>
                </>
              ) : (
                <>
                  <span className="uh-big">Nenhum favorito ainda</span>
                  <span className="uh-sub">Favorite eventos para receber alertas de preço.</span>
                </>
              )}
              <span className="uh-go">Ver favoritos</span>
            </Link>

            <Link to="/comunidade" className="uh-card">
              <span className="uh-k">Troca-Papo</span>
              <span className="uh-big">
                {forum.count
                  ? `${forum.count} ${forum.count === 1 ? 'notificação nova' : 'notificações novas'}`
                  : 'Fale com outros fãs'}
              </span>
              <span className="uh-sub">
                {forum.last || 'Tire dúvidas e combine trocas com mais segurança.'}
              </span>
              <span className="uh-go">Entrar no Troca-Papo</span>
            </Link>

            {profilePct < 100 && (
              <Link to="/perfil" className="uh-card">
                <span className="uh-k">Complete seu perfil</span>
                <span className="uh-big">{profilePct}%</span>
                <span className="uh-pbar" aria-hidden="true">
                  <i style={{ width: `${profilePct}%` }} />
                </span>
                <span className="uh-sub">Complete seus dados para trocar com mais segurança.</span>
                <span className="uh-go">Completar perfil</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <Events />
    </div>
  );
}