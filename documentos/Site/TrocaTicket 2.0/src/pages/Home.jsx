import React from 'react';
import { Link } from 'react-router';
import Events from '../components/Events';
import ContasDemonstracao from '../mvp/componentes/ContasDemonstracao';
import { useI18n } from '../i18n';
const profiles = [
  {
    id: 'comprador',
    tag: 'Participante',
    name: 'Comprador',
    icon: '♧',
    description: 'Explore compras, reservas e repasses de ingressos fictícios.',
    features: [
      'Simule reservas para os seus eventos favoritos',
      'Interaja com a comunidade e avalie eventos',
      'Experimente as mensagens de exemplo da comunidade',
    ],
  },
  {
    id: 'organizador',
    tag: 'Produtores',
    name: 'Organizador',
    icon: '⚑',
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
    icon: '▣',
    description: 'Se conecte com organizadores de evento e ofereça serviços e insumos.',
    features: [
      'Publique seus serviços e insumos para os organizadores',
      'Impulsione seus anúncios',
    ],
  },
];
export default function Home() {
  const { t } = useI18n();
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">
            <span /> {t('Demonstração acadêmica de eventos e ingressos')}
          </p>
          <h1>
            {t('Compre e troque ingressos para')}
            <br className="desktop-break" /> {t('seus eventos')} <em>{t('favoritos!')}</em>
          </h1>
          <p className="hero-description">
            {t('Explore os perfis e simule operações com dados fictícios, sem pagamentos reais.')}
          </p>
          <div className="hero-actions">
            <Link to="/perfis" className="button primary">
              {t('Explorar os perfis')} <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              className="button secondary"
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView()}
            >
              ♧ {t('Como funciona')}
            </button>
          </div>
        </div>
      </section>
      <ContasDemonstracao somenteNavegador />
      <section className="profiles section" aria-labelledby="profiles-title">
        <div className="section-heading">
          <p className="eyebrow">{t('Acesso multi-perfil')}</p>
          <h2 id="profiles-title">{t('Como você quer usar o Troca Ticket?')}</h2>
          <p>{t('Soluções desenhadas para participantes, organizadores e fornecedores.')}</p>
        </div>
        <div className="grid">
          {profiles.map((profile) => (
            <article className={`profile-card ${profile.id}`} key={profile.id}>
              <div className="profile-top">
                <span className="profile-icon" aria-hidden="true">
                  {profile.icon}
                </span>
                <span className="profile-tag">{t(profile.tag)}</span>
              </div>
              <h3>{t(profile.name)}</h3>
              <p>{t(profile.description)}</p>
              <ul>
                {profile.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {t(feature)}
                  </li>
                ))}
              </ul>
              <Link className="button dark" to={`/cadastro?perfil=${profile.id}`}>
                {t('Seja um')} {t(profile.name)}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section id="como-funciona" className="how section">
        <div className="section-heading">
          <p className="eyebrow purple">{t('Simplicidade & velocidade')}</p>
          <h2>{t('Como a TROCATICKET funciona?')}</h2>
          <p>{t('Conheça os fluxos simulados de cada perfil. Nenhum ingresso real é emitido.')}</p>
        </div>
        <div className="grid">
          {[
            [
              'Organizador',
              'O organizador define as informações do evento, seleciona fornecedores, marca a data dele e publica na plataforma.',
            ],
            [
              'Usuários',
              'O usuário pode selecionar eventos que deseja ir, comprar, trocar e vender ingressos com outros usuários da plataforma, além de poder avaliar eventos que já passaram.',
            ],
            [
              'Fornecedor',
              'O fornecedor pode criar anúncios com seus produtos e serviços para que os organizadores adicionem a seus eventos.',
            ],
          ].map(([title, description], index) => (
            <article className="step" key={title}>
              <span className="step-number">{index + 1}</span>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
            </article>
          ))}
        </div>
      </section>
      <Events />
    </>
  );
}
