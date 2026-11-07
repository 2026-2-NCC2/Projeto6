import React from 'react';
import { Link } from 'react-router';

export default function PapoBanner({ to = '/comunidade' }) {
  return (
    <section className="uh-papo-wrap section">
      <div className="uh-papo">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h2>Entre no Troca-Papo</h2>
          <p>
            Converse com outros participantes, tire dúvidas e avalie eventos na nossa comunidade.
          </p>
        </div>
        <Link to={to} className="button">
          Entrar no Troca-Papo
        </Link>
      </div>
    </section>
  );
}