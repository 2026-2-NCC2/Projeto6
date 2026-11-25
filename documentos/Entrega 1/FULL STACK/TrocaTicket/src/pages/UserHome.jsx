import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/Store';
import { EventList, useEvents, currency } from '../components/Events';
import Icon from '../components/Icon';
import PapoBanner from '../components/PapoBanner';
import { getParticipantTickets } from '../services/tickets';
import { getCommunityMessages } from '../services/community';
import { CHAVE_FORUM, notificacoesIniciais } from '../../forum/src/data/notificacoes.js';
import {
  ingressosAtivos,
  notificacoesLidas,
  notificacoesNaoLidas,
  plural,
  primeiroNome,
  progressoPerfil,
  proximoIngresso,
  rotuloDias,
} from '../utils/painelUsuario';

const SLIDE_SECONDS = 10;
const TITULO_CARROSSEL = 'Eventos que você provavelmente vai gostar';

// Carrossel da referência 01: troca a cada 10 s, segura enquanto o mouse ou o foco
// estão nele (CSS) e tem botão de pausa. Com "reduzir movimento" começa pausado.
function EventCarousel({ events, loading }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const total = events.length;

  useEffect(() => {
    if (total < 2) return;
    const img = new Image();
    img.src = events[(index + 1) % total].image;
  }, [index, total, events]);

  if (!total) {
    return (
      <section className="uh-car uh-car-empty" aria-label={TITULO_CARROSSEL}>
        <div className="uh-car-top">
          <span className="uh-k">{TITULO_CARROSSEL}</span>
        </div>
        <div className="uh-car-msg" role="status">
          {loading ? (
            <b>Carregando sugestões…</b>
          ) : (
            <>
              <b>Nenhum evento à venda agora</b>
              <span>Quando houver eventos publicados, as sugestões aparecem aqui.</span>
              <Link to="/eventos" className="uh-go">
                Ver catálogo
              </Link>
            </>
          )}
        </div>
      </section>
    );
  }

  const go = (n) => setIndex((n + total) % total);
  const event = events[index % total];

  return (
    <section className="uh-car" aria-roledescription="carrossel" aria-label={TITULO_CARROSSEL}>
      <div className="uh-car-top">
        <span className="uh-k">{TITULO_CARROSSEL}</span>
        <div className="uh-nav">
          <button type="button" aria-label="Evento anterior" onClick={() => go(index - 1)}>
            ‹
          </button>
          {total > 1 && (
            <button
              type="button"
              aria-label={paused ? 'Retomar carrossel' : 'Pausar carrossel'}
              aria-pressed={paused}
              onClick={() => setPaused((valor) => !valor)}
            >
              {paused ? '▶' : '❚❚'}
            </button>
          )}
          <button type="button" aria-label="Próximo evento" onClick={() => go(index + 1)}>
            ›
          </button>
        </div>
      </div>
      <Link
        key={event.id}
        to={`/eventos/${event.id}`}
        className="uh-slide"
        aria-live={paused ? 'polite' : 'off'}
        aria-label={`${event.title}, ${event.date}, ${event.location}. Ver ingressos`}
      >
        <img src={event.image} alt="" decoding="async" />
        <span className="uh-tx" aria-hidden="true">
          {Number(event.price) > 0 && (
            <span className="uh-price">A partir de {currency(Number(event.price))}</span>
          )}
          <b>{event.title}</b>
          <span>
            {event.date} · {event.location}
          </span>
          <span className="uh-go">Ver ingressos</span>
        </span>
      </Link>
      <div className="uh-bar" aria-hidden="true">
        <i
          key={index}
          className={`uh-fill${paused ? ' is-paused' : ''}`}
          style={{ animationDuration: `${SLIDE_SECONDS}s` }}
          onAnimationEnd={() => !paused && total > 1 && go(index + 1)}
        />
      </div>
    </section>
  );
}

