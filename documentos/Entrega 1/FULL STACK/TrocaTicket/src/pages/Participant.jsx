import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useEvents, LoadState } from '../components/Events';
import { useStore } from '../context/Store';
import { Badge, Empty, Modal, PageTitle, Panel, Tabs, money } from '../components/UI';
import EventCard from '../components/EventCard';
import { getEventReviews, saveEventReview } from '../services/events';
import { buySimulatedTickets } from '../services/tickets';
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
        <Badge>EXPERIÊNCIAS QUE CONECTAM PESSOAS</Badge>
        <h1>{favorites ? 'Seus favoritos' : 'EVENTOS'}</h1>
        <p>
          Explore festivais, grandes turnês e experiências ao vivo.
          <br />
          Encontre o seu próximo momento inesquecível.
        </p>
        <div className="discovery-search">
          <input
            type="search"
            aria-label="Buscar eventos"
            placeholder="Buscar por artista, festival ou cidade…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select aria-label="Cidade" value={city} onChange={(e) => setCity(e.target.value)}>
            <option>Todas</option>
            <option>São Paulo</option>
            <option>Rio de Janeiro</option>
          </select>
        </div>
      </div>
      <LoadState {...state} />
      {!state.loading && !state.error && (
        <>
          <PageTitle
            title={favorites ? 'Eventos salvos' : 'Recomendados para Você'}
            subtitle={`${filtered.length} eventos encontrados`}
          />
          <div className="discovery-grid">
            {filtered.slice(0, 4).map((e) => (
              <EventCardWrapper event={e} key={e.id}/>
            ))}
          </div>
          {filtered.length > 4 && (
            <>
              <PageTitle
                title="Mais experiências para descobrir"
                subtitle="Shows, cultura e encontros para todos os gostos."
              />
              <div className="discovery-grid">
                {filtered.slice(4).map((e) => (
                  <EventCardWrapper event={e} key={e.id}/>
                ))}
              </div>
            </>
          )}
          {!filtered.length && (
            <Empty title={favorites ? 'Você ainda não tem favoritos' : 'Nenhum evento encontrado'}>
              {favorites
                ? 'Toque no coração de um evento para encontrá-lo aqui.'
                : 'Experimente outro nome ou cidade.'}
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
        <Empty title="Evento não encontrado" />
        <Link className="button primary" to="/eventos">
          Voltar aos eventos
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
      name: data.profile?.name || 'Participante',
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
  async function reserve() {
    setReservationError('');
    if (canBuyTicket) {
      setReserving(true);
      try {
        await buySimulatedTickets(numericEventId, userId, type, quantity);
        setModal(false);
        notify('Compra simulada salva na sua conta. Nenhum pagamento foi processado.');
        navigate('/ingressos');
      } catch (error) {
        setReservationError(error.message);
      } finally {
        setReserving(false);
      }
      return;
    }
    if (isAuthenticated) {
      setReservationError('Entre com uma conta de participante para reservar este evento publicado.');
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
        <Link to="/eventos">Eventos</Link>
        <span>›</span>
        <span>{event.title}</span>
      </div>
      <PageTitle title={event.title} eyebrow="Eventos" subtitle={event.location}>
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
          {data.favorites.some((favoriteId) => String(favoriteId) === String(id)) ? '♥ Salvo' : '♡ Salvar'}
        </button>
        <Link className="button outline" to="/comunidade">
          Comunidade →
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
                <Badge>Experiência ao vivo</Badge>
                <h2>{event.location}</h2>
              </div>
            </div>
            <div className="card-actions">
              <span>Uma experiência para guardar na memória</span>
              <strong className="stars" aria-label={`${averageRating || 0} de 5 estrelas`}>
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
                    Encontre sua entrada, escolha o tipo de ingresso e acompanhe tudo em sua área de
                    participante.
                  </p>
                  <div className="info-note">
                    Os eventos, valores e avaliações deste protótipo são demonstrativos.
                  </div>
                </>
              ) : tab === 'Line-up & atrações' ? (
                <>
                  <h3>Programação do evento</h3>
                  <p>
                    Abertura dos portões, apresentações principais e experiências de gastronomia e
                    cultura.
                  </p>
                  <p className="muted">
                    A programação oficial será disponibilizada pelo organizador no serviço real.
                  </p>
                </>
              ) : tab === 'Como funciona' ? (
                <>
                  <h3>Escolha, reserve e acompanhe</h3>
                  <ol>
                    <li>Selecione o tipo de ingresso.</li>
                    <li>Confira quantidade e total.</li>
                    <li>Simule a reserva e consulte “Meus ingressos”.</li>
                  </ol>
                  <p>Nenhuma cobrança é feita.</p>
                </>
              ) : (
                <>
                  <h3>Avaliações da comunidade</h3>
                  {reviewsFromApi && (
                    <p className="muted">
                      Média {averageRating.toFixed(1)} de 5 · {reviewsFromApi.count} avaliações
                    </p>
                  )}
                  {reviewError && <p className="api-error" role="alert">{reviewError}</p>}
                  {!reviews.length && <p className="muted">Este evento ainda não recebeu avaliações.</p>}
                  <ul className="event-reviews">
                    {reviews.map((review) => (
                      <li key={review.id || `${review.userId || review.name}-${review.date}`}>
                        <strong>{review.name}</strong>
                        <span className="stars" aria-label={`${review.rating} de 5 estrelas`}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                        {review.comment && <p>{review.comment}</p>}
                        <small className="muted">{review.date}</small>
                      </li>
                    ))}
                  </ul>
                  {role === 'comprador' ? (
                    <form className="event-review-form" onSubmit={submitReview}>
                      <label htmlFor="event-review-rating">Sua nota</label>
                      <select id="event-review-rating" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>{value} estrelas</option>
                        ))}
                      </select>
                      <label htmlFor="event-review-comment">Comentário (opcional)</label>
                      <textarea
                        id="event-review-comment"
                        maxLength={255}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Compartilhe sua experiência…"
                      />
                      <small>{reviewComment.length}/255</small>
                      <button className="button blue-button" disabled={reviewSaving}>
                        {reviewSaving ? 'Salvando…' : 'Salvar avaliação'}
                      </button>
                    </form>
                  ) : (
                    <p className="muted">
                      <Link to="/entrar">Entre como participante</Link> para avaliar este evento.
                    </p>
                  )}
                  <Link className="text-link" to="/comunidade">
                    Participar da conversa →
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
                <Badge>Compra indisponível</Badge>
                <p className="muted">
                  {role !== 'comprador'
                    ? 'A reserva simulada está disponível somente para contas de participante.'
                    : 'Este evento não está conectado a um evento publicado do banco.'}
                </p>
              </>
            ) : (
              <>
                <Badge>{isAuthenticated ? 'Compra simulada' : 'Reserva de demonstração'}</Badge>
                <p className="muted">Ingressos a partir de</p>
                <div className="booking-price">{money(price)}</div>
                <label htmlFor="ticket-type">Selecione o tipo de entrada</label>
                <select id="ticket-type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option>Inteira</option>
                  <option>Meia-entrada</option>
                </select>
                <label htmlFor="ticket-quantity">Quantidade</label>
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
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
                <button
                  className="button primary full"
                  onClick={() => {
                    setReservationError('');
                    setModal(true);
                  }}
                >
                  {isAuthenticated ? 'Comprar ingresso →' : 'Simular reserva →'}
                </button>
                <small className="muted">
                  Sem pagamento real. O ingresso é válido apenas como registro da plataforma.
                </small>
              </>
            )}
            {reservationError && <p className="api-error" role="alert">{reservationError}</p>}
          </Panel>
          <Panel title="Detalhes e Localização">
            <p>▦ {event.date}</p>
            <p>⌖ {event.location}</p>
            <p className="muted">
              Consulte as regras e a classificação indicativa na programação oficial.
            </p>
            {id === 'lollapalooza' && (
              <img
                className="venue-map"
                src="/images/asset-33.jpg"
                alt="Mapa ilustrativo do local do festival"
              />
            )}
          </Panel>
          <Panel title="Comunidade & Fórum">
            <p>Encontre outras pessoas e compartilhe sua expectativa.</p>
            <Link className="button outline full" to="/comunidade">
              Acessar comunidade →
            </Link>
          </Panel>
        </aside>
      </div>
      {modal && (
        <Modal
          title={isAuthenticated ? 'Confirmar compra simulada' : 'Confirmar reserva de demonstração'}
          onClose={() => !reserving && setModal(false)}
        >
          <h3>{event.title}</h3>
          <p>
            {quantity} × {type} · <strong>{money(total)}</strong>
          </p>
          <p>
            {isAuthenticated
              ? 'Esta ação registra os ingressos na sua conta, sem processar pagamento. Eles não são válidos para entrada no evento.'
              : 'Esta ação salva uma reserva local de demonstração. Não há pagamento e o registro não é válido para entrada.'}
          </p>
          {reservationError && <p className="api-error" role="alert">{reservationError}</p>}
          <button className="button primary full" onClick={reserve} disabled={reserving}>
            {reserving ? 'Salvando…' : 'Confirmar compra simulada'}
          </button>
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
        <PageTitle title="Meus Ingressos" subtitle="Suas reservas vinculadas à conta." />
        <Empty title="Reservas ainda não disponíveis">
          Esta área está disponível para contas de participante.
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
          title="Meus Ingressos"
          subtitle="Gerencie seus ingressos simulados e combine trocas com outros participantes."
        >
          <Link className="button primary" to="/eventos">Explorar eventos</Link>
        </PageTitle>
        {error && (
          <div className="api-error" role="alert">
            <span>{error}</span>
            <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
              Tentar novamente
            </button>
          </div>
        )}
        {loading && <p role="status">Carregando ingressos e solicitações de troca…</p>}
        <section aria-labelledby="account-tickets-heading">
          <h2 id="account-tickets-heading">Ingressos da sua conta</h2>
          {tickets.length ? (
            <div className="cards-three">
              {tickets.map((ticket) => (
                <Panel key={ticket.id}>
                  <img className="supplier-cover" src={ticket.image} alt={ticket.eventTitle} />
                  <Badge tone={ticket.statusCode === 'A' ? 'green' : 'gray'}>{ticket.status}</Badge>
                  <h3>{ticket.eventTitle}</h3>
                  <p>{ticket.date} · {ticket.location}</p>
                  <p>{ticket.type} · {money(ticket.price)}</p>
                  <code>{ticket.code}</code>
                  <p className="muted">Compra simulada; sem pagamento e sem validade para entrada.</p>
                  {ticket.statusCode === 'A' && (
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
                        {ticket.availableForExchange ? 'Retirar da troca' : 'Oferecer para troca'}
                      </button>
                      <button
                        type="button"
                        className="button danger-outline"
                        disabled={saving}
                        onClick={() => perform(
                          () => cancelParticipantTicket(ticket.id, userId),
                          'Ingresso simulado cancelado.',
                        )}
                      >
                        Cancelar ingresso
                      </button>
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ) : !loading && (
            <Empty title="Você ainda não tem ingressos">
              Escolha um evento publicado e faça uma compra simulada. Nenhum pagamento será processado.
            </Empty>
          )}
        </section>

        <section aria-labelledby="ticket-exchange-heading" className="ticket-exchange-section">
          <h2 id="ticket-exchange-heading">Ingressos disponíveis para troca</h2>
          <p className="muted">Escolha um dos seus ingressos ativos para propor uma troca direta. Não há pagamentos ou cobranças.</p>
          {listings.length ? (
            <div className="cards-three">
              {listings.map((listing) => (
                <Panel key={listing.ticketId}>
                  <img className="supplier-cover" src={listing.image} alt={listing.eventTitle} />
                  <Badge>Oferta de {listing.ownerName}</Badge>
                  <h3>{listing.eventTitle}</h3>
                  <p>{listing.eventDate} · {listing.location}</p>
                  <p>{listing.type} · {money(listing.price)}</p>
                  <code>{listing.code}</code>
                  {offerableTickets.length ? (
                    <>
                      <label htmlFor={`ticket-offer-${listing.ticketId}`}>Seu ingresso para oferecer</label>
                      <select
                        id={`ticket-offer-${listing.ticketId}`}
                        value={selectedOfferTickets[listing.ticketId] || ''}
                        onChange={(event) => setSelectedOfferTickets((current) => ({
                          ...current,
                          [listing.ticketId]: event.target.value,
                        }))}
                      >
                        <option value="">Selecione um ingresso ativo</option>
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
                          'Solicitação de troca enviada ao participante.',
                        )}
                      >
                        Propor troca
                      </button>
                    </>
                  ) : (
                    <p className="muted">Você precisa ter um ingresso ativo para propor uma troca.</p>
                  )}
                </Panel>
              ))}
            </div>
          ) : !loading && <Empty title="Nenhuma oferta de troca disponível" />}
        </section>

        <section aria-labelledby="ticket-exchange-offers-heading" className="ticket-exchange-section">
          <h2 id="ticket-exchange-offers-heading">Solicitações de troca</h2>
          {offers.length ? (
            <div className="cards-two">
              {offers.map((offer) => (
                <Panel key={offer.id}>
                  <Badge tone={offer.status === 'Pendente' ? 'amber' : 'gray'}>{offer.status}</Badge>
                  <h3>{offer.direction === 'recebida' ? 'Proposta recebida' : 'Proposta enviada'}</h3>
                  <p>
                    {offer.direction === 'recebida'
                      ? `${offer.requesterName} oferece ${offer.offeredEventTitle} (${offer.offeredType}) pelo seu ingresso de ${offer.requestedEventTitle} (${offer.requestedType}).`
                      : `Você ofereceu ${offer.offeredEventTitle} (${offer.offeredType}) pelo ingresso de ${offer.requesterName} em ${offer.requestedEventTitle} (${offer.requestedType}).`}
                  </p>
                  <small className="muted">Solicitação {offer.date}</small>
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
                            Recusar
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
                            Aceitar troca
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
                          Cancelar solicitação
                        </button>
                      )}
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          ) : !loading && <Empty title="Nenhuma solicitação de troca" />}
        </section>
      </div>
    );
  }

  return (
    <div className="workspace">
      <PageTitle title="Meus Ingressos" subtitle="Acompanhe as reservas feitas na demonstração.">
        <Link className="button primary" to="/eventos">
          Explorar eventos
        </Link>
      </PageTitle>
      <div className="cards-three">
        {data.tickets.map((ticket) => (
          <Panel key={ticket.id}>
            <img className="supplier-cover" src={ticket.image} alt={ticket.title} />
            <Badge>{ticket.status}</Badge>
            <h2>{ticket.title}</h2>
            <code>{ticket.id}</code>
            <p>
              {ticket.quantity} × {ticket.type} · {money(ticket.total)}
            </p>
            <p className="muted">SEM VALIDADE PARA ENTRADA</p>
            <div className="actions">
              <Link className="button outline" to={`/eventos/${ticket.eventId}`}>
                Ver evento
              </Link>
              <button
                className="button danger-outline"
                disabled={ticket.status === 'Cancelado'}
                onClick={() => {
                  update('tickets', (old) =>
                    old.map((t) => (t.id === ticket.id ? { ...t, status: 'Cancelado' } : t)),
                  );
                  notify('Reserva de demonstração cancelada.');
                }}
              >
                Cancelar reserva
              </button>
            </div>
          </Panel>
        ))}
      </div>
      {!data.tickets.length && (
        <Empty title="Sua próxima experiência começa aqui">
          Explore os eventos e simule uma reserva para vê-la nesta página.
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
          title="Comunidade TrocaTicket"
          subtitle="Um espaço para compartilhar suas próximas experiências."
        />
        <Empty title="Área disponível para participantes">
          Entre com uma conta de participante para publicar e consultar mensagens da comunidade.
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
        title="Comunidade TrocaTicket"
        subtitle="Um espaço para compartilhar suas próximas experiências."
      />
      <Panel title="O que você está planejando?">
        <form onSubmit={submitMessage}>
          <textarea
            aria-label="Sua mensagem"
            required
            maxLength={500}
            rows={4}
            placeholder="Conte qual evento você quer conhecer…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="form-footer">
            <small className="muted">
              {isParticipantAccount
                ? 'Visível para os participantes cadastrados.'
                : 'Visível apenas neste navegador.'}
            </small>
            <button className="button primary" disabled={submitting}>
              {submitting ? 'Publicando…' : isParticipantAccount ? 'Publicar mensagem' : 'Publicar na demo'}
            </button>
          </div>
        </form>
      </Panel>
      {messagesError && (
        <div className="form-error" role="alert">
          {messagesError}
          {isParticipantAccount && (
            <button className="plain-button" onClick={() => loadAccountMessages()}>
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {loadingMessages && <p className="muted" role="status">Carregando mensagens…</p>}
      {!loadingMessages && !messagesError && messages.length === 0 && (
        <Empty title="Nenhuma mensagem por enquanto">Compartilhe o que você está planejando.</Empty>
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
              Remover mensagem
            </button>
          )}
        </Panel>
      ))}
      <Panel>
        <Badge>Boas-vindas</Badge>
        <h2>Viva a próxima experiência</h2>
        <p>Salve seus eventos favoritos, explore as áreas e teste os fluxos do TrocaTicket.</p>
      </Panel>
    </div>
  );
}
