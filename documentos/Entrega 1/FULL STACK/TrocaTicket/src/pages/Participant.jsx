import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useEvents, LoadState } from '../components/Events';
import { useStore } from '../context/Store';
import { Badge, Empty, Modal, PageTitle, Panel, Tabs, money } from '../components/UI';

export function EventCard({ event }) {
  const { data, toggleFavorite } = useStore();
  const saved = data.favorites.includes(event.id);
  return (
    <article className="discovery-card">
      <div className="discovery-image">
        <img src={event.image} alt={event.imageAlt || event.title} loading="lazy" />
        <Badge tone="light">Ingresso demonstrativo</Badge>
        <button
          className={`favorite ${saved ? 'saved' : ''}`}
          aria-label={`${saved ? 'Remover dos' : 'Adicionar aos'} favoritos: ${event.title}`}
          aria-pressed={saved}
          onClick={() => toggleFavorite(event.id)}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="discovery-body">
        <h3>{event.title}</h3>
        <p>▦ {event.date}</p>
        <p>⌖ {event.location}</p>
        <div className="card-actions">
          <div>
            <small>A partir de</small>
            <strong>{money(event.price)}</strong>
          </div>
          <Link className="ticket-link" to={`/eventos/${event.id}`}>
            Ver opções →
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Catalog({ favorites = false }) {
  const state = useEvents();
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Todas');
  const published = data.events.filter((e) => e.status === 'Publicado');
  const all = [...state.events, ...published];
  const filtered = all.filter(
    (e) =>
      (!favorites || data.favorites.includes(e.id)) &&
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
              <EventCard event={e} key={e.id} />
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
                  <EventCard event={e} key={e.id} />
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
  const state = useEvents();
  const { data, update, notify, toggleFavorite } = useStore();
  const event = [...state.events, ...data.events].find((e) => e.id === id);
  const [tab, setTab] = useState('Sobre o evento');
  const [type, setType] = useState('Inteira');
  const [quantity, setQuantity] = useState(1);
  const [modal, setModal] = useState(false);
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
  function reserve() {
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
              data.favorites.includes(id)
                ? 'Evento removido dos favoritos.'
                : 'Evento salvo nos favoritos.',
            );
          }}
        >
          {data.favorites.includes(id) ? '♥ Salvo' : '♡ Salvar'}
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
              <strong className="stars">★★★★★</strong>
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
                  <p className="stars">★★★★★</p>
                  <p>“Uma experiência inesquecível!” — Participante de demonstração</p>
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
            <Badge>Reserva de demonstração</Badge>
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
              onChange={(e) => setQuantity(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
            />
            <div className="card-actions">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <button className="button primary full" onClick={() => setModal(true)}>
              Simular reserva →
            </button>
            <small className="muted">Sem cobrança. Ingressos sem validade para entrada.</small>
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
        <Modal title="Confirmar reserva de demonstração" onClose={() => setModal(false)}>
          <h3>{event.title}</h3>
          <p>
            {quantity} × {type} · <strong>{money(total)}</strong>
          </p>
          <p>
            Esta ação apenas adiciona um registro local. Não há compra, pagamento ou ingresso
            válido.
          </p>
          <button className="button primary full" onClick={reserve}>
            Confirmar simulação
          </button>
        </Modal>
      )}
    </div>
  );
}

export function Tickets() {
  const { data, update, notify } = useStore();
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
  const { data, update, notify } = useStore();
  const [message, setMessage] = useState('');
  return (
    <div className="workspace narrow">
      <PageTitle
        title="Comunidade TrocaTicket"
        subtitle="Um espaço para compartilhar suas próximas experiências."
      />
      <Panel title="O que você está planejando?">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!message.trim()) return;
            update('messages', (old) => [
              { id: crypto.randomUUID(), text: message.trim(), name: data.profile.name },
              ...old,
            ]);
            setMessage('');
            notify('Mensagem adicionada à demonstração local.');
          }}
        >
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
            <small className="muted">Visível apenas neste navegador.</small>
            <button className="button primary">Publicar na demo</button>
          </div>
        </form>
      </Panel>
      {data.messages.map((m) => (
        <Panel key={m.id}>
          <h3>{m.name}</h3>
          <p>{m.text}</p>
          <button
            className="plain-button text-danger"
            onClick={() => update('messages', (old) => old.filter((x) => x.id !== m.id))}
          >
            Remover mensagem
          </button>
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
