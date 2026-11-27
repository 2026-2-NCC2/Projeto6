import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useEvents, LoadState } from '../components/Events';
import { useStore } from '../context/Store';
import { horaBrasilia } from '../services/portaria';
import { Badge, Empty, Modal, PageTitle, Panel, Tabs, money } from '../components/UI';
import EventCard from '../components/EventCard';
import { getEventReviews, saveEventReview } from '../services/events';
import {
  cancelarPedido,
  criarChave,
  horaLimite,
  pagarPedido,
  reservarPedido,
} from '../services/orders';
import PaymentChoice from '../components/PaymentChoice';
import { EventResale } from './Resale';
import {
  createCommunityMessage,
  deleteCommunityMessage,
  getCommunityMessages,
} from '../services/community';
import {
  cancelParticipantTicket,
  createExchangeOffer,
  getExchangeListings,
  getParticipantExchangeOffers,
  getParticipantTickets,
  setTicketExchangeListing,
  updateExchangeOffer,
} from '../services/tickets';
import { t } from '../i18n';

export function EventCardWrapper({ event }) {
  const { data, toggleFavorite } = useStore();
  const saved = data.favorites.some((id) => String(id) === String(event.id));
  
  return (
    <EventCard 
      event={event} 
      variant="participant" 
      isFavorite={saved} 
      onToggleFavorite={toggleFavorite} 
    />
  );
}

