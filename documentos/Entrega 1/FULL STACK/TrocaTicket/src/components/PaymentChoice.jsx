import React from 'react';

const OPCOES = [
  ['pix', 'Pix (simulado)'],
  ['cartao', 'Cartão (simulado)'],
];

// Escolha da forma de pagamento simulada. Nenhum dado de pagamento é pedido.
export default function PaymentChoice({ value, onChange, name }) {
  return (
    <fieldset className="sp-radio-cards payment-choice">
      <legend>Forma de pagamento (simulada)</legend>
      {OPCOES.map(([id, rotulo]) => (
        <label key={id} className={value === id ? 'checked' : ''}>
          <input
            type="radio"
            name={name}
            value={id}
            checked={value === id}
            onChange={() => onChange(id)}
          />
          {rotulo}
        </label>
      ))}
      <small className="muted">
        Nenhum dado de pagamento é pedido; o resultado é uma simulação.
      </small>
    </fieldset>
  );
}
