import React from 'react';
import { Link } from 'react-router';

/**
 * Componente unificado de Card de Evento para toda a plataforma.
 * 
 * @param {Object} event - Objeto contendo os dados do evento.
 * @param {string} variant - 'public' | 'participant' | 'organizer' | 'admin'
 * @param {boolean} isFavorite - Se o evento está favoritado (para participantes).
 * @param {Function} onToggleFavorite - Callback ao clicar em favoritar.
 * @param {React.ReactNode} actions - Ações customizadas no rodapé ou topo do card.
 * @param {Object} metrics - Dados extras de métricas (faturamento, ocupação, etc. para Admin/Organizador).
 */
export default function EventCard({
  event,
  variant = 'public',
  isFavorite = false,
  onToggleFavorite,
  actions,
  metrics,
}) {
  const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <article className={`event-card-unified variant-${variant}`}>
      {/* --- ADMIN --- */}
      {variant === 'admin' && (
        <div className="ah-card-body">
          <div className="ah-card-top">
            {metrics?.tag && <span className="ah-tag">{metrics.tag}</span>}
            {metrics?.status && (
              <span className={`rp-status ${metrics.statusTone || 'blue'}`}>
                <i aria-hidden="true" />
                {metrics.status}
              </span>
            )}
          </div>
          <h3>{event.title}</h3>
          <p className="ah-sub">{event.subtitle || event.description}</p>
          
          <div className="ah-date">
            <div>
              <small>DATA DO EVENTO</small>
              <strong>{event.date}</strong>
            </div>
            {metrics?.city && <span className="ah-chip">{metrics.city}</span>}
          </div>

          {metrics?.rows && (
            <dl className="ah-rows">
              {metrics.rows.map((row, idx) => (
                <div key={idx}>
                  <dt>{row.label}:</dt>
                  <dd className={row.tone || ''}>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="ah-highlight">
            {metrics?.highlightText}
          </div>

          <div style={{ marginTop: '16px' }}>
            {actions || (
              <Link className="ah-cta" to={`/admin/relatorios/${event.id}`}>
                Visão e Relatórios ↗
              </Link>
            )}
          </div>
        </div>
      )}

      {/* --- ORGANIZADOR --- */}
      {variant === 'organizer' && (
        <>
          <div className="oh-event-image">
            <img src={event.image} alt={event.imageAlt || event.title} loading="lazy" />
            {event.status && <span className={`oh-status ${event.statusTone || 'blue'}`}>{event.status}</span>}
            {actions && <div className="oh-menu">{actions}</div>}
          </div>
          <div className="oh-event-body">
            {event.category && <p className="oh-category">{event.category}</p>}
            <h3>{event.title}</h3>
            <p className="oh-meta">📅 {event.date} {event.time ? `• ${event.time}` : ''}</p>
            <p className="oh-meta">📍 {event.location}</p>
            <footer>
              {event.capacity && (
                <span>Capacidade: <strong>{event.capacity.toLocaleString('pt-BR')}</strong></span>
              )}
              <Link to={`/organizador/eventos/${event.id}/consolidar`}>Detalhes →</Link>
            </footer>
          </div>
        </>
      )}

      {/* --- PARTICIPANTE --- */}
      {(variant === 'public' || variant === 'participant') && (
        <>
          <div className="event-image">
            <img loading="lazy" src={event.image} alt={event.imageAlt || event.title} />
            <span className="verified">✓ Verificado</span>
            {variant === 'participant' && onToggleFavorite && (
              <button
                type="button"
                className={`favorite ${isFavorite ? 'saved' : ''}`}
                aria-label={`${isFavorite ? 'Remover dos' : 'Adicionar aos'} favoritos: ${event.title}`}
                aria-pressed={isFavorite}
                onClick={() => onToggleFavorite(event.id)}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            )}
          </div>
          <div className="event-info">
            <p className="event-meta">
              {event.date} • {event.location}
            </p>
            <h3>{event.title}</h3>
            <div className="event-bottom">
              <div>
                <small>A partir de</small>
                <strong>{formatCurrency(event.price)}</strong>
              </div>
              <Link
                to={`/eventos/${event.id}`}
                className="ticket-link"
                aria-label={`Ver ingressos: ${event.title}`}
              >
                Ver Ingressos
              </Link>
            </div>
          </div>
        </>
      )}
    </article>
  );
}