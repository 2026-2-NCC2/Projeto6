import React from 'react';
import { Link } from 'react-router';
import { money } from '../UI';
import { marginOf, skuOf, specsOf } from '../../utils/inventory';
import Icon from './Icon';
import { Tag } from './common';

/*
 * Painel com as informações do item selecionado na tabela.
 *  - onEdit(item) / onToggle(item): editar cadastro e ativar/desativar
 */
export default function ItemDetail({ item, onEdit, onToggle }) {
  const specs = specsOf(item);
  const usage = item.usage || [];
  const margin = marginOf(item);
  const cost = Number(item.cost) || 0;
  const price = Number(item.price) || 0;
  const costPercent = price && cost ? Math.min(100, Math.round((cost / price) * 100)) : 0;
  const inactive = item.status === 'Inativo';
  return (
    <section className="sp-item-detail" aria-label={`Detalhes de ${item.name}`}>
      <div className="sp-item-hero">
        <div className="sp-item-hero-top">
          <span className="sp-hero-chip">ITEM EM COMPOSIÇÃO</span>
          <Icon name="lock" size={15} />
        </div>
        <h2>{item.name}</h2>
        {item.version && <p>{item.version}</p>}
        <div className="sp-item-hero-foot">
          <div>
            <small>SKU HOMOLOGADO</small>
            <code>#{skuOf(item)}</code>
          </div>
          <div className="end">
            <small>PREÇO BASE SUGERIDO</small>
            <strong>{money(item.price)}</strong>
          </div>
        </div>
      </div>

      <div className="sp-item-body">
        <h3>ESPECIFICAÇÕES TÉCNICAS</h3>
        <dl className="sp-specs">
          {specs.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="sp-usage-head">
          <h3>UTILIZAÇÃO RECENTE EM EVENTOS</h3>
          {usage.length > 0 && <small>{usage.length} aceitos</small>}
        </div>
        {usage.length > 0 ? (
          <ul className="sp-usage">
            {usage.map((entry) => (
              <li key={entry.event}>
                <div>
                  <strong>{entry.event}</strong>
                  <small>{entry.detail}</small>
                </div>
                <Tag tone={entry.tone}>{entry.tag}</Tag>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sp-hint">Este item ainda não foi utilizado em propostas aceitas.</p>
        )}

        {cost > 0 && (
          <div className="sp-cost">
            <div className="sp-cost-head">
              <span>Custo direto operacional:</span>
              <strong>{money(cost)}</strong>
            </div>
            <div
              className="sp-cost-bar"
              role="img"
              aria-label={`Custo e desgaste ${costPercent}%, margem bruta ${margin}%`}
            >
              <i style={{ width: `${costPercent}%` }} />
            </div>
            <div className="sp-cost-legend">
              <span>Custo fixo & desgaste ({costPercent}%)</span>
              <span className="ok">
                Margem bruta ({margin}% = {money(price - cost)})
              </span>
            </div>
          </div>
        )}

        <Link className="button blue-button full" to="/fornecedor">
          <Icon name="plus" size={15} /> Simular em nova proposta de evento
        </Link>
        <div className="sp-detail-actions">
          <button type="button" className="button outline" onClick={() => onEdit(item)}>
            Editar cadastro
          </button>
          <button type="button" className={`button ${inactive ? 'outline' : 'danger-outline'}`} onClick={() => onToggle(item)}>
            {inactive ? 'Reativar item' : 'Desativar item'}
          </button>
        </div>
      </div>
    </section>
  );
}
