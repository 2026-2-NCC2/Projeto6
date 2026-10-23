import React from 'react';
import { Link } from 'react-router';
import { dateLabel, money } from '../UI';
import Icon from './Icon';
import { Tag, StatusPill } from './common';

/* Peças da tela de cotação (nova proposta). */

const WINDOW_TONES = { open: 'green', closing: 'amber', submitted: 'blue', closed: 'gray' };

// Card da barra lateral: um pedido/cotação em concorrência
export function DemandCard({ event, active }) {
  const win = event.quote.window;
  const tone = WINDOW_TONES[win.state] || 'blue';
  return (
    <Link
      className={`sp-demand ${active ? 'active' : ''} ${win.state}`}
      to={`/fornecedor/cotacao/${event.id}`}
      aria-current={active ? 'true' : undefined}
    >
      <div className="sp-demand-head">
        <StatusPill tone={tone}>{win.pill}</StatusPill>
        {active && <Tag tone="blue">ATIVO</Tag>}
      </div>
      <h3>
        {event.title} — {event.subtitle}
      </h3>
      <div className="sp-demand-foot">
        <span>
          <Icon name="calendar" size={12} /> {dateLabel(event.date)}
        </span>
        <b className={tone}>{win.note}</b>
      </div>
    </Link>
  );
}

export function OrganizerCard({ name, city, reliability }) {
  return (
    <section className="sp-organizer" aria-label="Organizadora responsável">
      <small>ORGANIZADORA RESPONSÁVEL</small>
      <div>
        <span className="sp-organizer-icon">
          <Icon name="building" size={20} />
        </span>
        <div>
          <strong>{name}</strong>
          <span>
            {city} · {reliability}
          </span>
        </div>
      </div>
    </section>
  );
}

// Arquivos do briefing. onOpen(doc) decide o que fazer ao clicar.
export function BriefingPanel({ docs, onOpen }) {
  return (
    <section className="sp-briefing" aria-label="Detalhes e briefing do evento">
      <div className="sp-briefing-head">
        <small>EVENTO: DETALHES & BRIEFING</small>
        <button type="button" className="sp-link-button" onClick={() => onOpen(null)}>
          Ver todos
        </button>
      </div>
      <p>Documentação técnica fornecida pelo contratante para formulação da proposta:</p>
      <div className="sp-docs">
        {docs.map((doc) => (
          <button type="button" key={doc.name} className="sp-doc" onClick={() => onOpen(doc)}>
            <b className={doc.type.toLowerCase()}>{doc.type}</b>
            <span>{doc.name}</span>
            <small>{doc.size}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

// Tabela de itens com campo de valor por item
export function QuoteItemsTable({ items, prices, onPrice, disabled, invalid = [] }) {
  return (
    <div className="table-wrap sp-quote-table">
      <table>
        <thead>
          <tr>
            <th>Item / Especificação técnica</th>
            <th>Quantidade</th>
            <th>Unidade</th>
            <th>Valor unitário sugerido</th>
            <th>Proposta do fornecedor (R$)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.name}>
              <td>
                <strong>
                  {i + 1}. {item.name}
                </strong>
                <small>{item.spec}</small>
              </td>
              <td className="num">{item.qty}</td>
              <td>{item.unit}</td>
              <td className="num muted-cell">{money(item.ref)}</td>
              <td>
                <input
                  id={`quote-price-${i}`}
                  className={`sp-price-input ${invalid.includes(i) ? 'invalid' : ''}`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  disabled={disabled}
                  aria-label={`Valor unitário proposto para ${item.name}`}
                  aria-invalid={invalid.includes(i)}
                  value={prices[i]}
                  onChange={(event) => onPrice(i, event.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Barra escura fixa ao final do painel: total + ações
export function QuoteFooter({ total, withinCeiling, children }) {
  return (
    <div className="sp-quote-footer">
      <span className="sp-quote-currency" aria-hidden="true">
        R$
      </span>
      <div className="sp-quote-total">
        <small>TOTAL PROPOSTO DA COTAÇÃO</small>
        <strong>{money(total)}</strong>
      </div>
      <span className={`sp-ceiling ${withinCeiling ? 'ok' : 'over'}`}>
        {withinCeiling ? 'Dentro do teto' : 'Acima do teto sugerido'}
      </span>
      <div className="sp-quote-actions">{children}</div>
    </div>
  );
}