function dataCurta(iso) {
  const [ano, mes, dia] = String(iso || '').split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

// Notificações do Troca-Papo no modo demonstração: as do fórum que ainda não foram lidas.
function lerNotificacoesDemo() {
  let salvo = null;
  try {
    salvo = localStorage.getItem(CHAVE_FORUM);
  } catch {}
  return notificacoesNaoLidas(notificacoesIniciais, notificacoesLidas(salvo));
}

export default function UserHome() {
  const { data, isAuthenticated } = useStore();
  const state = useEvents();
  const { events } = state;
  const perfil = data.profile || {};
  const userId = Number(perfil.id);
  const conta = isAuthenticated && Number.isSafeInteger(userId) && userId > 0;

  // Conta real: ingressos e conversas vêm da API. Demonstração: dados do navegador.
  const [ingressosConta, setIngressosConta] = useState({ loading: conta, list: [], error: '' });
  const [conversas, setConversas] = useState({ loading: conta, list: [], error: '' });
  const [notificacoesDemo] = useState(() => (conta ? [] : lerNotificacoesDemo()));

  useEffect(() => {
    if (!conta) return undefined;
    const controller = new AbortController();
    const falhou = (setter, mensagem) => (error) => {
      if (error.name !== 'AbortError' && !controller.signal.aborted)
        setter({ loading: false, list: [], error: mensagem });
    };
    getParticipantTickets(userId, controller.signal)
      .then((list) => setIngressosConta({ loading: false, list: list || [], error: '' }))
      .catch(falhou(setIngressosConta, 'Não foi possível carregar seus ingressos agora.'));
    getCommunityMessages(userId, controller.signal)
      .then((list) => setConversas({ loading: false, list: list || [], error: '' }))
      .catch(falhou(setConversas, 'Não foi possível carregar as conversas agora.'));
    return () => controller.abort();
  }, [conta, userId]);

  const tickets = conta ? ingressosConta.list : data.tickets || [];
  const ativos = ingressosAtivos(tickets);
  const proximo = proximoIngresso(tickets);

  const byId = (id) => events.find((event) => String(event.id) === String(id));
  const favoriteEvents = (data.favorites || []).map(byId).filter(Boolean);
  const alerts = favoriteEvents
    .map((e) => ({
      e,
      text:
        e.oldPrice > e.price
          ? `Preço caiu ${Math.round((1 - e.price / e.oldPrice) * 100)}%`
          : e.left && e.left <= 50
            ? `Restam ${e.left} ingressos`
            : '',
    }))
    .filter((a) => a.text);

  const mensagensDeOutros = conversas.list.filter((m) => Number(m.userId) !== userId);
  const ultimaMensagem = mensagensDeOutros[0];

  const { percentual } = progressoPerfil(perfil);
  const nome = primeiroNome(perfil.name);

  return (
    <div className="user-home">
      <section className="hero" aria-labelledby="uh-title">
        <div className="hero-content">
          <div className="uh-two">
            <div>
              <p className="hero-badge">
                <span /> Troca e compra segura de ingressos
              </p>
              <h1 id="uh-title">
                {nome ? (
                  <>
                    Boas-vindas de volta, <em>{nome}</em>!
                  </>
                ) : (
                  'Boas-vindas de volta!'
                )}
              </h1>
              <p className="hero-description">
                Gerencie seus ingressos, explore novos eventos e acompanhe suas trocas ativas na
                plataforma.
              </p>
              <div className="hero-actions">
                <Link to="/eventos" className="button primary">
                  Procurar eventos <Icon name="arrow" size={18} />
                </Link>
              </div>
            </div>
            <EventCarousel events={events} loading={state.loading} />
          </div>

          <h2 className="sr-only">Resumo da sua conta</h2>
          <div className="uh-strip">
            <Link to="/favoritos" className="uh-card">
              <span className="uh-k">Favoritos</span>
              {alerts.length ? (
                <>
                  <span className="uh-big">{plural(alerts.length, 'novidade', 'novidades')}</span>
                  {alerts.slice(0, 2).map(({ e, text }) => (
                    <span key={e.id} className="uh-sub">
                      {e.title}: {text}
                    </span>
                  ))}
                </>
              ) : favoriteEvents.length ? (
                <>
                  <span className="uh-big">
                    {plural(favoriteEvents.length, 'evento', 'eventos')}
                  </span>
                  <span className="uh-thumbs">
                    {favoriteEvents.slice(0, 3).map((e) => (
                      <img key={e.id} src={e.image} alt="" loading="lazy" decoding="async" />
                    ))}
                  </span>
                </>
              ) : (
                <>
                  <span className="uh-big">Nenhum favorito ainda</span>
                  <span className="uh-sub">Favorite eventos para receber alertas de preço.</span>
                </>
              )}
              <span className="uh-go">Ver favoritos</span>
            </Link>

            <Link to="/comunidade" className="uh-card">
              <span className="uh-k">Troca-Papo</span>
              {conta ? (
                conversas.loading ? (
                  <span className="uh-sub" role="status">
                    Carregando conversas…
                  </span>
                ) : conversas.error ? (
                  <>
                    <span className="uh-big">Conversas</span>
                    <span className="uh-sub">{conversas.error}</span>
                  </>
                ) : ultimaMensagem ? (
                  <>
                    <span className="uh-big">
                      {plural(mensagensDeOutros.length, 'mensagem', 'mensagens')} no mural
                    </span>
                    <span className="uh-sub uh-clamp">
                      {primeiroNome(ultimaMensagem.name) || 'Alguém'}: “{ultimaMensagem.text}”
                    </span>
                  </>
                ) : (
                  <>
                    <span className="uh-big">Nenhuma conversa ainda</span>
                    <span className="uh-sub">Puxe assunto, tire dúvidas e combine trocas.</span>
                  </>
                )
              ) : notificacoesDemo.length ? (
                <>
                  <span className="uh-big">
                    {plural(notificacoesDemo.length, 'notificação nova', 'notificações novas')}
                  </span>
                  <span className="uh-sub uh-clamp">{notificacoesDemo[0].texto}</span>
                </>
              ) : (
                <>
                  <span className="uh-big">Tudo em dia</span>
                  <span className="uh-sub">Nenhuma notificação nova no Troca-Papo.</span>
                </>
              )}
              <span className="uh-go">Entrar no Troca-Papo</span>
            </Link>

            <Link to="/perfil" className="uh-card">
              <span className="uh-k">
                {percentual < 100 ? 'Complete seu perfil' : 'Seu perfil'}
              </span>
              <span className="uh-big">
                {percentual < 100 ? `${percentual}%` : 'Perfil completo'}
              </span>
              <span className="uh-pbar" aria-hidden="true">
                <i style={{ width: `${percentual}%` }} />
              </span>
              <span className="uh-sub">
                {percentual < 100
                  ? 'Complete seus dados para trocar com mais segurança.'
                  : 'Seus dados estão prontos para trocas seguras.'}
              </span>
              <span className="uh-go">{percentual < 100 ? 'Completar perfil' : 'Ver perfil'}</span>
            </Link>

            <Link to={ativos.length ? '/ingressos' : '/eventos'} className="uh-card">
              <span className="uh-k">{proximo ? 'Seu próximo evento' : 'Meus ingressos'}</span>
              {conta && ingressosConta.loading ? (
                <span className="uh-sub" role="status">
                  Carregando ingressos…
                </span>
              ) : conta && ingressosConta.error ? (
                <>
                  <span className="uh-big">Ingressos</span>
                  <span className="uh-sub">{ingressosConta.error}</span>
                </>
              ) : proximo ? (
                <>
                  <span className="uh-big">{rotuloDias(proximo.dias)}</span>
                  <span className="uh-sub">
                    {proximo.eventTitle} · {dataCurta(proximo.date)}
                  </span>
                </>
              ) : ativos.length ? (
                <>
                  <span className="uh-big">
                    {plural(ativos.length, 'ingresso reservado', 'ingressos reservados')}
                  </span>
                  <span className="uh-chips">
                    {ativos.slice(0, 2).map((ingresso) => (
                      <span key={ingresso.id}>{ingresso.eventTitle || ingresso.title}</span>
                    ))}
                  </span>
                </>
              ) : (
                <>
                  <span className="uh-big">Nenhum ingresso ainda</span>
                  <span className="uh-sub">Escolha um evento e garanta seu lugar.</span>
                </>
              )}
              <span className="uh-go">
                {ativos.length ? 'Abrir meus ingressos' : 'Procurar eventos'}
              </span>
            </Link>
          </div>
        </div>
      </section>
      <EventList state={state} title="Eventos em destaque" />
      <PapoBanner
        eyebrow="Troca-Papo"
        title="Dúvidas sobre uma troca?"
        text="Converse com outros fãs, veja dicas de segurança e descubra quem está trocando ingressos para os seus eventos favoritos."
      />
    </div>
  );
}
