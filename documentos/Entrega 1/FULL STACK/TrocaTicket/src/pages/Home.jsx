import React from 'react';
import { Link } from 'react-router';
import Events from '../components/Events';
const profiles = [
  {
    id: 'comprador',
    tag: 'Participante',
    name: 'Comprador',
    icon: '♧',
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
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="hero-badge">
            <span /> Troca e compra segura de ingressos
          </p>
          <h1>
            Compre e troque ingressos para
            <br className="desktop-break" /> seus eventos <em>favoritos!</em>
          </h1>
          <p className="hero-description">
            Compre e transfira seus ingressos em poucos cliques com qualquer pessoa.
          </p>
          <div className="hero-actions">
            <Link to="/cadastro" className="button primary">
              Começar Gratuitamente <span aria-hidden="true">→</span>
            </Link>
            <a className="button secondary" href="#como-funciona">
              ♧ Como funciona
            </a>
          </div>
        </div>
      </section>
      <section className="profiles section" aria-labelledby="profiles-title">
        <div className="section-heading">
          <p className="eyebrow">Acesso multi-perfil</p>
          <h2 id="profiles-title">Como você quer usar o Troca Ticket?</h2>
          <p>Soluções desenhadas para participantes, organizadores e fornecedores.</p>
        </div>
        <div className="grid">
          {profiles.map((profile) => (
            <article className={`profile-card ${profile.id}`} key={profile.id}>
              <div className="profile-top">
                <span className="profile-icon" aria-hidden="true">
                  {profile.icon}
                </span>
                <span className="profile-tag">{profile.tag}</span>
              </div>
              <h3>{profile.name}</h3>
              <p>{profile.description}</p>
              <ul>
                {profile.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link className="button dark" to={`/cadastro?perfil=${profile.id}`}>
                Seja um {profile.name}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section id="como-funciona" className="how section">
        <div className="section-heading">
          <p className="eyebrow purple">Simplicidade & velocidade</p>
          <h2>Como a TROCATICKET funciona?</h2>
          <p>Protegendo comprador e vendedor do anúncio até o acesso ao evento.</p>
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
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <Events />
    </>
  );
}
