import React from 'react';
import { Link } from 'react-router';

// Faixa de convite para o Troca-Papo. A homepage do Usuário usa os textos da referência 01.
export default function PapoBanner({
  to = '/comunidade',
  eyebrow = 'Comunidade',
  title = 'Entre no Troca-Papo',
  text = 'Converse com outros usuários, tire dúvidas e avalie eventos na nossa comunidade.',
}) {
  return (
    <section className="uh-papo-wrap section">
      <div className="uh-papo">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <Link to={to} className="button">
          Entrar no Troca-Papo <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
