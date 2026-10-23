import React, { useId, useState } from 'react';
import Icon from './Icon';
import { LabeledSelect, SearchInput } from './common';

/*
 * Barra de pesquisa + filtros, reutilizável em qualquer listagem.
 *  - query / onQuery:  texto da busca
 *  - filters:          [{ id, label, value, onChange, options }]  (ver LabeledSelect)
 *  - advanced:         conteúdo do painel "Mais filtros" (sem ele, o botão não aparece)
 *  - advancedCount:    quantos filtros avançados estão ativos (contador no botão)
 *  - children:         controles extras ao lado dos filtros (ex.: "Limpar filtros")
 */
export default function SearchToolbar({
  query,
  onQuery,
  placeholder = 'Buscar…',
  searchLabel,
  filters = [],
  advanced,
  advancedCount = 0,
  children,
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="sp-toolbar">
      <div className="sp-toolbar-row">
        <SearchInput value={query} onChange={onQuery} placeholder={placeholder} label={searchLabel} />
        <div className="sp-toolbar-filters">
          {filters.map(({ id, ...filter }) => (
            <LabeledSelect key={id} {...filter} />
          ))}
          {children}
          {advanced && (
            <button
              type="button"
              className="button outline sp-more-filters"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((value) => !value)}
            >
              <Icon name="filter" size={14} /> Mais filtros
              {advancedCount > 0 && <span className="sp-count">{advancedCount}</span>}
            </button>
          )}
        </div>
      </div>
      {advanced && open && (
        <div className="sp-toolbar-panel" id={panelId}>
          {advanced}
        </div>
      )}
    </div>
  );
}
