import React from 'react';
import { Link } from 'react-router';
import { formatarNumero, t } from '../i18n';
import { dateLabel, money } from './UI';

// Data ISO (AAAA-MM-DD) aparece no formato do idioma; rótulos prontos da vitrine passam por t().
const dataDoEvento = (valor) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '')) ? dateLabel(valor) : t(valor);

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
  const formatCurrency = (value) => money(value || 0);

  // Mapeia as classes originais do CSS para manter as regras de Grid, Flexbox e sombras intactas
  const getArticleClasses = () => {
    const base = `event-card-unified variant-${variant}`;
    if (variant === 'admin') return `${base} ah-card`;
    if (variant === 'organizer') return `${base} oh-event managed-event`;
    return `${base} event-card`;
  };

  return (
    <article className={getArticleClasses()}>
      {/* --- ADMIN --- */}
      {variant === 'admin' && (
        <div className="ah-card-body">
          <div className="ah-card-top">
            {metrics?.tag && <span className="ah-tag">{metrics.tag}</span>}
            {metrics?.status && (
              <span className={`rp-status ${metrics.statusTone || 'blue'}`}>
                <i aria-hidden="true" />
                {t(metrics.status)}
              </span>
            )}
          </div>
          <h3>{event.title}</h3>
          <p className="ah-sub">{event.subtitle || event.description}</p>
          
          <div className="ah-date">
            <div>
              <small>{t('DATA DO EVENTO')}</small>
              <strong>{event.date}</strong>
            </div>
            {metrics?.city && <span className="ah-chip">{metrics.city}</span>}
          </div>

          {metrics?.rows && (
            <dl className="ah-rows">
              {metrics.rows.map((row, idx) => (
                <div key={idx}>
                  <dt>{t(row.label)}:</dt>
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
                {t('Visão e Relatórios ↗')}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* --- ORGANIZADOR --- */}
      {variant === 'organizer' && (
        <>
          <div className="oh-event-image managed-image">
            <img src={event.image} alt={event.imageAlt ? t(event.imageAlt) : event.title} loading="lazy" />
            {event.status && (
              <span className={`oh-status ${event.statusTone || 'blue'}`}>
                {t(event.status)}
              </span>
            )}
            {actions && <div className="oh-menu">{actions}</div>}
          </div>
          <div className="oh-event-body managed-body">
            {event.category && <p className="oh-category eyebrow purple">{t(event.category)}</p>}
            <h3>{event.title}</h3>
            <p className="oh-meta">📅 {dataDoEvento(event.date)} {event.time ? `• ${event.time}` : ''}</p>
            <p className="oh-meta">📍 {event.location}</p>
            <footer>
              {event.capacity ? (
                <span>
                  {t('Capacidade:')} <strong>{typeof event.capacity === 'number' ? formatarNumero(event.capacity) : event.capacity}</strong>
                </span>
              ) : <span />}
              <Link className="text-link" to={`/organizador/eventos/${event.id}/consolidar`}>
                {t('Detalhes →')}
              </Link>
            </footer>
          </div>
        </>
      )}

      {/* --- PARTICIPANTE / PÚBLICO --- */}
      {(variant === 'public' || variant === 'participant') && (
        <>
          <div className="event-image">
            <img loading="lazy" src={event.image} alt={event.imageAlt ? t(event.imageAlt) : event.title} />
            <span className="event-tag">{t(event.tag)}</span>
            {onToggleFavorite && (
              <button
                type="button"
                className={`favorite ${isFavorite ? 'saved' : ''}`}
                aria-label={isFavorite ? t('Remover dos favoritos: {title}', { title: event.title }) : t('Adicionar aos favoritos: {title}', { title: event.title })}
                aria-pressed={isFavorite}
                onClick={() => onToggleFavorite(event.id)}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            )}
          </div>
          <div className="event-info">
            <h3>{event.title}</h3>
            {event.date && <p className="event-meta">📅 {dataDoEvento(event.date)}</p>}
            {event.location && <p className="event-meta">📍 {event.location}</p>}
            <div className="event-bottom">
              <div>
                <small>{t('A partir de')}</small>
                <strong>{formatCurrency(event.price)}</strong>
              </div>
              {actions || (
                <Link
                  to={`/eventos/${event.id}`}
                  className="ticket-link"
                  aria-label={t('Ver opções: {title}', { title: event.title })}
                >
                  {t('Ver opções →')}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </article>
  );
}