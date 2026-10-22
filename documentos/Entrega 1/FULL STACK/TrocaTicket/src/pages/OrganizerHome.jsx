import React, { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/Store';
import { latestSuppliers, suppliers } from '../data/demo';
import { Empty, Modal, Tabs } from '../components/UI';
import Pagination from '../components/Pagination';
import { Icon } from '../components/Icons';

const FINALIZED_THIS_YEAR = 42; // sem eventos finalizados nos dados de demonstração
const PAGE_SIZE = 3;
const STATUS_CLASS = {
  Confirmado: 'green',
  Publicado: 'green',
  'Em andamento': 'orange',
  Agendado: 'blue',
  Rascunho: 'gray',
  Cancelado: 'red',
};
const CATEGORY_CLASS = {
  Corporativo: 'blue',
  'Show / Cultura': 'purple',
  Workshop: 'teal',
  Social: 'pink',
};
const CHIP_TONES = ['blue', 'amber', 'purple'];
const VIEWS = ['Grade', 'Lista', 'Calendário'];
const STATUS_FILTERS = ['Todos', 'Confirmado', 'Em andamento', 'Agendado', 'Rascunho', 'Publicado'];

const parse = (iso) => new Date(`${iso}T12:00:00`);
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const monthName = (iso) => capitalize(parse(iso).toLocaleDateString('pt-BR', { month: 'long' }));
const shortMonth = (key) =>
  capitalize(parse(`${key}-01`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''));
function rangeLabel(event) {
  const start = parse(event.date);
  const end = parse(event.endDate || event.date);
  const sameDay = event.date === (event.endDate || event.date);
  const days = sameDay ? `${start.getDate()}` : `${start.getDate()} a ${end.getDate()}`;
  return `${days} ${monthName(event.date)}, ${start.getFullYear()} • ${event.time}`;
}
// Situação dos fornecedores do evento, a partir da lista de demonstração.
function organization(event) {
  if (event.status === 'Cancelado') return { label: 'Cancelado', tone: 'red' };
  if (event.status === 'Rascunho') return { label: 'Rascunho', tone: 'gray' };
  const linked = suppliers.filter((s) => event.suppliers.includes(s.id));
  return linked.every((s) => s.status === 'Confirmado')
    ? { label: '100% Organizado', tone: 'green' }
    : { label: 'Pendente Contrato', tone: 'amber' };
}

export default function OrganizerHome({ list = false }) {
  const { data, notify } = useStore();
  const events = data.events;
  const upcoming = events.filter((e) => e.status !== 'Cancelado').length;
  const confirmed = events.filter((e) => ['Confirmado', 'Publicado'].includes(e.status)).length;
  const pending = events.filter(
    (e) => !['Confirmado', 'Publicado', 'Cancelado'].includes(e.status),
  ).length;
  const stats = [
    {
      label: 'Próximos',
      value: upcoming,
      note: 'eventos cadastrados',
      tone: 'blue',
      icon: 'calendar',
    },
    {
      label: 'Confirmados',
      value: confirmed,
      note: `${upcoming ? Math.round((confirmed / upcoming) * 100) : 0}% taxa`,
      tone: 'green',
      icon: 'check',
    },
    { label: 'Pendências', value: pending, note: 'Requer ação', tone: 'amber', icon: 'clock' },
    {
      label: 'Finalizados',
      value: FINALIZED_THIS_YEAR,
      note: 'Ano 2026',
      tone: 'gray',
      icon: 'check',
    },
  ];

  return (
    <div className="workspace organizer-home">
      <div className="dashboard-layout">
        <div>
          <div className="oh-stats">
            {stats.map((stat) => (
              <div className="oh-stat" key={stat.label}>
                <div>
                  <span>{stat.label}</span>
                  <i className={stat.tone}>
                    <Icon name={stat.icon} size={18} />
                  </i>
                </div>
                <strong>
                  {stat.value} <small className={stat.tone}>{stat.note}</small>
                </strong>
              </div>
            ))}
          </div>
          <MyEvents events={events} list={list} />
          <MonthEvents events={events} />
        </div>
        <aside>
          <section className="oh-card oh-suppliers" aria-labelledby="oh-suppliers-title">
            <header>
              <div>
                <h2 id="oh-suppliers-title">Últimos Fornecedores</h2>
                <p>Contratos recentes e contatos rápidos</p>
              </div>
              <Link className="text-link" to="/organizador/fornecedores">
                Gerenciar todos
              </Link>
            </header>
            <ul>
              {latestSuppliers.map((s) => (
                <li key={s.id}>
                  <img src={s.image} alt="" />
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.category}</span>
                    <em className={s.tone}>
                      <i aria-hidden="true" />
                      {s.status}
                    </em>
                  </div>
                  <button
                    type="button"
                    aria-label={`Conversar com ${s.name}`}
                    onClick={() =>
                      notify(`Conversa com ${s.name} disponível quando o chat for conectado.`)
                    }
                  >
                    <Icon name="chat" size={18} />
                  </button>
                  <Link to="/organizador/fornecedores" aria-label={`Mais ações para ${s.name}`}>
                    <Icon name="dots" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="oh-invite"
              onClick={() =>
                notify('Convites por e-mail ficam disponíveis quando o backend for conectado.')
              }
            >
              <Icon name="user-plus" size={18} /> Convidar Novo Fornecedor
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

// Faixa horizontal com os eventos do organizador (grade completa na página "Meus Eventos").
function MyEvents({ events, list }) {
  const track = useRef(null);
  const [menu, setMenu] = useState(null);
  const scroll = (direction) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.8,
      behavior: 'smooth',
    });
  return (
    <section className="oh-section" aria-labelledby="oh-mine">
      <div className="oh-section-head">
        <h2 id="oh-mine">
          {list ? 'Todos os Eventos' : 'Meus Eventos'}{' '}
          <span className="oh-badge">Painel Ativo</span>
        </h2>
        {!list && (
          <div className="oh-arrows">
            <button type="button" aria-label="Eventos anteriores" onClick={() => scroll(-1)}>
              <Icon name="chevron-left" />
            </button>
            <button type="button" aria-label="Próximos eventos" onClick={() => scroll(1)}>
              <Icon name="chevron-right" />
            </button>
          </div>
        )}
      </div>
      <div
        className={`oh-track ${list ? 'is-grid' : ''}`}
        ref={track}
        tabIndex={list ? undefined : 0}
        role={list ? undefined : 'region'}
        aria-label={list ? undefined : 'Meus eventos (role para o lado)'}
      >
        {events.map((event) => (
          <article className="oh-event" key={event.id}>
            <div className="oh-event-image">
              <img src={event.image} alt="" loading="lazy" />
              <span className={`oh-status ${STATUS_CLASS[event.status] || 'blue'}`}>
                {event.status}
              </span>
              <div className="oh-menu" onKeyDown={(e) => e.key === 'Escape' && setMenu(null)}>
                <button
                  type="button"
                  aria-label={`Mais ações: ${event.title}`}
                  aria-expanded={menu === event.id}
                  onClick={() => setMenu(menu === event.id ? null : event.id)}
                >
                  <Icon name="dots" size={18} />
                </button>
                {menu === event.id && (
                  <div className="oh-menu-list">
                    <Link to={`/organizador/eventos/${event.id}/editar`}>Editar evento</Link>
                    <Link to={`/organizador/eventos/${event.id}/consolidar`}>
                      Consolidar fornecedores
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="oh-event-body">
              <p className={`oh-category ${CATEGORY_CLASS[event.category] || 'blue'}`}>
                {event.category}
              </p>
              <h3>{event.title}</h3>
              <p className="oh-meta">
                <Icon name="calendar" size={16} /> {rangeLabel(event)}
              </p>
              <p className="oh-meta">
                <Icon name="pin" size={16} /> {event.location}
              </p>
              <footer>
                <span>
                  Capacidade: <strong>{event.capacity.toLocaleString('pt-BR')}</strong>
                </span>
                <Link to={`/organizador/eventos/${event.id}/consolidar`}>Detalhes →</Link>
              </footer>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Eventos de um mês, em grade, lista ou calendário.
function MonthEvents({ events }) {
  const months = [...new Set(events.map((e) => e.date.slice(0, 7)))].sort();
  const [month, setMonth] = useState(months[0]);
  const [view, setView] = useState('Grade');
  const [status, setStatus] = useState('Todos');
  const [filters, setFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const activeMonth = months.includes(month) ? month : months[0];
  const inMonth = events
    .filter((e) => e.date.startsWith(activeMonth) && (status === 'Todos' || e.status === status))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const pages = Math.max(1, Math.ceil(inMonth.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = inMonth.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const year = activeMonth.slice(0, 4);

  return (
    <section className="oh-card oh-month" aria-labelledby="oh-month-title">
      <header className="oh-month-head">
        <div>
          <h2 id="oh-month-title">
            Eventos em {shortMonth(activeMonth)}/{year}{' '}
            <span className="oh-badge gray">{inMonth.length} cadastrados</span>
          </h2>
          <p>Filtrados por cronograma mensal e disponibilidade de fornecedores</p>
        </div>
        <div className="oh-month-tools">
          <Tabs
            label="Modo de exibição"
            options={VIEWS}
            value={view}
            onChange={(v) => {
              setView(v);
              setPage(1);
            }}
          />
          <select
            aria-label="Mês"
            value={activeMonth}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthName(`${m}-01`)} {m.slice(0, 4)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="oh-filter"
            aria-label="Filtrar por status"
            aria-expanded={filters}
            onClick={() => setFilters(!filters)}
          >
            <Icon name="filter" size={18} />
          </button>
        </div>
      </header>
      {filters && (
        <div className="oh-month-filters">
          <label>
            Status:
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!inMonth.length && <Empty>Nenhum evento neste período.</Empty>}

      {inMonth.length > 0 && view === 'Grade' && (
        <div className="oh-month-grid">
          {visible.map((event, i) => {
            const org = organization(event);
            return (
              <Link
                className="oh-month-card"
                key={event.id}
                to={`/organizador/eventos/${event.id}/editar`}
              >
                <div className="oh-month-top">
                  <span className={`oh-date ${CHIP_TONES[i % CHIP_TONES.length]}`}>
                    {String(parse(event.date).getDate()).padStart(2, '0')}{' '}
                    {shortMonth(event.date.slice(0, 7)).toUpperCase()}
                  </span>
                  <time>{event.time}</time>
                </div>
                <h3>{event.title}</h3>
                <p>
                  {event.location} • {event.capacity.toLocaleString('pt-BR')} lugares
                </p>
                <footer>
                  <em className={org.tone}>
                    <i aria-hidden="true" />
                    {org.label}
                  </em>
                  <span>{event.suppliers.length} fornecedores</span>
                </footer>
              </Link>
            );
          })}
        </div>
      )}

      {inMonth.length > 0 && view === 'Lista' && (
        <ul className="oh-month-list">
          {visible.map((event) => {
            const org = organization(event);
            return (
              <li key={event.id}>
                <time>
                  {String(parse(event.date).getDate()).padStart(2, '0')} · {event.time}
                </time>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.location}</span>
                </div>
                <em className={org.tone}>
                  <i aria-hidden="true" />
                  {org.label}
                </em>
                <Link to={`/organizador/eventos/${event.id}/editar`}>Editar →</Link>
              </li>
            );
          })}
        </ul>
      )}

      {inMonth.length > 0 && view === 'Calendário' && (
        <Calendar month={activeMonth} events={inMonth} onSelect={setSelected} />
      )}

      {view !== 'Calendário' && inMonth.length > 0 && (
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={inMonth.length}
          onPage={setPage}
          summary={(from, to) =>
            `Mostrando ${to - from + 1} de ${inMonth.length} eventos no período`
          }
        />
      )}

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p>
            {rangeLabel(selected)} · {selected.location}
          </p>
          <p className="muted">{selected.description}</p>
          <Link className="button dark" to={`/organizador/eventos/${selected.id}/editar`}>
            Editar evento
          </Link>
        </Modal>
      )}
    </section>
  );
}

function Calendar({ month, events, onSelect }) {
  const [year, number] = month.split('-').map(Number);
  const offset = new Date(year, number - 1, 1).getDay();
  const days = new Date(year, number, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div className="oh-calendar" role="grid" aria-label="Calendário do mês">
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
        <span className="oh-cal-head" role="columnheader" key={d}>
          {d}
        </span>
      ))}
      {cells.map((day, i) => (
        <div className="oh-cal-cell" role="gridcell" key={i} data-empty={day ? undefined : true}>
          {day && <b>{day}</b>}
          {day &&
            events
              .filter((e) => Number(e.date.slice(8, 10)) === day)
              .map((e) => (
                <button type="button" key={e.id} onClick={() => onSelect(e)}>
                  {e.title}
                </button>
              ))}
        </div>
      ))}
    </div>
  );
}
