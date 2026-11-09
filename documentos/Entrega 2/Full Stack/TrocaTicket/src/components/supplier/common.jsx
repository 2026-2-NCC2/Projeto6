import React from 'react';
import Icon from './Icon';

/* Peças pequenas reutilizadas pelas telas do fornecedor. */

// Campo de busca com ícone
export function SearchInput({ value, onChange, placeholder, label, className = '' }) {
  return (
    <label className={`sp-search ${className}`}>
      <Icon name="search" />
      <input
        type="search"
        aria-label={label || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

// Select com rótulo em linha: "STATUS: [Todos os eventos ▾]"
export function LabeledSelect({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`sp-select ${className}`}>
      {label && <span>{label}</span>}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) =>
          typeof option === 'string' ? (
            <option key={option}>{option}</option>
          ) : (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

// Selo com bolinha: tone = green | blue | amber | purple | gray | red
export function StatusPill({ tone = 'blue', dot = true, children }) {
  return (
    <span className={`sp-pill ${tone}`}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

// Selo retangular pequeno (serviços, protocolos, contadores)
export function Tag({ tone = 'blue', children }) {
  return <span className={`sp-tag ${tone}`}>{children}</span>;
}

export function TagList({ items, tone }) {
  return (
    <span className="sp-tag-list">
      {items.map((item) => (
        <Tag key={item} tone={tone}>
          {item}
        </Tag>
      ))}
    </span>
  );
}

// Lista "rótulo ........ valor"
export function InfoList({ children, className = '' }) {
  return <dl className={`sp-info-list ${className}`}>{children}</dl>;
}
export function InfoRow({ label, tone, children }) {
  return (
    <div className="sp-info-row">
      <dt>{label}</dt>
      <dd className={tone ? `tone-${tone}` : ''}>{children}</dd>
    </div>
  );
}

// Caixa de destaque: tone = blue | green | amber | purple | gray
export function Callout({ tone = 'blue', icon, title, children, action }) {
  return (
    <div className={`sp-callout ${tone}`}>
      <div className="sp-callout-body">
        {icon && <Icon name={icon} size={15} />}
        <div>
          {title && <strong>{title}</strong>}
          {children && <p>{children}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Caixa de data com local à direita
export function DateBox({ label = 'Data do evento', date, place }) {
  return (
    <div className="sp-date-box">
      <Icon name="calendar" size={18} />
      <div>
        <small>{label}</small>
        <strong>{date}</strong>
      </div>
      {place && <span className="sp-place-chip">{place}</span>}
    </div>
  );
}

// Filtro em "pílulas" com contador. options: [{ value, label, count? }]
export function ChipTabs({ options, value, onChange, label = 'Filtrar por categoria' }) {
  return (
    <div className="sp-chip-tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'active' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined && <span>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Selo informativo estático: tone = neutral | blue | green | amber
export function Chip({ tone = 'neutral', dot, children }) {
  return (
    <span className={`sp-chip ${tone}`}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

// Título de painel com ícone
export function PanelTitle({ icon, children }) {
  return (
    <span className="sp-panel-title">
      {icon && <Icon name={icon} size={16} />}
      {children}
    </span>
  );
}

// "Mostrando 1 a 5 de 10 itens   Anterior 1 2 Próxima"
export function Pagination({ page, pageSize, total, onPage, noun = 'itens' }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="sp-pagination">
      <small>
        Mostrando {from} a {to} de {total} {noun}
      </small>
      {pages > 1 && (
        <nav aria-label="Paginação">
          <button type="button" disabled={page === 1} onClick={() => onPage(page - 1)}>
            Anterior
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((number) => (
            <button
              type="button"
              key={number}
              className={number === page ? 'active' : ''}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => onPage(number)}
            >
              {number}
            </button>
          ))}
          <button type="button" disabled={page === pages} onClick={() => onPage(page + 1)}>
            Próxima
          </button>
        </nav>
      )}
    </div>
  );
}