export function Catalog({ favorites = false }) {
  const state = useEvents();
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Todas');
  const published = data.events.filter((e) => e.status === 'Publicado');
  const all = [...new Map([...state.events, ...published].map((event) => [String(event.id), event])).values()];
  const filtered = all.filter(
    (e) =>
      (!favorites || data.favorites.some((id) => String(id) === String(e.id))) &&
      `${e.title} ${e.location}`.toLowerCase().includes(query.toLowerCase()) &&
      (city === 'Todas' || e.location.includes(city)),
  );
  return (
    <div className="workspace discovery">
      <div className="discovery-heading">
        <Badge>{t('EXPERIÊNCIAS QUE CONECTAM PESSOAS')}</Badge>
        <h1>{favorites ? t('Seus favoritos') : t('EVENTOS')}</h1>
        <p>
          {t('Explore festivais, grandes turnês e experiências ao vivo.')}
          <br />
          {t('Encontre o seu próximo momento inesquecível.')}
        </p>
        <div className="discovery-search">
          <input
            type="search"
            aria-label={t('Buscar eventos')}
            placeholder={t('Buscar por artista, festival ou cidade…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select aria-label={t('Cidade')} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="Todas">{t('Todas')}</option>
            <option value="São Paulo">{t('São Paulo')}</option>
            <option value="Rio de Janeiro">{t('Rio de Janeiro')}</option>
          </select>
        </div>
      </div>
      <LoadState {...state} />
      {!state.loading && !state.error && (
        <>
          <PageTitle
            heading="h2"
            title={favorites ? t('Eventos salvos') : t('Recomendados para Você')}
            subtitle={t('{length} eventos encontrados', { length: filtered.length })}
          />
          <div className="discovery-grid">
            {filtered.slice(0, 4).map((e) => (
              <EventCardWrapper event={e} key={e.id}/>
            ))}
          </div>
          {filtered.length > 4 && (
            <>
              <PageTitle
                heading="h2"
                title={t('Mais experiências para descobrir')}
                subtitle={t('Shows, cultura e encontros para todos os gostos.')}
              />
              <div className="discovery-grid">
                {filtered.slice(4).map((e) => (
                  <EventCardWrapper event={e} key={e.id}/>
                ))}
              </div>
            </>
          )}
          {!filtered.length && (
            <Empty title={favorites ? t('Você ainda não tem favoritos') : t('Nenhum evento encontrado')}>
              {favorites
                ? t('Toque no coração de um evento para encontrá-lo aqui.')
                : t('Experimente outro nome ou cidade.')}
            </Empty>
          )}
        </>
      )}
    </div>
  );
}

export function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const state = useEvents();
  const { data, role, isAuthenticated, update, notify, toggleFavorite } = useStore();
  const event = [...state.events, ...data.events].find((e) => String(e.id) === id);
  const [tab, setTab] = useState('Sobre o evento');
  const [type, setType] = useState('Inteira');
  const [quantity, setQuantity] = useState(1);
  const [modal, setModal] = useState(false);
  const [reviewsFromApi, setReviewsFromApi] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [reserving, setReserving] = useState(false);
  // Compra em duas etapas (etapa 3): reservar e depois pagar de forma simulada.
  const [etapa, setEtapa] = useState('revisar');
  const [pedido, setPedido] = useState(null);
  const [declaracaoMeia, setDeclaracaoMeia] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const chaves = useRef({});
  const numericEventId = Number(id);
  const isDatabaseEvent = Number.isSafeInteger(numericEventId) && numericEventId > 0;
  const userId = Number(data.profile?.id);
  const canBuyTicket = isAuthenticated && role === 'comprador' && isDatabaseEvent &&
    Number.isSafeInteger(userId) && userId > 0;

  useEffect(() => {
    if (!isDatabaseEvent) return undefined;
    const controller = new AbortController();
    getEventReviews(numericEventId, controller.signal)
      .then((result) => {
        setReviewsFromApi(result);
        setReviewError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setReviewError(error.message);
      });
    return () => controller.abort();
  }, [isDatabaseEvent, numericEventId]);
  if (state.loading || state.error)
    return (
      <div className="workspace">
        <LoadState {...state} />
      </div>
    );
  if (!event)
    return (
      <div className="workspace">
        <Empty title={t('Evento não encontrado')} />
        <Link className="button primary" to="/eventos">
          {t('Voltar aos eventos')}
        </Link>
      </div>
    );
  const price = event.price * (type === 'Meia-entrada' ? 0.5 : 1);
  const total = price * quantity;
  const localReviews = data.reviews?.[id] || [];
  const reviews = reviewsFromApi ? reviewsFromApi.reviews : localReviews;
  const averageRating = reviewsFromApi
    ? reviewsFromApi.average
    : reviews.length
      ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length) * 10) / 10
      : 0;
  async function submitReview(e) {
    e.preventDefault();
    const rating = Number(reviewRating);
    if (role !== 'comprador' || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewComment.length > 255) {
      setReviewError('Escolha uma nota de 1 a 5 e escreva um comentário de até 255 caracteres.');
      return;
    }
    setReviewSaving(true);
    setReviewError('');
    const review = {
      rating,
      comment: reviewComment.trim(),
      name: data.profile?.name || 'Usuário',
      userId: Number.isSafeInteger(userId) && userId > 0 ? userId : null,
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      if (isDatabaseEvent && Number.isSafeInteger(userId) && userId > 0) {
        setReviewsFromApi(await saveEventReview(numericEventId, userId, review));
      } else {
        update('reviews', (current) => {
          const previous = current[id] || [];
          const next = review.userId
            ? previous.filter((item) => item.userId !== review.userId)
            : previous;
          return { ...current, [id]: [review, ...next] };
        });
      }
      setReviewComment('');
      notify('Sua avaliação foi salva.');
    } catch (error) {
      setReviewError(error.message);
    } finally {
      setReviewSaving(false);
    }
  }
  // Reaproveita a mesma chave se a ação ficou sem resposta, para nunca comprar em dobro.
  async function comChave(nome, acao) {
    chaves.current[nome] ||= criarChave();
    try {
      const resultado = await acao(chaves.current[nome]);
      delete chaves.current[nome];
      return resultado;
    } catch (error) {
      if (!error.semResposta) delete chaves.current[nome];
      throw error;
    }
  }
  function fecharCheckout() {
    setModal(false);
    setEtapa('revisar');
    setPedido(null);
  }
  function fecharModal() {
    if (reserving) return;
    if (etapa === 'pagar' && pedido) {
      notify(`Sua reserva continua em Meus pedidos até ${horaLimite(pedido.secondsToExpire)}.`);
    }
    fecharCheckout();
  }
  async function pagar() {
    setReservationError('');
    setReserving(true);
    try {
      const atualizado = await comChave(`pagar:${pedido.id}`, (chave) =>
        pagarPedido(pedido.id, pedido.total > 0 ? formaPagamento : undefined, chave),
      );
      if (atualizado.status === 'pago') {
        fecharCheckout();
        notify(
          pedido.total > 0
            ? 'Pagamento aprovado (simulação). Seus ingressos estão em Meus ingressos.'
            : 'Inscrição confirmada. Seus ingressos estão em Meus ingressos.',
        );
        navigate('/ingressos');
      } else {
        setReservationError(atualizado.reason || 'O pagamento simulado não foi aprovado.');
        setPedido(null);
        setEtapa('revisar');
      }
    } catch (error) {
      setReservationError(error.message);
    } finally {
      setReserving(false);
    }
  }
  async function cancelarReserva() {
    setReservationError('');
    setReserving(true);
    try {
      await comChave(`cancelar:${pedido.id}`, (chave) => cancelarPedido(pedido.id, chave));
      fecharCheckout();
      notify('Reserva cancelada. Os lugares foram liberados.');
    } catch (error) {
      setReservationError(error.message);
    } finally {
      setReserving(false);
    }
  }
  async function reserve() {
    setReservationError('');
    if (canBuyTicket) {
      setReserving(true);
      try {
        const novo = await comChave(`reservar:${numericEventId}:${type}:${quantity}`, (chave) =>
          reservarPedido(
            {
              eventId: numericEventId,
              type,
              quantity,
              halfDeclaration: type === 'Meia-entrada' ? declaracaoMeia : undefined,
            },
            chave,
          ),
        );
        setPedido(novo);
        setEtapa('pagar');
      } catch (error) {
        setReservationError(error.message);
      } finally {
        setReserving(false);
      }
      return;
    }
    if (isAuthenticated) {
      setReservationError('Entre com uma conta de usuário para reservar este evento publicado.');
      return;
    }
    update('tickets', (old) => [
      {
        id: `DEMO-${Date.now().toString().slice(-7)}`,
        eventId: id,
        title: event.title,
        image: event.image,
        type,
        quantity,
        total,
        status: 'Reservado (demo)',
      },
      ...old,
    ]);
    setModal(false);
    notify('Reserva de demonstração adicionada aos seus ingressos.');
  }
  return (
    <div className="workspace">
      <div className="breadcrumb">
        <Link to="/eventos">{t('Eventos')}</Link>
        <span>›</span>
        <span>{event.title}</span>
      </div>
      <PageTitle title={event.title} eyebrow={t('Eventos')} subtitle={event.location}>
        <button
          className="button outline"
          onClick={() => {
            toggleFavorite(id);
            notify(
              data.favorites.some((favoriteId) => String(favoriteId) === String(id))
                ? 'Evento removido dos favoritos.'
                : 'Evento salvo nos favoritos.',
            );
          }}
        >
          {data.favorites.some((favoriteId) => String(favoriteId) === String(id)) ? t('♥ Salvo') : t('♡ Salvar')}
        </button>
        <Link className="button outline" to="/comunidade">
          {t('Troca-Papo →')}
        </Link>
      </PageTitle>
      <div className="dashboard-layout detail-layout">
        <div>
          <Panel className="event-hero-panel">
            <div className="event-poster">
              <img
                src={id === 'lollapalooza' ? '/images/asset-30.jpg' : event.image}
                alt={event.title}
              />
              <div>
                <Badge>{t('Experiência ao vivo')}</Badge>
                <h2>{event.location}</h2>
              </div>
            </div>
            <div className="card-actions">
              <span>{t('Uma experiência para guardar na memória')}</span>
              <strong className="stars" aria-label={t('{v1} de 5 estrelas', { v1: averageRating || 0 })}>
                {averageRating
                  ? `${'★'.repeat(Math.round(averageRating))}${'☆'.repeat(5 - Math.round(averageRating))}`
                  : '☆☆☆☆☆'}
              </strong>
            </div>
          </Panel>
          <Panel>
            <Tabs
              options={['Sobre o evento', 'Line-up & atrações', 'Como funciona', 'Avaliações']}
              value={tab}
              onChange={setTab}
            />
            <div className="tab-content">
              {tab === 'Sobre o evento' ? (
                <>
                  <p>{event.description}</p>
                  <p>
                    {t('Encontre sua entrada, escolha o tipo de ingresso e acompanhe tudo em sua área de usuário.')}
                  </p>
                  <div className="info-note">
                    {t('Os eventos, valores e avaliações deste protótipo são demonstrativos.')}
                  </div>
                </>
              ) : tab === 'Line-up & atrações' ? (
                <>
                  <h3>{t('Programação do evento')}</h3>
                  <p>
                    {t('Abertura dos portões, apresentações principais e experiências de gastronomia e cultura.')}
                  </p>
                  <p className="muted">
                    {t('A programação oficial será disponibilizada pelo organizador no serviço real.')}
                  </p>
                </>
              ) : tab === 'Como funciona' ? (
                <>
                  <h3>{t('Escolha, reserve e acompanhe')}</h3>
                  <ol>
                    <li>{t('Selecione o tipo de ingresso e a quantidade.')}</li>
                    <li>{t('Reserve: os ingressos ficam guardados por 15 minutos.')}</li>
                    <li>{t('Pague de forma simulada (Pix ou cartão) e receba os ingressos em “Meus ingressos”.')}</li>
                    <li>{t('Até a véspera do evento, peça o estorno em “Meus pedidos”.')}</li>
                  </ol>
                  <p>{t('Nenhuma cobrança é feita e nenhum dado de pagamento é pedido.')}</p>
                </>
              ) : (
                <>
                  <h3>{t('Avaliações da comunidade')}</h3>
                  {reviewsFromApi && (
                    <p className="muted">
                      {t('Média')} {averageRating.toFixed(1)} {t('de 5 ·')} {reviewsFromApi.count} {t('avaliações')}
                    </p>
                  )}
                  {reviewError && <p className="api-error" role="alert">{reviewError}</p>}
                  {!reviews.length && <p className="muted">{t('Este evento ainda não recebeu avaliações.')}</p>}
                  <ul className="event-reviews">
                    {reviews.map((review) => (
                      <li key={review.id || `${review.userId || review.name}-${review.date}`}>
                        <strong>{review.name}</strong>
                        <span className="stars" aria-label={t('{rating} de 5 estrelas', { rating: review.rating })}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                        {review.comment && <p>{review.comment}</p>}
                        <small className="muted">{review.date}</small>
                      </li>
                    ))}
                  </ul>
                  {role === 'comprador' ? (
                    <form className="event-review-form" onSubmit={submitReview}>
                      <label htmlFor="event-review-rating">{t('Sua nota')}</label>
                      <select id="event-review-rating" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>{value} {t('estrelas')}</option>
                        ))}
                      </select>
                      <label htmlFor="event-review-comment">{t('Comentário (opcional)')}</label>
                      <textarea
                        id="event-review-comment"
                        maxLength={255}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={t('Compartilhe sua experiência…')}
                      />
                      <small>{reviewComment.length}/255</small>
                      <button className="button blue-button" disabled={reviewSaving}>
                        {reviewSaving ? t('Salvando…') : t('Salvar avaliação')}
                      </button>
                    </form>
                  ) : (
                    <p className="muted">
                      <Link to="/entrar">{t('Entre como usuário')}</Link> {t('para avaliar este evento.')}
                    </p>
                  )}
                  <Link className="text-link" to="/comunidade">
                    {t('Participar da conversa →')}
                  </Link>
                </>
              )}
            </div>
          </Panel>
        </div>
        <aside>
          <Panel className="booking-panel">
            {isAuthenticated && !canBuyTicket ? (
              <>
                <Badge>{t('Compra indisponível')}</Badge>
                <p className="muted">
                  {role !== 'comprador'
                    ? t('A reserva simulada está disponível somente para contas de usuário.')
                    : t('Este evento não está conectado a um evento publicado do banco.')}
                </p>
              </>
            ) : (
              <>
                <Badge>{isAuthenticated ? t('Compra simulada') : t('Reserva de demonstração')}</Badge>
                <p className="muted">{t('Ingressos a partir de')}</p>
                <div className="booking-price">{money(price)}</div>
                <label htmlFor="ticket-type">{t('Selecione o tipo de entrada')}</label>
                <select id="ticket-type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Inteira">{t('Inteira')}</option>
                  <option value="Meia-entrada">{t('Meia-entrada')}</option>
                </select>
                <label htmlFor="ticket-quantity">{t('Quantidade')}</label>
                <input
                  id="ticket-quantity"
                  type="number"
                  min="1"
                  max="6"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(6, Math.max(1, Number(e.target.value) || 1)))
                  }
                />
                <div className="card-actions">
                  <span>{t('Total')}</span>
                  <strong>{money(total)}</strong>
                </div>
                <button
                  className="button primary full"
                  onClick={() => {
                    setReservationError('');
                    setModal(true);
                  }}
                >
                  {isAuthenticated ? t('Comprar ingresso →') : t('Simular reserva →')}
                </button>
                <small className="muted">
                  {t('Sem pagamento real. O ingresso é válido apenas como registro da plataforma.')}
                </small>
              </>
            )}
            {reservationError && <p className="api-error" role="alert">{t(reservationError)}</p>}
          </Panel>
          {canBuyTicket && <EventResale key={numericEventId} eventId={numericEventId} userId={userId} />}
          <Panel title={t('Detalhes e Localização')}>
            <p>▦ {t(event.date)}</p>
            <p>⌖ {event.location}</p>
            <p className="muted">
              {t('Consulte as regras e a classificação indicativa na programação oficial.')}
            </p>
            {id === 'lollapalooza' && (
              <img
                className="venue-map"
                src="/images/asset-33.jpg"
                alt={t('Mapa ilustrativo do local do festival')}
              />
            )}
          </Panel>
          <Panel title={t('Troca-Papo')}>
            <p>{t('Encontre outras pessoas e compartilhe sua expectativa.')}</p>
            <Link className="button outline full" to="/comunidade">
              {t('Entrar no Troca-Papo →')}
            </Link>
          </Panel>
        </aside>
      </div>
      {modal && (
        <Modal
          title={
            !isAuthenticated
              ? t('Confirmar reserva de demonstração')
              : etapa === 'pagar'
                ? t('Pagamento simulado')
                : t('Confirmar pedido')
          }
          onClose={fecharModal}
        >
          <h3>{event.title}</h3>
          <p>
            {quantity} × {type} · <strong>{money(etapa === 'pagar' && pedido ? pedido.total : total)}</strong>
          </p>
          {!isAuthenticated ? (
            <>
              <p>
                {t('Esta ação salva uma reserva local de demonstração. Não há pagamento e o registro não é válido para entrada.')}
              </p>
              {reservationError && <p className="api-error" role="alert">{t(reservationError)}</p>}
              <button className="button primary full" onClick={reserve} disabled={reserving}>
                {reserving ? t('Salvando…') : t('Confirmar reserva de demonstração')}
              </button>
            </>
          ) : etapa === 'pagar' && pedido ? (
            <>
              <p className="info-note">
                {t('Pedido nº')} {pedido.id} {t('reservado até')} {horaLimite(pedido.secondsToExpire)}{t('. Se o pagamento não for concluído até lá, os lugares são liberados.')}
              </p>
              {pedido.total > 0 ? (
                <PaymentChoice value={formaPagamento} onChange={setFormaPagamento} name="forma-pagamento-evento" />
              ) : (
                <p>{t('Evento gratuito: é só confirmar a inscrição.')}</p>
              )}
              {reservationError && <p className="api-error" role="alert">{t(reservationError)}</p>}
              <button className="button primary full" onClick={pagar} disabled={reserving}>
                {reserving
                  ? t('Processando…')
                  : pedido.total > 0
                    ? t('Pagar {v1} (simulado)', { v1: money(pedido.total) })
                    : t('Confirmar inscrição')}
              </button>
              <button className="button outline full" onClick={cancelarReserva} disabled={reserving}>
                {t('Cancelar reserva')}
              </button>
            </>
          ) : (
            <>
              <p>
                {t('Os ingressos ficam reservados por 15 minutos enquanto você conclui o pagamento simulado. Nenhum valor é cobrado e os ingressos não são válidos para entrada no evento.')}
              </p>
              {type === 'Meia-entrada' && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={declaracaoMeia}
                    onChange={(e) => setDeclaracaoMeia(e.target.checked)}
                  />
                  {t('Declaro ter direito à meia-entrada (simulação; nenhum documento é conferido).')}
                </label>
              )}
              {reservationError && <p className="api-error" role="alert">{t(reservationError)}</p>}
              <button
                className="button primary full"
                onClick={reserve}
                disabled={reserving || (type === 'Meia-entrada' && !declaracaoMeia)}
              >
                {reserving ? t('Reservando…') : t('Reservar e ir para o pagamento')}
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

export function Tickets() {
  const { data, update, notify, isAuthenticated, role } = useStore();
  const userId = Number(data.profile?.id);
  const canManageAccountTickets = isAuthenticated && role === 'comprador' &&
    Number.isSafeInteger(userId) && userId > 0;
  const [tickets, setTickets] = useState([]);
  const [listings, setListings] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [selectedOfferTickets, setSelectedOfferTickets] = useState({});
  const reload = useCallback(async (signal) => {
    const [accountTickets, availableTickets, exchangeOffers] = await Promise.all([
      getParticipantTickets(userId, signal),
      getExchangeListings(userId, signal),
      getParticipantExchangeOffers(userId, signal),
    ]);
    setTickets(accountTickets);
    setListings(availableTickets);
    setOffers(exchangeOffers);
  }, [userId]);

  useEffect(() => {
    if (!canManageAccountTickets) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    reload(controller.signal)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [canManageAccountTickets, reload, retry]);

  async function perform(action, successMessage) {
    setSaving(true);
    setError('');
    try {
      await action();
      await reload();
      notify(successMessage);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setSaving(false);
    }
  }

  if (isAuthenticated && !canManageAccountTickets) {
    return (
      <div className="workspace">
        <PageTitle title={t('Meus Ingressos')} subtitle={t('Suas reservas vinculadas à conta.')} />
        <Empty title={t('Reservas ainda não disponíveis')}>
          {t('Esta área está disponível para contas de usuário.')}
        </Empty>
      </div>
    );
  }
  if (canManageAccountTickets) {
    const activeTickets = tickets.filter((ticket) => ticket.statusCode === 'A');
    const pendingOutgoing = new Set(
      offers
        .filter((offer) => offer.direction === 'enviada' && offer.status === 'Pendente')
        .map((offer) => offer.offeredTicketId),
    );
    const offerableTickets = activeTickets.filter((ticket) => !pendingOutgoing.has(ticket.id));

    return (
      <div className="workspace participant-tickets">
        <PageTitle
          title={t('Meus Ingressos')}
          subtitle={t('Gerencie seus ingressos simulados e combine trocas com outros usuários.')}
        >
          <Link className="button outline" to="/repasses">{t('Repasses e transferências')}</Link>
          <Link className="button outline" to="/pedidos">{t('Meus pedidos')}</Link>
          <Link className="button primary" to="/eventos">{t('Explorar eventos')}</Link>
        </PageTitle>
        {error && (
          <div className="api-error" role="alert">
            <span>{t(error)}</span>
            <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
              {t('Tentar novamente')}
            </button>
          </div>
        )}
        {loading && <p role="status">{t('Carregando ingressos e solicitações de troca…')}</p>}
        <section aria-labelledby="account-tickets-heading">
          <h2 id="account-tickets-heading">{t('Ingressos da sua conta')}</h2>
          {tickets.length ? (
            <div className="cards-three">
              {tickets.map((ticket) => (
                <Panel key={ticket.id}>
                  <img className="supplier-cover" src={ticket.image} alt={ticket.eventTitle} />
                  <Badge tone={ticket.statusCode === 'A' ? 'green' : 'gray'}>{t(ticket.status)}</Badge>
                  {ticket.inResale && <Badge tone="amber">{t('Em repasse')}</Badge>}
                  <h3>{ticket.eventTitle}</h3>
                  <p>{ticket.date} · {ticket.location}</p>
                  <p>{ticket.type} · {money(ticket.price)}</p>
                  <code>{ticket.code}</code>
                  <p className="muted">
                    {ticket.orderId ? t('Pedido nº {orderId} · ', { orderId: ticket.orderId }) : ''}
                    {ticket.usedAt
                      ? t('Entrada registrada na portaria em {v1}.', { v1: horaBrasilia(ticket.usedAt) })
                      : t('Pagamento simulado. Mostre este código na portaria do evento (simulação).')}
                  </p>
                  {ticket.statusCode === 'A' && ticket.inResale && (
                    <p className="info-note">
                      {t('Anunciado para revenda ou com convite de transferência pendente.')}{' '}
                      <Link to="/repasses">{t('Gerenciar repasse')}</Link>
                    </p>
                  )}
                  {ticket.statusCode === 'A' && !ticket.inResale && (
                    <div className="actions">
                      <button
                        type="button"
                        className={`button ${ticket.availableForExchange ? 'outline' : 'blue-button'}`}
                        disabled={saving}
                        onClick={() => perform(
                          () => setTicketExchangeListing(ticket.id, userId, !ticket.availableForExchange),
                          ticket.availableForExchange
                            ? 'Ingresso removido das ofertas de troca.'
                            : 'Ingresso anunciado para troca.',
                        )}
                      >
                        {ticket.availableForExchange ? t('Retirar da troca') : t('Oferecer para troca')}
                      </button>
                      {ticket.cancellable && (
                        <button
                          type="button"
                          className="button danger-outline"
                          disabled={saving}
                          title={ticket.refundOnCancel
                            ? t('Cancela o ingresso e estorna {v1} (simulação).', { v1: money(ticket.price) })
                            : t('Cancela o ingresso sem estorno: ele veio de troca, revenda ou transferência.')}
                          onClick={() => perform(
                            () => cancelParticipantTicket(ticket.id, userId),
                            ticket.refundOnCancel
                              ? `Ingresso cancelado e estorno de ${money(ticket.price)} registrado (simulação).`
                              : 'Ingresso cancelado. Como ele veio de troca, revenda ou transferência, não há estorno.',
                          )}
                        >
                          {ticket.refundOnCancel ? t('Cancelar e estornar') : t('Cancelar ingresso')}
                        </button>
                      )}
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ) : !loading && (
            <Empty title={t('Você ainda não tem ingressos')}>
              {t('Escolha um evento publicado e faça uma compra simulada. Nenhum pagamento será processado.')}
            </Empty>
          )}
        </section>

        <section aria-labelledby="ticket-exchange-heading" className="ticket-exchange-section">
          <h2 id="ticket-exchange-heading">{t('Ingressos disponíveis para troca')}</h2>
          <p className="muted">{t('Escolha um dos seus ingressos ativos para propor uma troca direta. Não há pagamentos ou cobranças.')}</p>
          {listings.length ? (
            <div className="cards-three">
              {listings.map((listing) => (
                <Panel key={listing.ticketId}>
                  <img className="supplier-cover" src={listing.image} alt={listing.eventTitle} />
                  <Badge>{t('Oferta de')} {listing.ownerName}</Badge>
                  <h3>{listing.eventTitle}</h3>
                  <p>{listing.eventDate} · {listing.location}</p>
                  <p>{listing.type} · {money(listing.price)}</p>
                  <code>{listing.code}</code>
                  {offerableTickets.length ? (
                    <>
                      <label htmlFor={`ticket-offer-${listing.ticketId}`}>{t('Seu ingresso para oferecer')}</label>
                      <select
                        id={`ticket-offer-${listing.ticketId}`}
                        value={selectedOfferTickets[listing.ticketId] || ''}
                        onChange={(event) => setSelectedOfferTickets((current) => ({
                          ...current,
                          [listing.ticketId]: event.target.value,
                        }))}
                      >
                        <option value="">{t('Selecione um ingresso ativo')}</option>
                        {offerableTickets.map((ticket) => (
                          <option key={ticket.id} value={ticket.id}>
                            {ticket.eventTitle} · {ticket.type} ({ticket.code})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button blue-button"
                        disabled={saving || !selectedOfferTickets[listing.ticketId]}
                        onClick={() => perform(
                          () => createExchangeOffer(
                            userId,
                            listing.ticketId,
                            Number(selectedOfferTickets[listing.ticketId]),
                          ),
                          'Solicitação de troca enviada ao usuário.',
                        )}
                      >
                        {t('Propor troca')}
                      </button>
                    </>
                  ) : (
                    <p className="muted">{t('Você precisa ter um ingresso ativo para propor uma troca.')}</p>
                  )}
                </Panel>
              ))}
            </div>
          ) : !loading && <Empty title={t('Nenhuma oferta de troca disponível')} />}
        </section>

        <section aria-labelledby="ticket-exchange-offers-heading" className="ticket-exchange-section">
          <h2 id="ticket-exchange-offers-heading">{t('Solicitações de troca')}</h2>
          {offers.length ? (
            <div className="cards-two">
              {offers.map((offer) => (
                <Panel key={offer.id}>
                  <Badge tone={offer.status === 'Pendente' ? 'amber' : 'gray'}>{offer.status}</Badge>
                  <h3>{offer.direction === 'recebida' ? t('Proposta recebida') : t('Proposta enviada')}</h3>
                  <p>
                    {offer.direction === 'recebida'
                      ? t('{requesterName} oferece {offeredEventTitle} ({offeredType}) pelo seu ingresso de {requestedEventTitle} ({requestedType}).', { requesterName: offer.requesterName, offeredEventTitle: offer.offeredEventTitle, offeredType: offer.offeredType, requestedEventTitle: offer.requestedEventTitle, requestedType: offer.requestedType })
                      : t('Você ofereceu {offeredEventTitle} ({offeredType}) pelo ingresso de {requesterName} em {requestedEventTitle} ({requestedType}).', { offeredEventTitle: offer.offeredEventTitle, offeredType: offer.offeredType, requesterName: offer.requesterName, requestedEventTitle: offer.requestedEventTitle, requestedType: offer.requestedType })}
                  </p>
                  <small className="muted">{t('Solicitação')} {offer.date}</small>
                  {offer.status === 'Pendente' && (
                    <div className="actions">
                      {offer.direction === 'recebida' ? (
                        <>
                          <button
                            type="button"
                            className="button outline"
                            disabled={saving}
                            onClick={() => perform(
                              () => updateExchangeOffer(offer.id, userId, 'recusar'),
                              'Solicitação de troca recusada.',
                            )}
                          >
                            {t('Recusar')}
                          </button>
                          <button
                            type="button"
                            className="button blue-button"
                            disabled={saving}
                            onClick={() => perform(
                              () => updateExchangeOffer(offer.id, userId, 'aceitar'),
                              'Troca concluída. Os ingressos foram transferidos entre as contas.',
                            )}
                          >
                            {t('Aceitar troca')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="button outline"
                          disabled={saving}
                          onClick={() => perform(
                            () => updateExchangeOffer(offer.id, userId, 'cancelar'),
                            'Solicitação de troca cancelada.',
                          )}
                        >
                          {t('Cancelar solicitação')}
                        </button>
                      )}
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ) : !loading && <Empty title={t('Nenhuma solicitação de troca')} />}
        </section>
      </div>
    );
  }

  return (
    <div className="workspace">
      <PageTitle title={t('Meus Ingressos')} subtitle={t('Acompanhe as reservas feitas na demonstração.')}>
        <Link className="button primary" to="/eventos">
          {t('Explorar eventos')}
        </Link>
      </PageTitle>
      <div className="cards-three">
        {data.tickets.map((ticket) => (
          <Panel key={ticket.id}>
            <img className="supplier-cover" src={ticket.image} alt={ticket.title} />
            <Badge>{t(ticket.status)}</Badge>
            <h2>{ticket.title}</h2>
            <code>{ticket.id}</code>
            <p>
              {ticket.quantity} × {ticket.type} · {money(ticket.total)}
            </p>
            <p className="muted">{t('SEM VALIDADE PARA ENTRADA')}</p>
            <div className="actions">
              <Link className="button outline" to={`/eventos/${ticket.eventId}`}>
                {t('Ver evento')}
              </Link>
              <button
                className="button danger-outline"
                disabled={ticket.status === 'Cancelado'}
                onClick={() => {
                  update('tickets', (old) =>
                    old.map((tk) => (tk.id === ticket.id ? { ...tk, status: 'Cancelado' } : tk)),
                  );
                  notify('Reserva de demonstração cancelada.');
                }}
              >
                {t('Cancelar reserva')}
              </button>
            </div>
          </Panel>
        ))}
      </div>
      {!data.tickets.length && (
        <Empty title={t('Sua próxima experiência começa aqui')}>
          {t('Explore os eventos e simule uma reserva para vê-la nesta página.')}
        </Empty>
      )}
    </div>
  );
}
export function Community() {
  const { data, update, notify, isAuthenticated, role } = useStore();
  const [message, setMessage] = useState('');
  const [accountMessages, setAccountMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const userId = Number(data.profile?.id);
  const isParticipantAccount =
    isAuthenticated && role === 'comprador' && Number.isSafeInteger(userId) && userId > 0;

  const loadAccountMessages = useCallback((signal) => {
    if (!isParticipantAccount) return;
    setLoadingMessages(true);
    setMessagesError('');
    getCommunityMessages(userId, signal)
      .then(setAccountMessages)
      .catch((error) => {
        if (error.name !== 'AbortError') setMessagesError(error.message);
      })
      .finally(() => {
        if (!signal?.aborted) setLoadingMessages(false);
      });
  }, [isParticipantAccount, userId]);

  useEffect(() => {
    if (!isParticipantAccount) return undefined;
    const controller = new AbortController();
    loadAccountMessages(controller.signal);
    return () => controller.abort();
  }, [isParticipantAccount, loadAccountMessages]);

  if (isAuthenticated && !isParticipantAccount) {
    return (
      <div className="workspace narrow">
        <PageTitle
          title={t('Troca-Papo')}
          subtitle={t('Um espaço para compartilhar suas próximas experiências.')}
        />
        <Empty title={t('Área disponível para usuários')}>
          {t('Entre com uma conta de usuário para publicar e consultar mensagens do Troca-Papo.')}
        </Empty>
      </div>
    );
  }

  async function submitMessage(event) {
    event.preventDefault();
    const text = message.trim();
    if (!text || submitting) return;
    if (isParticipantAccount) {
      setSubmitting(true);
      setMessagesError('');
      try {
        const created = await createCommunityMessage(userId, text);
        setAccountMessages((current) => [created, ...current].slice(0, 100));
        setMessage('');
        notify('Mensagem publicada.');
      } catch (error) {
        setMessagesError(error.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    update('messages', (old) => [
      { id: crypto.randomUUID(), text, name: data.profile.name },
      ...old,
    ]);
    setMessage('');
    notify('Mensagem adicionada à demonstração local.');
  }

  async function removeMessage(messageId) {
    if (!isParticipantAccount) {
      update('messages', (old) => old.filter((item) => item.id !== messageId));
      return;
    }
    try {
      await deleteCommunityMessage(messageId, userId);
      setAccountMessages((old) => old.filter((item) => item.id !== messageId));
      notify('Mensagem removida.');
    } catch (error) {
      setMessagesError(error.message);
    }
  }

  const messages = isParticipantAccount ? accountMessages : data.messages;
  return (
    <div className="workspace narrow">
      <PageTitle
        title={t('Troca-Papo')}
        subtitle={t('Um espaço para compartilhar suas próximas experiências.')}
      />
      <Panel title={t('O que você está planejando?')}>
        <form onSubmit={submitMessage}>
          <textarea
            aria-label={t('Sua mensagem')}
            required
            maxLength={500}
            rows={4}
            placeholder={t('Conte qual evento você quer conhecer…')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="form-footer">
            <small className="muted">
              {isParticipantAccount
                ? t('Visível para os usuários cadastrados.')
                : t('Visível apenas neste navegador.')}
            </small>
            <button className="button primary" disabled={submitting}>
              {submitting ? t('Publicando…') : isParticipantAccount ? t('Publicar mensagem') : t('Publicar na demo')}
            </button>
          </div>
        </form>
      </Panel>
      {messagesError && (
        <div className="form-error" role="alert">
          {messagesError}
          {isParticipantAccount && (
            <button className="plain-button" onClick={() => loadAccountMessages()}>
              {t('Tentar novamente')}
            </button>
          )}
        </div>
      )}
      {loadingMessages && <p className="muted" role="status">{t('Carregando mensagens…')}</p>}
      {!loadingMessages && !messagesError && messages.length === 0 && (
        <Empty title={t('Nenhuma mensagem por enquanto')}>{t('Compartilhe o que você está planejando.')}</Empty>
      )}
      {messages.map((m) => (
        <Panel key={m.id}>
          <h3>{m.name}</h3>
          <p>{m.text}</p>
          {(!isParticipantAccount || Number(m.userId) === userId) && (
            <button
              className="plain-button text-danger"
              onClick={() => removeMessage(m.id)}
            >
              {t('Remover mensagem')}
            </button>
          )}
        </Panel>
      ))}
      <Panel>
        <Badge>{t('Boas-vindas')}</Badge>
        <h2>{t('Viva a próxima experiência')}</h2>
        <p>{t('Salve seus eventos favoritos, explore as áreas e teste os fluxos do TrocaTicket.')}</p>
      </Panel>
    </div>
  );
}
