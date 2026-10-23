import React from 'react';
import { Link } from 'react-router';
import { dateLabel, money } from '../UI';
import { agoLabel } from '../../utils/format';
import Icon from './Icon';
import { Callout } from './common';

const DEFAULT_OUTCOMES = {
  Rascunho: { tone: 'blue', title: 'Rascunho — ainda não enviado', detail: 'Continue a edição para enviar ao organizador.' },
  'Em análise': { tone: 'amber', title: 'Em análise pelo organizador', detail: 'Aguardando retorno do organizador.' },
  Aprovada: { tone: 'green', title: 'Proposta aprovada — fornecedor selecionado', detail: '' },
  'Não selecionada': { tone: 'gray', title: 'Não selecionada', detail: 'Processo encerrado para esta proposta.' },
  Encerrada: { tone: 'gray', title: 'Evento concluído', detail: 'Proposta arquivada no histórico.' },
};
const CALLOUT_ICONS = { amber: 'clock', green: 'check', gray: 'info', blue: 'pencil' };
export const outcomeOf = (proposal) => proposal.outcome || DEFAULT_OUTCOMES[proposal.status] || DEFAULT_OUTCOMES['Em análise'];

/*
 * Card de proposta comercial.
 *  - onDetails(proposal): abre os detalhes   - onSecondary(proposal): ação extra (cronograma, comprovante…)
 *  - onExport(proposal):  baixa o resumo da proposta
 */
export default function ProposalCard({ proposal, onDetails, onSecondary, onExport }) {
  const outcome = outcomeOf(proposal);
  const closed = ['Não selecionada', 'Encerrada'].includes(proposal.status);
  const draft = proposal.status === 'Rascunho';
  const ago = agoLabel(proposal.date);
  const titleId = `prop-${proposal.id}`;
  return (
    <article className={`sp-card sp-proposal ${outcome.tone}`} aria-labelledby={titleId}>
      <header className="sp-proposal-head">
        <code>#{proposal.id}</code>
        <small>
          <Icon name="clock" size={12} /> {draft ? 'Salvo' : 'Enviada'} em {dateLabel(proposal.date)}
          {ago && ` (${ago})`}
        </small>
      </header>

      <h3 className="sp-card-title" id={titleId}>
        {proposal.title}
      </h3>
      <ul className="sp-meta">
        <li>
          <Icon name="calendar" size={13} /> {dateLabel(proposal.eventDate)} • {proposal.location}
        </li>
        <li>
          <Icon name="building" size={13} /> Organizador: {proposal.organizer}
        </li>
      </ul>

      <div className="sp-scope">
        <small>ITENS & SERVIÇOS OFERTADOS</small>
        <p>{proposal.description}</p>
      </div>

      <div className="sp-values">
        <div>
          <small>Valor total proposto</small>
          <strong>{money(proposal.total)}</strong>
        </div>
        <div className="end">
          <small>{proposal.aside?.label || 'Condição de pagamento'}</small>
          <span>{proposal.aside?.value || proposal.payment}</span>
        </div>
      </div>

      <Callout tone={outcome.tone} icon={CALLOUT_ICONS[outcome.tone]} title={outcome.title}>
        {outcome.detail}
      </Callout>

      <footer className="sp-proposal-actions">
        {draft ? (
          <Link className="sp-link-action" to={`/fornecedor/cotacao/${proposal.eventId}`}>
            Continuar edição <Icon name="chevron-right" size={13} />
          </Link>
        ) : (
          <button type="button" className="sp-link-action" onClick={() => onDetails(proposal)}>
            {closed ? 'Ver detalhes do histórico' : 'Ver detalhes da proposta'} <Icon name="chevron-right" size={13} />
          </button>
        )}
        <div className="sp-proposal-buttons">
          {proposal.secondaryAction && (
            <button type="button" className="button outline sp-small-button" onClick={() => onSecondary(proposal)}>
              {proposal.secondaryAction}
            </button>
          )}
          {closed && <small className="sp-inactive">STATUS: NÃO ATIVO</small>}
          <button
            type="button"
            className="sp-icon-button"
            aria-label={`Baixar resumo da proposta ${proposal.id}`}
            onClick={() => onExport(proposal)}
          >
            <Icon name="file" size={15} />
          </button>
        </div>
      </footer>
    </article>
  );
}
