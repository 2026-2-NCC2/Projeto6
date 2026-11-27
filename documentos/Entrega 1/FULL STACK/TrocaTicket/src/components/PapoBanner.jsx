import React from 'react';
import { Link } from 'react-router';
import { t } from '../i18n';

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
          <p className="eyebrow">{t(eyebrow)}</p>
          <h2>{t(title)}</h2>
          <p>{t(text)}</p>
        </div>
        <Link to={to} className="button">
          {t('Entrar no Troca-Papo')} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
