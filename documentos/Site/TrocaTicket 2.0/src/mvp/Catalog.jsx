import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Empty, Field, PageTitle, Panel } from '../components/UI';
import { useStore } from '../context/StoreContext';
import { normalizeSearch } from '../services/rules';
import { useI18n } from '../i18n';
import { useSession } from './Session';
import { dateTime } from './api';
import ContasDemonstracao from './componentes/ContasDemonstracao';
import {
  AcademicNotice,
  EmptyList,
  MutationError,
  Price,
  QueryState,
  Status,
  useMutation,
  useQuery,
} from './shared';
export function EventCards({ events }) {
  const { t, locale } = useI18n();
  const { data, toggleFavorite } = useStore();
  return (
    <div className="organizer-grid">
      {events.map((event) => (
        <article className="event-card" key={event.id}>
          <div className="event-image">
            <img
              src={event.image || '/images/hero.jpg'}
              alt=""
              onError={(e) => {
                e.currentTarget.src = '/images/hero.jpg';
              }}
              loading="lazy"
            />
            <button
              className="mvp-favorite"
              aria-label={t('Salvar evento nos favoritos')}
              aria-pressed={data.favorites.includes(`mvp-${event.id}`)}
              onClick={() => toggleFavorite(`mvp-${event.id}`)}
            >
              {data.favorites.includes(`mvp-${event.id}`) ? '♥' : '♡'}
            </button>
          </div>
          <div className="event-info">
            <p className="event-meta">
              {dateTime(event.dateISO, locale)} • {event.venue}
            </p>
            <h3>
              <Link to={`/eventos/${event.id}`}>{event.title}</Link>
            </h3>
            <Status value={event.status} />
            <div className="event-bottom">
              <div>
                <small>{t('A partir de')}</small>
                <strong>
                  {event.priceCents == null ? (
                    t('Preço não informado')
                  ) : (
                    <Price value={event.priceCents} />
                  )}
                </strong>
              </div>
              <Link className="ticket-link" to={`/eventos/${event.id}`}>
                {t('Ver ingressos')}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
export function Catalog({ favorites = false, home = false }) {
  const { t } = useI18n();
  const state = useQuery('/eventos');
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const events = (state.data || []).filter(
    (e) =>
      normalizeSearch(e.title + ' ' + e.venue).includes(normalizeSearch(query)) &&
      (!category || e.category === category) &&
      (!city || e.venue === city) &&
      (!favorites || data.favorites.includes(`mvp-${e.id}`)),
  );
  return (
    <div className="workspace">
      <PageTitle
        as={home ? 'h2' : 'h1'}
        title={t(favorites ? 'Meus favoritos' : 'Encontre seu próximo evento')}
        subtitle={t('Eventos fictícios publicados pelos organizadores da demonstração.')}
      >
        <Link className="button outline" to="/ingressos">
          {t('Meus ingressos')}
        </Link>
      </PageTitle>
      {!home && (
        <Panel>
          <div className="filter-bar no-margin">
            <Field
              label={t('Buscar por evento ou local')}
              name="event-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Field label={t('Categoria')} name="event-category">
              <select
                id="event-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{t('Todas')}</option>
                {[...new Set((state.data || []).map((e) => e.category))]
                  .filter(Boolean)
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </Field>
            <Field label={t('Local')} name="event-city">
              <select id="event-city" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">{t('Todos')}</option>
                {[...new Set((state.data || []).map((e) => e.venue))]
                  .filter(Boolean)
                  .map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </Field>
            <button
              className="button outline"
              onClick={() => {
                setQuery('');
                setCity('');
                setCategory('');
              }}
            >
              {t('Limpar filtros')}
            </button>
          </div>
        </Panel>
      )}
      <QueryState state={state}>
        {events.length ? <EventCards events={home ? events.slice(0, 3) : events} /> : <EmptyList />}
      </QueryState>
    </div>
  );
}
export function Home() {
  const { t } = useI18n();
  return (
    <>
      <section className="hero mvp-home">
        <div className="hero-content">
          <p className="hero-badge">{t('Experiências e encontros no campus')}</p>
          <h1>{t('Compre e troque ingressos para seus eventos favoritos!')}</h1>
          <p className="hero-description">
            {t(
              'Explore eventos fictícios, acompanhe pedidos e transfira ingressos na demonstração acadêmica.',
            )}
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/eventos">
              {t('Explorar eventos')}
            </Link>
            <Link className="button secondary" to="/cadastro">
              {t('Criar conta')}
            </Link>
            <a className="button secondary" href="#contas-demonstracao">
              {t('Acesso para testes')}
            </a>
          </div>
        </div>
      </section>
      <ContasDemonstracao />
      <section className="section profiles">
        <div className="section-heading">
          <h2>{t('Como você quer usar o TrocaTicket?')}</h2>
        </div>
        <div className="grid">
          {[
            [
              'comprador',
              'Participante',
              'Compre na demonstração, acompanhe pedidos e transfira gratuitamente.',
            ],
            [
              'organizador',
              'Organizador',
              'Crie eventos, categorias e estoque; receba propostas e acompanhe o orçamento.',
            ],
            [
              'fornecedor',
              'Fornecedor',
              'Cadastre produtos e serviços e envie propostas aos organizadores.',
            ],
          ].map(([role, title, description]) => (
            <article className={`profile-card ${role}`} key={role}>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
              <Link className="button dark" to={`/cadastro?perfil=${role}`}>
                {t('Criar conta')}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <Catalog home />
    </>
  );
}
export function EventDetails() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { user } = useSession();
  const navigate = useNavigate();
  const event = useQuery(`/eventos/${id}`);
  const listings = useQuery(user ? `/anuncios?eventId=${id}` : null);
  const reviews = useQuery(`/eventos/${id}/avaliacoes`);
  const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [declaration, setDeclaration] = useState(false);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const action = useMutation((result) => {
    const orderId = result.orderId || (result.deliveryState ? result.id : null);
    if (orderId) navigate(`/pedidos/${orderId}`);
    else navigate('/pedidos');
  });
  const reviewAction = useMutation(() => {
    reviews.reload();
    setComment('');
  });
  const item = event.data;
  const category = item?.categories.find((c) => c.id === Number(selected)) || item?.categories[0];
  const canBuy = user?.approval === 'A';
  async function reserve(e) {
    e.preventDefault();
    if (!user) {
      navigate(`/entrar?voltar=/eventos/${id}`);
      return;
    }
    await action.run('/pedidos', {
      categoryId: category.id,
      quantity: Number(quantity),
      ...(category.kind === 'half' ? { halfDeclaration: declaration } : {}),
    });
  }
  return (
    <div className="workspace">
      <QueryState state={event}>
        {item && (
          <>
            <PageTitle
              title={item.title}
              subtitle={`${dateTime(item.dateISO, locale)} • ${item.venue}`}
            >
              <Status value={item.status} />
            </PageTitle>
            <div className="detail-layout">
              <div>
                <Panel>
                  <img className="mvp-event-cover" src={item.image || '/images/hero.jpg'} alt="" />
                  <h2>{t('Sobre o evento')}</h2>
                  <p className="mvp-preline">{item.description}</p>
                  <p>
                    {t('Categoria')}: {item.category}
                  </p>
                  <p>
                    {t('Capacidade')}: {item.capacity}
                  </p>
                </Panel>
                <Panel
                  title={t('Repasses disponíveis')}
                  subtitle={t('Fila estável por categoria, sem prioridade por preço.')}
                >
                  <QueryState state={listings}>
                    {listings.data?.length ? (
                      <div className="mvp-stack">
                        {listings.data.map((listing) => (
                          <div className="mvp-list-row" key={listing.id}>
                            <div>
                              <strong>{listing.categoryName}</strong>
                              <p>
                                <Price value={listing.priceCents} /> ·{' '}
                                <Status value={listing.status} />
                              </p>
                              <Link
                                className="text-link"
                                to={`/atendimentos?anuncio=${listing.id}`}
                              >
                                {t('Denunciar anúncio')}
                              </Link>
                            </div>
                            <button
                              className="button outline"
                              disabled={
                                action.busy ||
                                user?.id === listing.sellerId ||
                                listing.status !== 'active' ||
                                !canBuy
                              }
                              onClick={() => action.run(`/anuncios/${listing.id}/reservar`)}
                            >
                              {t(
                                user?.id === listing.sellerId
                                  ? 'Seu anúncio'
                                  : 'Reservar oportunidade',
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>{t('Nenhum repasse disponível no momento.')}</p>
                    )}
                  </QueryState>
                </Panel>
                <Panel
                  title={t('Avaliações')}
                  subtitle={t('Permitidas após o término, para quem utilizou um ingresso.')}
                >
                  <QueryState state={reviews}>
                    {reviews.data?.length ? (
                      reviews.data.map((review) => (
                        <article className="mvp-list-row" key={review.id}>
                          <div>
                            <strong>
                              {review.name} · {review.rating}/5
                            </strong>
                            <p>{review.comment}</p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p>{t('Ainda não há avaliações.')}</p>
                    )}
                  </QueryState>
                  {user && (
                    <form
                      className="mvp-stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        reviewAction.run(`/eventos/${id}/avaliacoes`, {
                          rating: Number(rating),
                          comment,
                        });
                      }}
                    >
                      <Field label={t('Nota')} name="rating">
                        <select
                          id="rating"
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t('Comentário')} name="review-comment">
                        <textarea
                          id="review-comment"
                          maxLength={500}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </Field>
                      <MutationError action={reviewAction} />
                      <button className="button outline" disabled={reviewAction.busy}>
                        {t('Enviar avaliação')}
                      </button>
                    </form>
                  )}
                </Panel>
              </div>
              <aside>
                <Panel title={t('Ingressos')}>
                  <AcademicNotice />
                  {item.categories?.length ? (
                    <form onSubmit={reserve} className="mvp-stack">
                      <Field label={t('Categoria do ingresso')} name="ticket-category">
                        <select
                          id="ticket-category"
                          value={category.id}
                          onChange={(e) => {
                            setSelected(e.target.value);
                            setDeclaration(false);
                          }}
                        >
                          {item.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} · {t(c.kind === 'half' ? 'Meia-entrada' : 'Inteira')}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <strong className="mvp-price">
                        <Price value={category.priceCents} />
                      </strong>
                      <p>
                        {t('Disponíveis')}: {category.available}
                      </p>
                      <Field
                        label={t('Quantidade')}
                        name="quantity"
                        type="number"
                        min="1"
                        max="4"
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                      {category.kind === 'half' && (
                        <label className="mvp-check">
                          <input
                            type="checkbox"
                            checked={declaration}
                            onChange={(e) => setDeclaration(e.target.checked)}
                            required
                          />
                          {t(
                            'Declaro elegibilidade fictícia para meia-entrada. Não envie comprovantes reais.',
                          )}
                        </label>
                      )}
                      <p>
                        {t('Taxas nesta demo')}: <Price value={0} />
                        <br />
                        {t('Total simulado')}:{' '}
                        <Price value={category.priceCents * Number(quantity)} />
                        <br />
                        {t('Cobrança real')}: <Price value={0} />
                      </p>
                      <button
                        className="button primary"
                        disabled={
                          action.busy ||
                          item.status !== 'published' ||
                          !category.salesOpen ||
                          category.available < 1 ||
                          (user && !canBuy)
                        }
                      >
                        {t('Reservar ingresso')}
                      </button>
                      <button
                        type="button"
                        className="button outline"
                        disabled={
                          !canBuy ||
                          action.busy ||
                          item.status !== 'published' ||
                          (category.kind === 'half' && !declaration)
                        }
                        onClick={() =>
                          action.run('/fila', {
                            eventId: item.id,
                            categoryId: category.id,
                            ...(category.kind === 'half' ? { halfDeclaration: declaration } : {}),
                          })
                        }
                      >
                        {t('Entrar na fila de repasse')}
                      </button>
                      <p className="muted">
                        {t(
                          'O servidor confirma estoque, capacidade, preço e limite da conta antes de reservar.',
                        )}
                      </p>
                    </form>
                  ) : (
                    <p>
                      {t(
                        'As categorias e os preços ainda não foram configurados. A compra está indisponível.',
                      )}
                    </p>
                  )}
                  <MutationError action={action} />
                  {!user && (
                    <Link className="text-link" to={`/entrar?voltar=/eventos/${id}`}>
                      {t('Entre para reservar e participar da fila.')}
                    </Link>
                  )}
                </Panel>
              </aside>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
