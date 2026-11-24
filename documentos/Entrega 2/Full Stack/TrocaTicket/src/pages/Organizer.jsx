import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useStore } from '../context/Store';
import { suppliers } from '../data/demo';
import EventCard from '../../src/components/EventCard';
import {
  createEvent,
  getOrganizerEvents,
  getOrganizerProposals,
  getOrganizerSuppliers,
  getEventSuppliers,
  setEventSupplier,
  updateEvent,
  updateOrganizerProposal,
} from '../services/events';
import {
  Badge,
  Empty,
  Field,
  Modal,
  NotFound,
  PageTitle,
  Panel,
  Tabs,
  dateLabel,
  money,
  DownloadButton,
} from '../components/UI';


//comentario so pra merge

export function Organizer({ list = false }) {
  const { data, role, update, isAuthenticated } = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [view, setView] = useState('Grade');
  const [loadError, setLoadError] = useState('');
  const [reloadEvents, setReloadEvents] = useState(0);
  const organizerId = Number(data.profile?.id);
  const canLoadDatabaseEvents =
    role === 'organizador' && Number.isSafeInteger(organizerId) && organizerId > 0;

  useEffect(() => {
    if (!canLoadDatabaseEvents) return undefined;
    const controller = new AbortController();
    getOrganizerEvents(organizerId, controller.signal)
      .then((databaseEvents) => {
        update('events', databaseEvents);
        setLoadError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      });
    return () => controller.abort();
  }, [canLoadDatabaseEvents, organizerId, reloadEvents, update]);

  const events = data.events.filter(
    (e) =>
      e.title.toLowerCase().includes(query.toLowerCase()) &&
      (status === 'Todos' || e.status === status),
  );
  return (
    <div className="workspace">
      <PageTitle
        title={list ? 'Meus Eventos' : 'Vamos criar experiências memoráveis?'}
        subtitle="Seus eventos, parceiros e próximos passos em um só lugar."
      >
        <Link className="button blue-button" to="/organizador/novo">
          + Novo evento
        </Link>
      </PageTitle>
      {loadError && (
        <div className="api-error" role="alert">
          <span>Não foi possível carregar os eventos do banco: {loadError}</span>
          <button type="button" className="button outline tiny" onClick={() => setReloadEvents((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      <div className="dashboard-layout">
        <div>
          <div className="metrics">
            {[
              ['Próximos', data.events.length, 'Eventos cadastrados'],
              [
                'Confirmados',
                data.events.filter((e) => ['Confirmado', 'Publicado'].includes(e.status)).length,
                'Prontos para acontecer',
              ],
              [
                'Pendências',
                data.events.filter(
                  (e) => !['Confirmado', 'Publicado', 'Cancelado'].includes(e.status),
                ).length,
                'Requer atenção',
              ],
              ['Parceiros', isAuthenticated ? data.events.reduce((sum, event) => sum + (event.suppliers?.length || 0), 0) : suppliers.length, 'Rede de fornecedores'],
            ].map(([label, value, note]) => (
              <div className="metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="section-row">
            <h2>
              Meus Eventos <Badge>Painel ativo</Badge>
            </h2>
            <Tabs options={['Grade', 'Lista']} value={view} onChange={setView} />
          </div>
          <div className="filter-bar">
            <input
              aria-label="Buscar meus eventos"
              placeholder="Buscar evento…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Status do evento"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                'Todos',
                'Confirmado',
                'Em andamento',
                'Agendado',
                'Rascunho',
                'Publicado',
                'Cancelado',
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className={view === 'Grade' ? 'organizer-grid' : 'event-list'}>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  date: dateLabel(event.date),
                }}
                variant="organizer"
              />
            ))}
          </div>
          {!events.length && <Empty />}
          <Panel
            title="Agenda de eventos"
            subtitle="Acompanhe as próximas datas do seu planejamento."
          >
            <div className="agenda-grid">
              {data.events
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((event) => (
                  <Link
                    className="agenda-item"
                    key={event.id}
                    to={`/organizador/eventos/${event.id}/editar`}
                  >
                    <Badge>{dateLabel(event.date)}</Badge>
                    <h3>{event.title}</h3>
                    <p>{event.location}</p>
                    <small>{event.suppliers?.length || 0} fornecedores vinculados</small>
                  </Link>
                ))}
            </div>
          </Panel>
        </div>
        <aside>
          <Panel
            title={isAuthenticated ? 'Fornecedores cadastrados' : 'Últimos Fornecedores'}
            subtitle={isAuthenticated ? 'Vincule fornecedores reais aos seus eventos.' : 'Contratos recentes e contatos rápidos'}
            action={<Link className="text-link" to="/organizador/fornecedores">Ver todos</Link>}
          >
            {!isAuthenticated && suppliers.map((s) => (
              <Link className="supplier-row" to="/organizador/fornecedores" key={s.id}>
                <img src={s.image} alt="" />
                <div><strong>{s.name}</strong><small>{s.category}</small><Badge>{s.status}</Badge></div>
              </Link>
            ))}
            <Link className="button outline full" to="/organizador/fornecedores">
              Gerenciar fornecedores →
            </Link>
          </Panel>
          <div className="info-note">
            Tudo pronto para o próximo evento? Comece pelo planejamento e reúna seus fornecedores.
          </div>
        </aside>
      </div>
    </div>
  );
}

const today = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const blank = {
  title: '',
  category: 'Show / Cultura',
  format: 'Presencial',
  date: today(),
  endDate: today(),
  time: '16:00',
  endTime: '23:00',
  location: '',
  capacity: '',
  price: '0',
  description: '',
  image: '/images/asset-5.jpg',
  suppliers: [],
};
export function EventEditor() {
  const { id } = useParams();
  const { data, role, update, notify } = useStore();
  const navigate = useNavigate();
  const organizerId = Number(data.profile?.id);
  const existing = data.events.find((e) => String(e.id) === id);
  const [form, setForm] = useState(existing || blank);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventLoading, setEventLoading] = useState(
    () => Boolean(id && Number.isSafeInteger(Number(id)) && !existing && organizerId > 0),
  );
  const [eventLoadError, setEventLoadError] = useState('');
  const [eventReload, setEventReload] = useState(0);

  useEffect(() => {
    if (!id || !Number.isSafeInteger(Number(id)) || !organizerId || existing) return undefined;
    const controller = new AbortController();
    setEventLoading(true);
    setEventLoadError('');
    getOrganizerEvents(organizerId, controller.signal)
      .then((databaseEvents) => {
        update('events', databaseEvents);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setEventLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventLoading(false);
      });
    return () => controller.abort();
  }, [eventReload, existing, id, organizerId, update]);

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  if (id && !existing && eventLoading) {
    return <div className="workspace"><p role="status">Carregando evento…</p></div>;
  }
  if (id && !existing && eventLoadError) {
    return (
      <div className="workspace">
        <div className="api-error" role="alert">
          <span>Não foi possível carregar o evento: {eventLoadError}</span>
          <button type="button" className="button outline" onClick={() => {
            setEventLoadError('');
            setEventLoading(true);
            setEventReload((value) => value + 1);
          }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  if (id && !existing) return <NotFound title="Evento não encontrado" />;

  function field(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
    setErrors((old) => ({ ...old, [name]: undefined }));
  }
  async function save(consolidate) {
    if (saving) return;
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Informe um nome com pelo menos 3 caracteres.';
    if (!form.location.trim()) next.location = 'Informe o local ou link de acesso.';
    if (!form.date || !form.endDate || !form.time || !form.endTime || `${form.endDate}T${form.endTime}` <= `${form.date}T${form.time}`)
      next.endDate = 'O término deve ser posterior ao início.';
    if (form.capacity !== '' && (Number(form.capacity) < 1 || !Number.isInteger(Number(form.capacity))))
      next.capacity = 'Informe uma capacidade inteira maior que zero.';
    if (form.price === '' || !Number.isFinite(Number(form.price)) || Number(form.price) < 0)
      next.price = 'Informe um preço válido ou 0 para gratuito.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    const event = {
      ...form,
      id: existing?.id || id || crypto.randomUUID(),
      capacity: form.capacity === '' ? null : Number(form.capacity),
      price: Number(form.price),
      status: existing?.status || 'Rascunho',
      suppliers: existing?.suppliers || form.suppliers || [],
    };

    const canSaveToDatabase =
      role === 'organizador' && Number.isSafeInteger(organizerId) && organizerId > 0;
    if (canSaveToDatabase) {
      setSaving(true);
      try {
        const savedEvent =
          existing && Number.isSafeInteger(Number(existing.id))
            ? await updateEvent(existing.id, organizerId, event)
            : await createEvent(organizerId, event);
        const eventWithLocalDetails = {
          ...savedEvent,
          suppliers: existing?.suppliers || form.suppliers || [],
          confirmations: existing?.confirmations || [],
        };
        update('events', (current) => {
          const found = current.some((item) => String(item.id) === String(eventWithLocalDetails.id));
          return found
            ? current.map((item) =>
                String(item.id) === String(eventWithLocalDetails.id) ? eventWithLocalDetails : item,
              )
            : [...current, eventWithLocalDetails];
        });
        notify('Evento salvo no banco de dados.');
        navigate(`/organizador/eventos/${eventWithLocalDetails.id}/${consolidate ? 'consolidar' : 'editar'}`);
      } catch (error) {
        notify(error.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    update('events', (old) => (id ? old.map((e) => (e.id === id ? event : e)) : [...old, event]));
    notify(consolidate ? 'Evento salvo localmente. Agora você pode revisar os fornecedores e custos.' : 'Rascunho salvo neste navegador.');
    navigate(`/organizador/eventos/${event.id}/${consolidate ? 'consolidar' : 'editar'}`);
  }
  function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setErrors((old) => ({ ...old, image: 'Escolha JPG, PNG ou WEBP de até 2 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => field('image', reader.result);
    reader.readAsDataURL(file);
  }
  return (
    <div className="workspace event-editor-page">
      <PageTitle
        title={id ? 'Editar evento' : 'Criar evento'}
        subtitle="Cadastre o essencial agora. Você poderá revisar fornecedores e custos na próxima etapa."
      >
        <button type="button" className="button outline" onClick={() => setPreview(true)}>
          ◉ Pré-visualizar
        </button>
      </PageTitle>
      <div className="event-editor-hint"><span aria-hidden="true">✓</span> Eventos com uma conta de organizador são salvos no banco de dados; a demonstração usa este navegador. Campos com * são obrigatórios.</div>
      <form
        onSubmit={(e) => { e.preventDefault(); save(true); }}
        noValidate
      >
        <Panel>
          <div className="editor-layout event-editor-layout">
            <div className="event-editor-main">
              <section className="event-form-section">
                <div className="event-section-heading">
                  <span className="event-section-number">1</span>
                  <div><h2>Informações do evento</h2><p>Como o evento será apresentado aos participantes.</p></div>
                </div>
                <Field
                  label="Nome do evento *"
                  name="title"
                  placeholder="Ex.: Festival de Música de Verão"
                  value={form.title}
                  onChange={(e) => field('title', e.target.value)}
                  error={errors.title}
                />
                <div className="form-grid">
                  <Field label="Categoria *" name="category">
                    <select id="category" value={form.category} onChange={(e) => field('category', e.target.value)}>
                      {['Show / Cultura', 'Corporativo', 'Workshop', 'Gastronomia', 'Esporte', 'Feira / Exposição', 'Outro'].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Field>
                  <Field label="Formato *" name="format">
                    <select id="format" value={form.format} onChange={(e) => field('format', e.target.value)}>
                      {['Presencial', 'Online', 'Híbrido'].map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </Field>
                </div>
                <Field
                  label={form.format === 'Online' ? 'Link ou plataforma do evento *' : form.format === 'Híbrido' ? 'Local presencial ou link de acesso *' : 'Local do evento *'}
                  name="location"
                  placeholder={form.format === 'Presencial' ? 'Espaço, endereço, cidade e estado' : 'Endereço ou link para participação'}
                  value={form.location}
                  onChange={(e) => field('location', e.target.value)}
                  error={errors.location}
                />
              </section>
              <section className="event-form-section">
                <div className="event-section-heading">
                  <span className="event-section-number">2</span>
                  <div><h2>Data, horário e capacidade</h2><p>Ajude participantes e fornecedores a se planejarem.</p></div>
                </div>
                <div className="form-grid event-date-grid">
                  <Field label="Data de início *" name="date" type="date" value={form.date} onChange={(e) => field('date', e.target.value)} />
                  <Field label="Horário de início *" name="time" type="time" value={form.time} onChange={(e) => field('time', e.target.value)} />
                  <Field label="Data de término *" name="endDate" type="date" value={form.endDate} onChange={(e) => field('endDate', e.target.value)} error={errors.endDate} />
                  <Field label="Horário de término *" name="endTime" type="time" value={form.endTime} onChange={(e) => field('endTime', e.target.value)} />
                </div>
                <div className="form-grid">
                  <Field label="Público estimado" name="capacity" type="number" min="1" placeholder="Ex.: 500 pessoas" value={form.capacity} onChange={(e) => field('capacity', e.target.value)} error={errors.capacity} />
                  <Field label="Preço base do ingresso (R$) *" name="price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => field('price', e.target.value)} error={errors.price} />
                </div>
                <p className="event-field-note">Se o evento for gratuito, mantenha o preço em R$ 0,00. A capacidade é opcional e pode ser preenchida quando definida.</p>
              </section>
              <section className="event-form-section event-description-section">
                <div className="event-section-heading">
                  <span className="event-section-number">3</span>
                  <div><h2>Descrição</h2><p>Conte o que o público precisa saber.</p></div>
                </div>
                <Field label="Descrição do evento" name="description">
                  <textarea id="description" maxLength={1000} rows={4} placeholder="Descreva a programação, atrações e informações importantes..." value={form.description} onChange={(e) => field('description', e.target.value)} />
                </Field>
                <div className="event-character-count">{form.description.length}/1000 caracteres</div>
              </section>
            </div>
            <aside className="event-editor-side">
              <section className="event-form-section">
                <div className="event-section-heading">
                  <span className="event-section-number">4</span>
                  <div><h2>Imagem de capa</h2><p>Uma imagem ajuda a identificar seu evento.</p></div>
                </div>
                <label className="cover-upload event-cover-upload">
                  <img src={form.image} alt="Prévia da capa do evento" />
                  <span>↑ Escolher imagem de capa</span>
                  <small>JPG, PNG ou WEBP · máximo de 2 MB</small>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
                </label>
                {errors.image && <p className="field-error">{errors.image}</p>}
                <button type="button" className="button outline event-remove-cover" onClick={() => field('image', '/images/asset-5.jpg')}>Restaurar capa padrão</button>
              </section>
              <div className="event-next-step-card">
                <span className="event-next-step-icon">↗</span>
                <h3>Próxima etapa: fornecedores e custos</h3>
                <p>Depois de salvar, você poderá selecionar parceiros e revisar os valores estimados do evento.</p>
              </div>
            </aside>
          </div>
          <div className="form-footer event-editor-footer">
            <Link className="button outline" to="/organizador">Cancelar</Link>
            <button type="button" className="button outline" disabled={saving} onClick={() => save(false)}>{saving ? 'Salvando…' : 'Salvar rascunho'}</button>
            <button type="submit" className="button blue-button" disabled={saving}>{saving ? 'Salvando…' : 'Continuar para custos →'}</button>
          </div>
        </Panel>
      </form>
      {preview && (
        <Modal title="Prévia do evento" onClose={() => setPreview(false)}>
          <img className="modal-cover" src={form.image} alt="Capa do evento" />
          <p className="eyebrow purple">{form.category} · {form.format}</p>
          <h2>{form.title || 'Nome do evento'}</h2>
          <p>{form.description || 'A descrição do evento aparecerá aqui.'}</p>
          <p>{dateLabel(form.date)} · {form.time} · {form.location || 'Local a definir'}</p>
          <strong>{Number(form.price) === 0 ? 'Entrada gratuita' : `${money(form.price)} / ingresso`}</strong>
        </Modal>
      )}
    </div>
  );
}

export function Consolidation() {
  const { id } = useParams();
  const { data, role, update, notify } = useStore();
  const [modal, setModal] = useState(false);
  const event = data.events.find((item) => String(item.id) === id);
  const organizerId = Number(data.profile?.id);
  const isDatabaseEvent =
    role === 'organizador' &&
    Number.isSafeInteger(organizerId) &&
    organizerId > 0 &&
    Number.isSafeInteger(Number(id));
  const [databaseProposals, setDatabaseProposals] = useState([]);
  const [linkedSuppliers, setLinkedSuppliers] = useState([]);
  const [proposalError, setProposalError] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalRetry, setProposalRetry] = useState(0);
  const [eventLoading, setEventLoading] = useState(() => isDatabaseEvent && !event);
  const [eventLoadError, setEventLoadError] = useState('');
  const [eventRetry, setEventRetry] = useState(0);

  useEffect(() => {
    if (!isDatabaseEvent || event) return undefined;
    const controller = new AbortController();
    setEventLoading(true);
    setEventLoadError('');
    getOrganizerEvents(organizerId, controller.signal)
      .then((events) => {
        update('events', (current) => {
          const ids = new Set(events.map((item) => String(item.id)));
          return [...current.filter((item) => !ids.has(String(item.id))), ...events];
        });
        setEventLoadError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setEventLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setEventLoading(false);
      });
    return () => controller.abort();
  }, [event, eventRetry, isDatabaseEvent, organizerId, update]);

  useEffect(() => {
    if (!isDatabaseEvent) return undefined;
    const controller = new AbortController();
    setProposalLoading(true);
    getOrganizerProposals(organizerId, id, controller.signal)
      .then((proposals) => {
        setDatabaseProposals(proposals);
        setProposalError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setProposalError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProposalLoading(false);
      });
    return () => controller.abort();
  }, [id, isDatabaseEvent, organizerId, proposalRetry]);

  useEffect(() => {
    if (!isDatabaseEvent) return undefined;
    const controller = new AbortController();
    getEventSuppliers(organizerId, id, controller.signal)
      .then(setLinkedSuppliers)
      .catch((error) => {
        if (error.name !== 'AbortError') setProposalError(error.message);
      });
    return () => controller.abort();
  }, [id, isDatabaseEvent, organizerId]);

  if (!event) {
    if (eventLoading) return <div className="workspace"><p role="status">Carregando evento do banco de dados…</p></div>;
    if (eventLoadError) {
      return (
        <div className="workspace">
          <div className="api-error" role="alert">
            <span>Não foi possível carregar o evento: {eventLoadError}</span>
            <button type="button" className="button outline tiny" onClick={() => setEventRetry((value) => value + 1)}>
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return <NotFound title="Evento não encontrado" />;
  }

  const selected = suppliers.filter((supplier) => (event.suppliers || []).includes(supplier.id));
  const confirmations = event.confirmations || [];
  const pending = selected.filter(
    (supplier) => supplier.status === 'Pendente' && !confirmations.includes(supplier.id),
  );
  const databaseApproved = databaseProposals.filter((proposal) => proposal.status === 'Aprovada');
  const databasePending = databaseProposals.filter((proposal) => proposal.status === 'Em análise');
  const databaseResolved = databaseProposals.length - databasePending.length;
  const cents = (value) => Math.round(Number(value) * 100);
  const totalCents = isDatabaseEvent
    ? databaseApproved.reduce((sum, proposal) => sum + cents(proposal.total), 0)
    : selected.reduce((sum, supplier) => sum + cents(supplier.price), 0);
  const total = totalCents / 100;
  const pendingCount = isDatabaseEvent ? databasePending.length : pending.length;
  const partnerCount = isDatabaseEvent
    ? new Set([
        ...linkedSuppliers.map((supplier) => String(supplier.id)),
        ...databaseProposals.map((proposal) => String(proposal.supplierId)),
      ]).size
    : selected.length;
  const confirmedCount = isDatabaseEvent ? databaseApproved.length : selected.length - pending.length;
  const progress = isDatabaseEvent
    ? databaseProposals.length
      ? Math.round((databaseResolved / databaseProposals.length) * 100)
      : 0
    : selected.length
      ? Math.round(((selected.length - pending.length) / selected.length) * 100)
      : 0;
  const capacity = Number(event.capacity);
  const hasCapacity = Number.isSafeInteger(capacity) && capacity > 0;
  const estimatedRevenue = hasCapacity ? cents(capacity * Number(event.price)) / 100 : null;
  const estimatedResult = estimatedRevenue === null ? null : estimatedRevenue - total;
  const minimumTicketPrice = hasCapacity ? cents(total / capacity) / 100 : null;
  async function setProposalStatus(proposal, status) {
    try {
      await updateOrganizerProposal(organizerId, id, proposal.id, status);
      setDatabaseProposals((current) =>
        current.map((item) => (item.id === proposal.id ? { ...item, status } : item)),
      );
      setProposalError('');
      notify(status === 'Aprovada' ? 'Proposta aprovada.' : 'Proposta recusada.');
    } catch (error) {
      setProposalError(error.message);
    }
  }
  const change = async (values) => {
    const updatedEvent = { ...event, ...values };
    if (
      role === 'organizador' &&
      Number.isSafeInteger(organizerId) &&
      organizerId > 0 &&
      Number.isSafeInteger(Number(event.id))
    ) {
      try {
        const savedEvent = await updateEvent(event.id, organizerId, updatedEvent);
        Object.assign(updatedEvent, savedEvent, {
          suppliers: event.suppliers || [],
          confirmations: updatedEvent.confirmations || event.confirmations || [],
        });
      } catch (error) {
        notify(error.message);
        return false;
      }
    }
    update('events', (old) =>
      old.map((item) => (String(item.id) === id ? updatedEvent : item)),
    );
    return true;
  };
  const allEvents = data.events.filter((item) => item.status !== 'Cancelado');
  const isPublished = event.status === 'Publicado';
  const isCancelled = event.status === 'Cancelado';

  return (
    <div className="workspace consolidation-workspace">
      <PageTitle
        title="Consolidar evento"
        subtitle="Confira parceiros, orçamento e dados principais antes de publicar."
      >
        <DownloadButton
          name="custos-evento.csv"
          rows={[
            [event.title],
            ['Fornecedor', 'Valor', 'Status'],
            ...(isDatabaseEvent
              ? databaseProposals.map((proposal) => [proposal.supplierName, proposal.total, proposal.status])
              : selected.map((supplier) => [supplier.name, supplier.price, 'Confirmado'])),
            ['Total', total],
          ]}
        />
        <Link className="button outline" to={`/organizador/eventos/${id}/editar`}>
          Editar evento
        </Link>
      </PageTitle>

      <section className="consolidation-overview panel">
        <div className="consolidation-event-heading">
          <img src={event.image} alt="" />
          <div className="consolidation-event-copy">
            <div className="consolidation-tags">
              <Badge>{event.category}</Badge>
              <Badge>{event.format || 'Formato não definido'}</Badge>
            </div>
            <h2>{event.title}</h2>
            <p>{event.id} <span aria-hidden="true">·</span> {event.status}</p>
          </div>
        </div>
        <div className="consolidation-facts">
          <div><span>Data e horário</span><strong>{dateLabel(event.date)} · {event.time || 'A definir'}</strong></div>
          <div><span>Local</span><strong>{event.location || 'A definir'}</strong></div>
          <div><span>Capacidade</span><strong>{event.capacity ? `${event.capacity} pessoas` : 'Não definida'}</strong></div>
          <div><span>Custos de propostas aprovadas</span><strong>{money(total)}</strong></div>
        </div>
      </section>

      <div className="consolidation-main-grid">
        <section className="panel consolidation-partners">
          <div className="consolidation-section-heading">
            <div>
              <h2>{isDatabaseEvent ? 'Propostas recebidas' : 'Parceiros contratados'}</h2>
              <p>{partnerCount} {partnerCount === 1 ? 'fornecedor' : 'fornecedores'}</p>
            </div>
            <Link className="text-link" to={`/organizador/fornecedores?evento=${encodeURIComponent(id)}`}>Gerenciar</Link>
          </div>
          <div className="consolidation-status-summary">
            <div><strong>{confirmedCount}</strong><span>{isDatabaseEvent ? 'Aprovadas' : 'Confirmados'}</span></div>
            <div><strong>{pendingCount}</strong><span>Pendentes</span></div>
            <div><strong>{progress}%</strong><span>Concluído</span></div>
          </div>
          {proposalError && (
            <div className="api-error" role="alert">
              <span>{proposalError}</span>
              <button type="button" className="button outline tiny" onClick={() => setProposalRetry((value) => value + 1)}>
                Tentar novamente
              </button>
            </div>
          )}
          {proposalLoading && <p role="status">Carregando propostas recebidas…</p>}
          {isDatabaseEvent && linkedSuppliers.length > 0 && (
            <div className="consolidation-linked-suppliers">
              <h3>Fornecedores vinculados</h3>
              {linkedSuppliers.map((supplier) => (
                <div className="consolidation-linked-supplier" key={supplier.id}>
                  <span><strong>{supplier.name}</strong><small>{supplier.category || 'Categoria não informada'}</small></span>
                  <Badge tone="blue">Vinculado</Badge>
                </div>
              ))}
            </div>
          )}
          {isDatabaseEvent && !proposalLoading && databaseProposals.length ? (
            <div className="consolidation-partner-list">
              {databaseProposals.map((proposal) => (
                <div className="consolidation-partner" key={proposal.id}>
                  <div className="consolidation-partner-info">
                    <strong>{proposal.supplierName}</strong>
                    <span>{proposal.category || 'Categoria não informada'} · #{proposal.protocol || proposal.id}</span>
                    {proposal.items?.length > 0 && (
                      <small>{proposal.items.map((item) => `${item.qty} ${item.unit} ${item.name}`).join(' · ')}</small>
                    )}
                  </div>
                  <div className="consolidation-partner-end">
                    <strong>{money(proposal.total)}</strong>
                    {proposal.status === 'Em análise' ? (
                      <div className="actions">
                        <button className="button tiny outline" onClick={() => setProposalStatus(proposal, 'Não selecionada')}>
                          Recusar
                        </button>
                        <button className="button tiny blue-button" onClick={() => setProposalStatus(proposal, 'Aprovada')}>
                          Aprovar
                        </button>
                      </div>
                    ) : <Badge tone={proposal.status === 'Aprovada' ? 'green' : 'red'}>{proposal.status}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : !isDatabaseEvent && selected.length ? (
            <div className="consolidation-partner-list">
              {selected.map((supplier) => {
                const isPending = pending.some((item) => item.id === supplier.id);
                return (
                  <div className="consolidation-partner" key={supplier.id}>
                    <div className="consolidation-partner-info">
                      <strong>{supplier.name}</strong>
                      <span>{supplier.category}</span>
                    </div>
                    <div className="consolidation-partner-end">
                      <strong>{money(supplier.price)}</strong>
                      {isPending ? (
                        <button
                          className="button tiny outline"
                          onClick={() => {
                            change({ confirmations: [...confirmations, supplier.id] });
                            notify('Confirmação simulada registrada.');
                          }}
                        >Confirmar</button>
                      ) : <Badge>Confirmado</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title={isDatabaseEvent ? 'Nenhuma proposta recebida' : 'Nenhum parceiro vinculado'}>
              {isDatabaseEvent
                ? 'Fornecedores poderão enviar propostas quando o evento estiver publicado.'
                : 'Você pode adicionar fornecedores antes de publicar o evento.'}
            </Empty>
          )}
        </section>

        <section className="panel consolidation-readiness">
          <div className="consolidation-section-heading">
            <div>
              <h2>Resumo para publicação</h2>
              <p>Uma última conferência antes de disponibilizar o evento.</p>
            </div>
            <Badge tone={isPublished ? 'green' : isCancelled ? 'red' : pendingCount ? 'amber' : 'blue'}>
              {isCancelled ? 'Cancelado' : isPublished ? 'Publicado' : pendingCount ? 'Pendente' : 'Pronto para publicar'}
            </Badge>
          </div>
          <div className="consolidation-progress-label"><span>Etapa de consolidação</span><strong>{progress}%</strong></div>
          <progress value={progress} max="100" aria-label="Progresso da consolidação" />
          <div className="consolidation-budget">
            <div><span>Receita bruta estimada (lotação completa)</span><strong>{estimatedRevenue === null ? 'Defina a capacidade' : money(estimatedRevenue)}</strong></div>
            <div><span>Custos dos fornecedores</span><strong>{money(total)}</strong></div>
            <div><span>Preço mínimo por ingresso para cobrir fornecedores</span><strong>{minimumTicketPrice === null ? 'Defina a capacidade' : money(minimumTicketPrice)}</strong></div>
            <div className="consolidation-budget-total"><span>Saldo bruto estimado</span><strong>{estimatedResult === null ? 'Defina a capacidade' : money(estimatedResult)}</strong></div>
          </div>
          <p className="muted">Estimativa considera lotação completa e somente propostas aprovadas; não inclui impostos, taxas ou demais despesas.</p>
          <p className="consolidation-guidance">
            {pendingCount
              ? `${pendingCount} proposta${pendingCount === 1 ? '' : 's'} aguardam análise.`
              : isPublished
                ? isDatabaseEvent
                  ? 'Este evento já está publicado no catálogo.'
                  : 'Este evento já está publicado no catálogo da demonstração.'
                : 'Os dados e parceiros estão prontos para a publicação do evento.'}
          </p>
          <div className="consolidation-actions">
            <button className="button danger-outline" onClick={() => setModal(true)} disabled={isCancelled}>Cancelar evento</button>
            <button
              className="button blue-button"
              disabled={pendingCount > 0 || isPublished || isCancelled}
              onClick={async () => {
                if (await change({ status: 'Publicado' })) {
                  notify('Evento publicado no catálogo.');
                }
              }}
            >{isPublished ? 'Evento publicado' : 'Consolidar e publicar'}</button>
          </div>
        </section>
      </div>

      {allEvents.length > 1 && (
        <section className="consolidation-switcher">
          <div className="consolidation-section-heading">
            <div><h2>Outros eventos</h2><p>Troque de evento sem voltar ao painel.</p></div>
            <Link className="text-link" to="/organizador/eventos">Ver todos</Link>
          </div>
          <div className="consolidation-event-list">
            {allEvents.filter((item) => item.id !== id).map((item) => (
              <Link className="consolidation-event-option" key={item.id} to={`/organizador/eventos/${item.id}/consolidar`}>
                <span><strong>{item.title}</strong><small>{dateLabel(item.date)} · {item.location || 'Local a definir'}</small></span>
                <strong>{money(item.price || 0)}</strong>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {modal && (
        <Modal title="Cancelar este evento?" onClose={() => setModal(false)}>
          <p>O evento ficará marcado como cancelado. Você ainda poderá consultar os dados posteriormente.</p>
          <div className="actions">
            <button className="button outline" onClick={() => setModal(false)}>Voltar</button>
            <button className="button danger" onClick={async () => {
              if (await change({ status: 'Cancelado' })) {
                setModal(false);
                notify('Evento cancelado.');
              }
            }}>Confirmar cancelamento</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Suppliers() {
  const { data, role, isAuthenticated, update, notify } = useStore();
  const organizerId = Number(data.profile?.id);
  const databaseOrganizer = isAuthenticated && role === 'organizador' &&
    Number.isSafeInteger(organizerId) && organizerId > 0;
  const [searchParams, setSearchParams] = useSearchParams();
  const eventId = searchParams.get('evento') || '';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas as categorias');
  const [status, setStatus] = useState('Todos os status');
  const [selected, setSelected] = useState(null);
  const [databaseSuppliers, setDatabaseSuppliers] = useState([]);
  const [linkedSuppliers, setLinkedSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linkingId, setLinkingId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!databaseOrganizer) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    Promise.all([
      getOrganizerSuppliers(organizerId, controller.signal),
      getOrganizerEvents(organizerId, controller.signal),
    ])
      .then(([supplierRows, events]) => {
        setDatabaseSuppliers(supplierRows);
        update('events', events);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [databaseOrganizer, organizerId, retry, update]);

  useEffect(() => {
    if (!databaseOrganizer || !eventId) {
      setLinkedSuppliers([]);
      return undefined;
    }
    const controller = new AbortController();
    setLoadingLinks(true);
    getEventSuppliers(organizerId, eventId, controller.signal)
      .then(setLinkedSuppliers)
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingLinks(false);
      });
    return () => controller.abort();
  }, [databaseOrganizer, eventId, organizerId]);

  useEffect(() => {
    if (databaseOrganizer || eventId || !data.events.length) return;
    setSearchParams({ evento: String(data.events[0].id) }, { replace: true });
  }, [data.events, databaseOrganizer, eventId, setSearchParams]);

  const rows = databaseOrganizer ? databaseSuppliers : suppliers;
  const linkedIds = new Set(
    databaseOrganizer
      ? linkedSuppliers.map((supplier) => String(supplier.id))
      : (data.events.find((event) => String(event.id) === eventId)?.suppliers || []).map(String),
  );
  const categories = [...new Set(rows.map((supplier) => supplier.category).filter(Boolean))];
  const filtered = rows.filter((supplier) => {
    const text = `${supplier.name} ${supplier.category}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesCategory = category === 'Todas as categorias' || supplier.category === category;
    const supplierStatus = linkedIds.has(String(supplier.id)) ? 'Vinculado' : 'Disponível';
    const matchesStatus = status === 'Todos os status' || supplierStatus === status ||
      (!databaseOrganizer && supplier.status === status);
    return matchesQuery && matchesCategory && matchesStatus;
  });
  const event = data.events.find((item) => String(item.id) === eventId);
  const canLink = databaseOrganizer ? Boolean(event) : Boolean(event);

  async function toggleLink(supplier) {
    if (!event) return;
    const linked = linkedIds.has(String(supplier.id));
    setLinkingId(supplier.id);
    setLoadError('');
    try {
      if (databaseOrganizer) {
        await setEventSupplier(organizerId, event.id, supplier.id, !linked);
        setLinkedSuppliers((current) => linked
          ? current.filter((item) => String(item.id) !== String(supplier.id))
          : [...current, supplier]);
      } else {
        update('events', (current) => current.map((item) => {
          if (String(item.id) !== String(event.id)) return item;
          const existingIds = item.suppliers || [];
          return { ...item, suppliers: linked
            ? existingIds.filter((id) => String(id) !== String(supplier.id))
            : [...existingIds, supplier.id] };
        }));
      }
      notify(linked ? 'Fornecedor removido do evento.' : 'Fornecedor vinculado ao evento.');
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLinkingId(null);
    }
  }

  const initials = (name) => name
    .replace(/&/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="workspace supplier-directory">
      <PageTitle
        title="Fornecedores"
        subtitle={databaseOrganizer
          ? 'Selecione um evento e vincule fornecedores cadastrados à sua organização.'
          : 'Encontre parceiros para os seus eventos e consulte os valores de referência.'}
      >
        {!event && <Link className="button blue-button" to="/organizador/novo">Criar evento</Link>}
      </PageTitle>

      {event && (
        <label className="supplier-event-select">
          Vincular fornecedores ao evento
          <select
            aria-label="Evento para vincular fornecedores"
            value={eventId}
            onChange={(e) => setSearchParams({ evento: e.target.value })}
          >
            {data.events.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
      )}
      {loading && <p role="status">Carregando fornecedores e eventos do banco…</p>}
      {loadingLinks && <p role="status">Carregando vínculos do evento…</p>}
      {loadError && (
        <div className="api-error" role="alert">
          <span>Não foi possível concluir a operação: {loadError}</span>
          <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {!data.events.length && !loading && (
        <Empty title="Crie um evento antes de vincular fornecedores">
          <Link className="button blue-button" to="/organizador/novo">Criar evento</Link>
        </Empty>
      )}

      <section className="supplier-toolbar" aria-label="Filtros de fornecedores">
        <label className="supplier-search">
          <span className="sr-only">Buscar fornecedores</span>
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar por fornecedor ou categoria"
            placeholder="Buscar fornecedor ou serviço..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="supplier-clear-search" onClick={() => setQuery('')} aria-label="Limpar busca">
              ×
            </button>
          )}
        </label>
        <label className="supplier-filter">
          <span className="sr-only">Filtrar por categoria</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>Todas as categorias</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="supplier-filter supplier-status-filter">
          <span className="sr-only">Filtrar por status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>Todos os status</option>
            {(databaseOrganizer
              ? ['Disponível', 'Vinculado']
              : [...new Set([...suppliers.map((supplier) => supplier.status), 'Disponível', 'Vinculado'])]
            ).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        {(query || category !== 'Todas as categorias' || status !== 'Todos os status') && (
          <button
            type="button"
            className="supplier-reset"
            onClick={() => { setQuery(''); setCategory('Todas as categorias'); setStatus('Todos os status'); }}
          >
            Limpar filtros
          </button>
        )}
      </section>

      <div className="supplier-results-line">
        <span><strong>{filtered.length}</strong> {filtered.length === 1 ? 'fornecedor encontrado' : 'fornecedores encontrados'}</span>
        <span className="supplier-results-hint">{databaseOrganizer
          ? event ? `Evento: ${event.title}` : 'Selecione ou crie um evento.'
          : 'Valores de referência sujeitos a confirmação com o parceiro.'}</span>
      </div>

      <section className="supplier-table-card" aria-label="Lista de fornecedores">
        {filtered.length && !loading ? (
          <div className="supplier-table-scroll">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th scope="col">Fornecedor</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Valor de referência</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="supplier-name-cell">
                        <span className="supplier-initials" aria-hidden="true">{initials(supplier.name)}</span>
                        <span className="supplier-name-copy">
                          <strong>{supplier.name}</strong>
                          <small>{supplier.productCount !== undefined
                            ? `${supplier.productCount} itens ativos no catálogo`
                            : 'Parceiro para eventos'}</small>
                        </span>
                      </div>
                    </td>
                    <td><span className="supplier-category">{supplier.category}</span></td>
                    <td><strong className="supplier-price">
                      {supplier.price === null || supplier.price === undefined ? 'Sem preço de referência' : money(supplier.price)}
                    </strong></td>
                    <td>
                      <span className={`supplier-status ${linkedIds.has(String(supplier.id)) ? 'is-confirmed' : 'is-pending'}`}>
                        <span aria-hidden="true" />{linkedIds.has(String(supplier.id)) ? 'Vinculado' : 'Disponível'}
                      </span>
                    </td>
                    <td>
                      <div className="supplier-row-actions">
                        <button type="button" className="button outline supplier-details-button" onClick={() => setSelected(supplier)}>
                          Detalhes
                        </button>
                        <button
                          type="button"
                          className={`button ${linkedIds.has(String(supplier.id)) ? 'outline' : 'blue-button'} supplier-link-button`}
                          disabled={!canLink || linkingId === supplier.id}
                          onClick={() => toggleLink(supplier)}
                          title={event ? `${linkedIds.has(String(supplier.id)) ? 'Remover vínculo de' : 'Vincular'} ${supplier.name} ${linkedIds.has(String(supplier.id)) ? 'do' : 'ao'} evento ${event.title}` : 'Crie um evento para vincular fornecedores'}
                        >
                          {linkingId === supplier.id ? 'Salvando…' : linkedIds.has(String(supplier.id)) ? 'Remover' : 'Vincular'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !loading && (
          <div className="supplier-empty">
            <span className="supplier-empty-icon" aria-hidden="true">⌕</span>
            <strong>Nenhum fornecedor encontrado</strong>
            <p>{databaseOrganizer && !rows.length
              ? 'Nenhum fornecedor possui cadastro ativo no banco.'
              : 'Tente mudar a busca ou remover algum filtro.'}</p>
            <button type="button" className="button outline" onClick={() => { setQuery(''); setCategory('Todas as categorias'); setStatus('Todos os status'); }}>
              Limpar filtros
            </button>
          </div>
        )}
      </section>

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="supplier-detail-modal">
            <span className="supplier-initials supplier-modal-initials" aria-hidden="true">{initials(selected.name)}</span>
            <div>
              <p className="muted">{selected.category}</p>
              <p className="supplier-modal-price">
                {selected.price === null || selected.price === undefined
                  ? 'Sem preço de referência'
                  : money(selected.price)}{' '}
                <span>valor de referência</span>
              </p>
              <section aria-label="Itens ativos do fornecedor">
                <h3>Itens do catálogo</h3>
                {selected.products?.length ? (
                  <ul className="supplier-product-list">
                    {selected.products.map((product) => (
                      <li key={product.id}>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {product.category} · {product.unit}
                          </small>
                          {product.description && <small>{product.description}</small>}
                        </span>
                        <strong>{money(product.price)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Este fornecedor ainda não cadastrou itens ativos.</p>
                )}
              </section>
              <p className="muted">Confirme disponibilidade, escopo do serviço e orçamento diretamente com o parceiro antes de fechar a contratação.</p>
              <div className="supplier-modal-actions">
                <button type="button" className="button outline" onClick={() => setSelected(null)}>Fechar</button>
                <button
                  type="button"
                  className={`button ${linkedIds.has(String(selected.id)) ? 'outline' : 'blue-button'}`}
                  disabled={!canLink || linkingId === selected.id}
                  onClick={() => toggleLink(selected)}
                >
                  {linkedIds.has(String(selected.id)) ? 'Remover do evento' : 'Vincular ao evento'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
