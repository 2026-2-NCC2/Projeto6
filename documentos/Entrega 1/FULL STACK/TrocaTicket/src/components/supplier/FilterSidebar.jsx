import React from 'react';
import Icon from './Icon';
import { LabeledSelect } from './common';

/*
 * Barra lateral de filtros.
 *  - statuses: [{ value, label, count, tone }]  → lista de opções com contador
 *  - selects:  [{ id, label, value, onChange, options }] → selects empilhados abaixo da lista
 *  - onClear:  limpa todos os filtros
 */
export default function FilterSidebar({ title = 'Filtros por status', statuses, status, onStatus, selects = [], onClear }) {
  return (
    <aside className="sp-filter-sidebar" aria-label={title}>
      <div className="sp-filter-head">
        <h2>
          <Icon name="filter" size={14} /> {title}
        </h2>
        <button type="button" className="sp-link-button" onClick={onClear}>
          Limpar
        </button>
      </div>
      <div className="sp-filter-list" role="group" aria-label={title}>
        {statuses.map((item) => (
          <button
            type="button"
            key={item.value}
            className={status === item.value ? 'active' : ''}
            aria-pressed={status === item.value}
            onClick={() => onStatus(item.value)}
          >
            <i className={item.tone || 'blue'} aria-hidden="true" />
            <span>{item.label}</span>
            <b>{item.count}</b>
          </button>
        ))}
      </div>
      {selects.length > 0 && <hr />}
      {selects.map(({ id, ...select }) => (
        <LabeledSelect key={id} className="stacked" {...select} />
      ))}
    </aside>
  );
}
