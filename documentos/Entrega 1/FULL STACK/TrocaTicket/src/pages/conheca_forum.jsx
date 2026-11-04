import React, { useState } from 'react';
import { Link } from 'react-router';

export default function ConhecaForum() {
  // Estado para simular curtidas/upvotes nos posts do fórum
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: 'Lucas Mendes',
      avatar: 'LM',
      channel: 'Papo de Show',
      tagColor: 'purple',
      title: 'Alguém vai no show do Coldplay e tem dicas de qual setor escolher na pista?',
      content:
        'Estou em dúvida entre a pista premium e a comum. A visibilidade vale a diferença de preço?',
      votes: 42,
      comments: 14,
      time: ' há 2 horas',
    },
    {
      id: 2,
      author: 'Beatriz Lima',
      avatar: 'BL',
      channel: 'Repasse & Troca',
      tagColor: 'teal',
      title: 'Troco 2 ingressos do festival X por ingressos do show do Bruno Mars!',
      content:
        'Comprei na pré-venda mas infelizmente não poderei ir na mesma data. Alguém curte troca direta?',
      votes: 28,
      comments: 9,
      time: ' há 4 horas',
    },
    {
      id: 3,
      author: 'Carlos Eduardo',
      avatar: 'CE',
      channel: 'Segurança & Dicas',
      tagColor: 'pink',
      title: 'Guia prático: Como transferir ingressos com segurança total na plataforma',
      content:
        'Galera, fiz um resumo com os cuidados básicos para evitar qualquer dor de cabeça na hora de repassar bilhetes.',
      votes: 115,
      comments: 31,
      time: ' há 1 dia',
    },
  ]);

  const handleVote = (id) => {
    setPosts(posts.map((p) => (p.id === id ? { ...p, votes: p.votes + 1 } : p)));
  };

  return (
    <>
      {/* Banner de Apresentação (Hero) */}
      <section className="hero user-hero" style={{ minHeight: '420px', paddingBottom: '60px' }}>
        <div className="hero-content">
          <p className="hero-badge">
            <span /> Comunidade & Fórum • TrocaTicket
          </p>
          <h1>
            A praça de debates dos <em>fãs de shows</em> e ingressos.
          </h1>
          <p className="hero-description" style={{ marginBottom: '24px' }}>
            Participe de discussões, tire dúvidas sobre eventos e troque experiências diretamente
            com outros participantes.
          </p>
        </div>
      </section>

      {/* Conteúdo Principal Estilo Fórum (Grid Assimétrico tipo Reddit) */}
      <section className="section" style={{ paddingTop: '40px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '32px',
            alignItems: 'start',
          }}
          className="forum-grid"
        >
          {/* COLUNA ESQUERDA: Feed de Tópicos */}
          <div className="forum-feed">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '22px' }}>Discussões em Alta</h2>
              <span className="oh-badge">🔥 Em tempo real</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: 'white',
                    border: '1px solid #d6dbe6',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    gap: '16px',
                  }}
                >
                  {/* Botão de Votos / Upvotes */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      minWidth: '40px',
                    }}
                  >
                    <button
                      onClick={() => handleVote(post.id)}
                      style={{
                        background: '#f0f5ff',
                        border: '0',
                        borderRadius: '6px',
                        width: '36px',
                        height: '36px',
                        color: '#6b58ff',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                      }}
                      title="Curtir tópico"
                    >
                      ▲
                    </button>
                    <span
                      style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginTop: '6px',
                        color: '#242628',
                      }}
                    >
                      {post.votes}
                    </span>
                  </div>

                  {/* Corpo do Post */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <span
                        className="avatar small"
                        style={{
                          width: '22px',
                          height: '22px',
                          fontSize: '10px',
                          background: '#101010',
                          color: 'white',
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        {post.avatar}
                      </span>
                      <strong style={{ color: '#242628' }}>{post.author}</strong>
                      <span style={{ color: '#8a98b0' }}>• {post.time}</span>
                      <span className="profile-tag" style={{ marginLeft: 'auto' }}>
                        {post.channel}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', margin: '0 0 6px 0', color: '#101010' }}>
                      {post.title}
                    </h3>
                    <p
                      style={{
                        color: '#697991',
                        fontSize: '14px',
                        margin: '0 0 14px 0',
                        lineHeight: '1.4',
                      }}
                    >
                      {post.content}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        gap: '16px',
                        fontSize: '13px',
                        color: '#697991',
                        fontWeight: '600',
                        borderTop: '1px solid #edf1f6',
                        paddingTop: '10px',
                      }}
                    >
                      <span>💬 {post.comments} comentários</span>
                      <span style={{ color: '#5440eb', cursor: 'pointer' }}>
                        Participar da discussão →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA DIREITA: Sidebar do Fórum */}
          <aside
            className="forum-sidebar"
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Caixa de Ação */}
            <div
              style={{
                background: '#101010',
                color: 'white',
                borderRadius: '14px',
                padding: '24px',
              }}
            >
              <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '8px' }}>
                Quer iniciar um papo?
              </h3>
              <p style={{ color: '#b2b2b2', fontSize: '13px', marginBottom: '16px' }}>
                Crie um tópico para tirar dúvidas ou negociar trocas com a comunidade.
              </p>
              <button
                className="button primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Criar Novo Tópico ✍
              </button>
            </div>

            {/* Regras da Comunidade */}
            <div
              style={{
                background: 'white',
                border: '1px solid #d6dbe6',
                borderRadius: '14px',
                padding: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  marginBottom: '12px',
                  borderBottom: '1px solid #edf1f6',
                  paddingBottom: '8px',
                }}
              >
                📜 Regras do Fórum
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '13px',
                  color: '#697991',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <li>Seja respeitoso com todos os fãs.</li>
                <li>Proibido comércio de cambismo abusivo.</li>
                <li>Mantenha as negociações transparentes.</li>
                <li>Dúvidas sobre ingressos? Use a tag correta.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Ajuste responsivo rápido via CSS inline para telas pequenas */}
      <style>{`
        @media (max-width: 900px) {
          .forum-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
