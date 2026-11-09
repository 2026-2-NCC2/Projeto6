import React from 'react';

/*
 * Faixa de resumo logo abaixo da busca.
 *  - items:    [{ label, value, tone?: 'warning' | 'success' }]
 *  - trailing: texto alinhado à direita (ex.: "Última atualização: hoje às 10:45")
 */
export default function SummaryBar({ items, trailing }) {
  return (
    <div className="sp-summary-bar">
      <div>
        {items.map((item) => (
          <p key={item.label}>
            {item.label}: <strong className={item.tone || ''}>{item.value}</strong>
          </p>
        ))}
      </div>
      {trailing && <small>{trailing}</small>}
    </div>
  );
}
