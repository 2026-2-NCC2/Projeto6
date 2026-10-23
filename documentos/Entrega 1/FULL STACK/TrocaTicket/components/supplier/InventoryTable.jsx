import React from 'react';
import { money } from '../UI';
import { kindOf, marginOf, skuOf, statusView } from '../../utils/inventory';
import Icon, { categoryIcon } from './Icon';
import { StatusPill } from './common';

const CATEGORY_TONES = {
  'Bebidas & Bar': 'blue',
  'Iluminação': 'amber',
  'Estrutura & Palco': 'purple',
  'Alimentação & Buffet': 'green',
  'Som & Acústica': 'pink',
  'Segurança & Apoio': 'gray',
};

/*
 * Tabela de itens do inventário com seleção de linha.
 *  - selectedId: item exibido no painel de detalhes
 *  - onSelect(id), onEdit(item), onDuplicate(item)
 */
export default function InventoryTable({ items, selectedId, onSelect, onEdit, onDuplicate }) {
  return (
    <div className="table-wrap sp-inventory-table">
      <table>
        <thead>
          <tr>
            <th>Item & código SKU</th>
            <th>Categoria & tipo</th>
            <th>Unidade</th>
            <th className="end">Valor referência</th>
            <th>Status</th>
            <th className="end">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const selected = item.id === selectedId;
            const view = statusView(item);
            const margin = marginOf(item);
            return (
              <tr key={item.id} className={selected ? 'selected' : ''} onClick={() => onSelect(item.id)}>
                <td>
                  <div className="sp-item-cell">
                    <span className={`sp-item-icon ${CATEGORY_TONES[item.category] || 'blue'}`}>
                      <Icon name={categoryIcon[item.category] || 'box'} size={17} />
                    </span>
                    <div>
                      <button
                        type="button"
                        className="sp-row-select"
                        aria-current={selected ? 'true' : undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(item.id);
                        }}
                      >
                        {item.name}
                      </button>
                      <code>#{skuOf(item)}</code>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{item.category}</strong>
                  <small>{item.type || 'Item de catálogo'}</small>
                </td>
                <td>
                  <span className="sp-unit">{item.unit}</span>
                </td>
                <td className="end">
                  <strong>{money(item.price)}</strong>
                  {margin !== null && <small className={margin >= 0 ? 'ok' : 'bad'}>Margem líq. {margin}%</small>}
                </td>
                <td>
                  <StatusPill tone={view.tone}>{view.label}</StatusPill>
                </td>
                <td>
                  <div className="sp-row-actions">
                    <button
                      type="button"
                      className={`sp-icon-button ${selected ? 'active' : ''}`}
                      aria-label={`Ver detalhes de ${item.name}`}
                      aria-pressed={selected}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(item.id);
                      }}
                    >
                      <Icon name="eye" size={15} />
                    </button>
                    <button
                      type="button"
                      className="sp-icon-button"
                      aria-label={`Editar ${item.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                      }}
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      type="button"
                      className="sp-icon-button"
                      aria-label={`Duplicar ${item.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicate(item);
                      }}
                    >
                      <Icon name="copy" size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
