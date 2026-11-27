import React from 'react';
import { Link } from 'react-router';
import Events from '../components/Events';
import Icon from '../components/Icon';
import PapoBanner from '../components/PapoBanner';
import { t } from '../i18n';
const profiles = [
  {
    id: 'comprador',
    tag: 'Participante',
    name: 'Usuário',
    cta: 'Seja um Usuário',
    icon: 'ticket',
    description: 'Compre, troque ou revenda ingressos sem risco de golpes.',
    features: [
      'Compre ingressos para os seus eventos favoritos',
      'Interaja com a comunidade e avalie eventos',
      'Converse com outros usuários pelo chat',
    ],
  },
  {
    id: 'organizador',
    tag: 'Produtores',
    name: 'Organizador',
    cta: 'Seja um Organizador',
    icon: 'megaphone',
    description:
      'Organize seus eventos, anuncie e se conecte com fornecedores na nossa própria plataforma.',
    features: [
      'Crie, edite e impulsione os seus eventos',
      'Se conecte com fornecedores',
      'A nossa plataforma consolida os custos e sugere um valor para o ticket do seu evento',
    ],
  },
  {
    id: 'fornecedor',
    tag: 'Fornecedores B2B',
    name: 'Fornecedor',
    cta: 'Seja um Fornecedor',
    icon: 'box',
    description: 'Se conecte com organizadores de evento e ofereça serviços e insumos.',
    features: [
      'Publique seus serviços e insumos para os organizadores',
      'Impulsione seus anúncios',
    ],
  },
];
export default function Home() {
  return (
    <>
        <section className="hero hero-full">
        <div className="hero-content">
          <p className="hero-badge">
            <span /> {t('Troca e compra segura de ingressos')}
          </p>
          <h1>
            {t('Compre e troque ingressos para')}
            <br className="desktop-break" /> {t('seus eventos')} <em>{t('favoritos!')}</em>
          </h1>
          <p className="hero-description">
            {t('Compre e transfira seus ingressos em poucos cliques com qualquer pessoa.')}
          </p>
          <div className="hero-actions">
            <Link to="/cadastro" className="button primary">
              {t('Comece na TrocaTicket')} <Icon name="arrow" size={18} />
            </Link>
            <a className="button secondary" href="#profiles">
              <Icon name="shield" size={18} /> {t('Como funciona?')}
            </a>
          </div>
        </div>
      </section>
      <section id="profiles" className="profiles section" aria-labelledby="profiles-title">
        <div className="section-heading">
          <p className="eyebrow">{t('Acesso multi-perfil')}</p>
          <h2 id="profiles-title">{t('Como você quer usar o Troca Ticket?')}</h2>
          <p>{t('Soluções desenhadas para usuários, organizadores e fornecedores.')}</p>
        </div>
        <div className="grid">
          {profiles.map((profile) => (
            <article className={`profile-card ${profile.id}`} key={profile.id}>
              <div className="profile-top">
                <span className="profile-icon" aria-hidden="true">
                  <Icon name={profile.icon} />
                </span>
                <span className="profile-tag">{t(profile.tag)}</span>
              </div>
              <h3>{t(profile.name)}</h3>
              <p>{t(profile.description)}</p>
              <ul>
                {profile.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check" size={15} />
                    {t(feature)}
                  </li>
                ))}
              </ul>
              <Link className="button dark" to={`/cadastro?perfil=${profile.id}`}>
                {t(profile.cta)}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <Events />
      <PapoBanner to="/cadastro" />
    </>
  );
}
