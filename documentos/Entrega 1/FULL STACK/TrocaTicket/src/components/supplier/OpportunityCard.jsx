import React from 'react';
import { Link } from 'react-router';
import { dateLabel, money } from '../UI';
import { toRoman } from '../../utils/format';
import { Callout, DateBox, InfoList, InfoRow, StatusPill, TagList } from './common';
import { t } from '../../i18n';

const STATUS_TONES = {
  'Cotação aberta': 'green',
  'Em análise': 'blue',
  'Alta prioridade': 'purple',
};

/* Card de oportunidade (home do fornecedor). Recebe um item de supplierOpportunities. */
export default function OpportunityCard({ event, index }) {
  const submitted = !!event.proposal;
  const titleId = `opp-${event.id}`;
  return (
    <article className="sp-card sp-opportunity" aria-labelledby={titleId}>
      <header className="sp-opportunity-head">
        <span className="sp-index">{t('EVENTO')} {toRoman(index + 1)}</span>
        <StatusPill tone={STATUS_TONES[event.status] || 'blue'}>{t(event.status)}</StatusPill>
      </header>
      <h3 className="sp-card-title" id={titleId}>
        {event.title}
      </h3>
      <p className="sp-card-subtitle">{event.subtitle}</p>

      <DateBox date={dateLabel(event.date)} place={event.location} />

      <InfoList>
        <InfoRow label={`${t(event.requesterLabel || 'Organizador solicitante')}:`}>{event.organizer}</InfoRow>
        <InfoRow label={t('Serviços solicitados:')}>
          <TagList items={event.services || [event.category]} />
        </InfoRow>
        {submitted ? (
          <InfoRow label={t('Valor ofertado:')}>{money(event.proposal.value)}</InfoRow>
        ) : (
          event.deadline && (
            <InfoRow label={`${t(event.deadline.label)}:`} tone={event.deadline.tone}>
              {t(event.deadline.value)}
            </InfoRow>
          )
        )}
      </InfoList>

      {submitted && (
        <Callout
          icon="check"
          title={t('Proposta submetida em {sentAt}', { sentAt: event.proposal.sentAt })}
          action={<span className="sp-protocol">{t('Protocolo')} {event.proposal.protocol}</span>}
        />
      )}
      {event.highlight && (
        <Callout
          tone="purple"
          icon="star"
          title={event.highlight}
          action={
            <Link className="sp-callout-link" to={`/fornecedor/cotacao/${event.id}`}>
              {t('Ver edital')}
            </Link>
          }
        />
      )}

      <Link
        className="button dark full sp-cta"
        to={submitted ? '/fornecedor/propostas' : `/fornecedor/cotacao/${event.id}`}
      >
        {submitted ? t('Acompanhar proposta') : t('Ver detalhes & cotar')}
      </Link>
    </article>
  );
}
