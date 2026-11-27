import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useStore } from '../context/Store';
import { suppliers } from '../data/demo';
import EventCard from '../../src/components/EventCard';
import CancelarEvento from '../components/CancelarEvento';
import { mensagemCancelamento } from '../services/admin';
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
import { t, tn } from '../i18n';


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
        title={list ? t('Meus Eventos') : t('Vamos criar experiências memoráveis?')}
        subtitle={t('Seus eventos, parceiros e próximos passos em um só lugar.')}
      >
        <Link className="button blue-button" to="/organizador/novo">
          {t('+ Novo evento')}
        </Link>
      </PageTitle>
      {loadError && (
        <div className="api-error" role="alert">
          <span>{t('Não foi possível carregar os eventos do banco:')} {t(loadError)}</span>
          <button type="button" className="button outline tiny" onClick={() => setReloadEvents((value) => value + 1)}>
            {t('Tentar novamente')}
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
                <span>{t(label)}</span>
                <strong>{value}</strong>
                <small>{t(note)}</small>
              </div>
            ))}
          </div>
          <div className="section-row">
            <h2>
              {t('Meus Eventos')} <Badge>{t('Painel ativo')}</Badge>
            </h2>
            <Tabs options={['Grade', 'Lista']} value={view} onChange={setView} />
          </div>
          <div className="filter-bar">
            <input
              aria-label={t('Buscar meus eventos')}
              placeholder={t('Buscar evento…')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label={t('Status do evento')}
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
                <option value={s} key={s}>{t(s)}</option>
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
            title={t('Agenda de eventos')}
            subtitle={t('Acompanhe as próximas datas do seu planejamento.')}
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
                    <small>{event.suppliers?.length || 0} {t('fornecedores vinculados')}</small>
                  </Link>
                ))}
            </div>
          </Panel>
        </div>
        <aside>
          <Panel
            title={isAuthenticated ? t('Fornecedores cadastrados') : t('Últimos Fornecedores')}
            subtitle={isAuthenticated ? t('Vincule fornecedores reais aos seus eventos.') : t('Contratos recentes e contatos rápidos')}
            action={<Link className="text-link" to="/organizador/fornecedores">{t('Ver todos')}</Link>}
          >
            {!isAuthenticated && suppliers.map((s) => (
              <Link className="supplier-row" to="/organizador/fornecedores" key={s.id}>
                <img src={s.image} alt="" />
                <div><strong>{s.name}</strong><small>{t(s.category)}</small><Badge>{t(s.status)}</Badge></div>
              </Link>
            ))}
            <Link className="button outline full" to="/organizador/fornecedores">
              {t('Gerenciar fornecedores →')}
            </Link>
          </Panel>
          <div className="info-note">
            {t('Tudo pronto para o próximo evento? Comece pelo planejamento e reúna seus fornecedores.')}
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
    return <div className="workspace"><p role="status">{t('Carregando evento…')}</p></div>;
  }
  if (id && !existing && eventLoadError) {
    return (
      <div className="workspace">
        <div className="api-error" role="alert">
          <span>{t('Não foi possível carregar o evento:')} {t(eventLoadError)}</span>
          <button type="button" className="button outline" onClick={() => {
            setEventLoadError('');
            setEventLoading(true);
            setEventReload((value) => value + 1);
          }}>
            {t('Tentar novamente')}
          </button>
        </div>
      </div>
    );
  }
  if (id && !existing) return <NotFound title={t('Evento não encontrado')} />;

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
        title={id ? t('Editar evento') : t('Criar evento')}
        subtitle={t('Cadastre o essencial agora. Você poderá revisar fornecedores e custos na próxima etapa.')}
      >
        <button type="button" className="button outline" onClick={() => setPreview(true)}>
          {t('◉ Pré-visualizar')}
        </button>
      </PageTitle>
      <div className="event-editor-hint"><span aria-hidden="true">✓</span> {t('Eventos com uma conta de organizador são salvos no banco de dados; a demonstração usa este navegador. Campos com * são obrigatórios.')}</div>
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
                  <div><h2>{t('Informações do evento')}</h2><p>{t('Como o evento será apresentado aos usuários.')}</p></div>
                </div>
                <Field
                  label={t('Nome do evento *')}
                  name="title"
                  placeholder={t('Ex.: Festival de Música de Verão')}
                  value={form.title}
                  onChange={(e) => field('title', e.target.value)}
                  error={errors.title}
                />
                <div className="form-grid">
                  <Field label={t('Categoria *')} name="category">
                    <select id="category" value={form.category} onChange={(e) => field('category', e.target.value)}>
                      {['Show / Cultura', 'Corporativo', 'Workshop', 'Gastronomia', 'Esporte', 'Feira / Exposição', 'Outro'].map((x) => <option value={x} key={x}>{t(x)}</option>)}
                    </select>
                  </Field>
                  <Field label={t('Formato *')} name="format">
                    <select id="format" value={form.format} onChange={(e) => field('format', e.target.value)}>
                      {['Presencial', 'Online', 'Híbrido'].map((x) => <option value={x} key={x}>{t(x)}</option>)}
                    </select>
                  </Field>
                </div>
                <Field
                  label={form.format === 'Online' ? t('Link ou plataforma do evento *') : form.format === 'Híbrido' ? t('Local presencial ou link de acesso *') : t('Local do evento *')}
                  name="location"
                  placeholder={form.format === 'Presencial' ? t('Espaço, endereço, cidade e estado') : t('Endereço ou link para participação')}
                  value={form.location}
                  onChange={(e) => field('location', e.target.value)}
                  error={errors.location}
                />
              </section>
              <section className="event-form-section">
                <div className="event-section-heading">
                  <span className="event-section-number">2</span>
                  <div><h2>{t('Data, horário e capacidade')}</h2><p>{t('Ajude usuários e fornecedores a se planejarem.')}</p></div>
                </div>
                <div className="form-grid event-date-grid">
                  <Field label={t('Data de início *')} name="date" type="date" value={form.date} onChange={(e) => field('date', e.target.value)} />
                  <Field label={t('Horário de início *')} name="time" type="time" value={form.time} onChange={(e) => field('time', e.target.value)} />
                  <Field label={t('Data de término *')} name="endDate" type="date" value={form.endDate} onChange={(e) => field('endDate', e.target.value)} error={errors.endDate} />
                  <Field label={t('Horário de término *')} name="endTime" type="time" value={form.endTime} onChange={(e) => field('endTime', e.target.value)} />
                </div>
                <div className="form-grid">
                  <Field label={t('Público estimado')} name="capacity" type="number" min="1" placeholder={t('Ex.: 500 pessoas')} value={form.capacity} onChange={(e) => field('capacity', e.target.value)} error={errors.capacity} />
                  <Field label={t('Preço base do ingresso (R$) *')} name="price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => field('price', e.target.value)} error={errors.price} />
                </div>
                <p className="event-field-note">{t('Se o evento for gratuito, mantenha o preço em R$ 0,00. A capacidade é opcional e pode ser preenchida quando definida.')}</p>
              </section>
              <section className="event-form-section event-description-section">
                <div className="event-section-heading">
                  <span className="event-section-number">3</span>
                  <div><h2>{t('Descrição')}</h2><p>{t('Conte o que o público precisa saber.')}</p></div>
                </div>
                <Field label={t('Descrição do evento')} name="description">
                  <textarea id="description" maxLength={1000} rows={4} placeholder={t('Descreva a programação, atrações e informações importantes...')} value={form.description} onChange={(e) => field('description', e.target.value)} />
                </Field>
                <div className="event-character-count">{form.description.length}{t('/1000 caracteres')}</div>
              </section>
            </div>
            <aside className="event-editor-side">
              <section className="event-form-section">
                <div className="event-section-heading">
                  <span className="event-section-number">4</span>
                  <div><h2>{t('Imagem de capa')}</h2><p>{t('Uma imagem ajuda a identificar seu evento.')}</p></div>
                </div>
                <label className="cover-upload event-cover-upload">
                  <img src={form.image} alt={t('Prévia da capa do evento')} />
                  <span>{t('↑ Escolher imagem de capa')}</span>
                  <small>{t('JPG, PNG ou WEBP · máximo de 2 MB')}</small>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
                </label>
                {errors.image && <p className="field-error">{errors.image}</p>}
                <button type="button" className="button outline event-remove-cover" onClick={() => field('image', '/images/asset-5.jpg')}>{t('Restaurar capa padrão')}</button>
              </section>
              <div className="event-next-step-card">
                <span className="event-next-step-icon">↗</span>
                <h3>{t('Próxima etapa: fornecedores e custos')}</h3>
                <p>{t('Depois de salvar, você poderá selecionar parceiros e revisar os valores estimados do evento.')}</p>
              </div>
            </aside>
          </div>
          <div className="form-footer event-editor-footer">
            <Link className="button outline" to="/organizador">{t('Cancelar')}</Link>
            <button type="button" className="button outline" disabled={saving} onClick={() => save(false)}>{saving ? t('Salvando…') : t('Salvar rascunho')}</button>
            <button type="submit" className="button blue-button" disabled={saving}>{saving ? t('Salvando…') : t('Continuar para custos →')}</button>
          </div>
        </Panel>
      </form>
      {preview && (
        <Modal title={t('Prévia do evento')} onClose={() => setPreview(false)}>
          <img className="modal-cover" src={form.image} alt={t('Capa do evento')} />
          <p className="eyebrow purple">{t(form.category)} · {t(form.format)}</p>
          <h2>{form.title || t('Nome do evento')}</h2>
          <p>{form.description || t('A descrição do evento aparecerá aqui.')}</p>
          <p>{dateLabel(form.date)} · {form.time} · {form.location || t('Local a definir')}</p>
          <strong>{Number(form.price) === 0 ? t('Entrada gratuita') : t('{v1} / ingresso', { v1: money(form.price) })}</strong>
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
    if (eventLoading) return <div className="workspace"><p role="status">{t('Carregando evento do banco de dados…')}</p></div>;
    if (eventLoadError) {
      return (
        <div className="workspace">
          <div className="api-error" role="alert">
            <span>{t('Não foi possível carregar o evento:')} {t(eventLoadError)}</span>
            <button type="button" className="button outline tiny" onClick={() => setEventRetry((value) => value + 1)}>
              {t('Tentar novamente')}
            </button>
          </div>
        </div>
      );
    }
    return <NotFound title={t('Evento não encontrado')} />;
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
        title={t('Consolidar evento')}
        subtitle={t('Confira parceiros, orçamento e dados principais antes de publicar.')}
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
          {t('Editar evento')}
        </Link>
      </PageTitle>

      <section className="consolidation-overview panel">
        <div className="consolidation-event-heading">
          <img src={event.image} alt="" />
          <div className="consolidation-event-copy">
            <div className="consolidation-tags">
              <Badge>{t(event.category)}</Badge>
              <Badge>{event.format || t('Formato não definido')}</Badge>
            </div>
            <h2>{event.title}</h2>
            <p>{event.id} <span aria-hidden="true">·</span> {t(event.status)}</p>
          </div>
        </div>
        <div className="consolidation-facts">
          <div><span>{t('Data e horário')}</span><strong>{dateLabel(event.date)} · {event.time || t('A definir')}</strong></div>
          <div><span>{t('Local')}</span><strong>{event.location || t('A definir')}</strong></div>
          <div><span>{t('Capacidade')}</span><strong>{event.capacity ? t('{capacity} pessoas', { capacity: event.capacity }) : t('Não definida')}</strong></div>
          <div><span>{t('Custos de propostas aprovadas')}</span><strong>{money(total)}</strong></div>
        </div>
      </section>

      <div className="consolidation-main-grid">
        <section className="panel consolidation-partners">
          <div className="consolidation-section-heading">
            <div>
              <h2>{isDatabaseEvent ? t('Propostas recebidas') : t('Parceiros contratados')}</h2>
              <p>{tn(partnerCount, '{n} fornecedor', '{n} fornecedores')}</p>
            </div>
            <Link className="text-link" to={`/organizador/fornecedores?evento=${encodeURIComponent(id)}`}>{t('Gerenciar')}</Link>
          </div>
          <div className="consolidation-status-summary">
            <div><strong>{confirmedCount}</strong><span>{isDatabaseEvent ? t('Aprovadas') : t('Confirmados')}</span></div>
            <div><strong>{pendingCount}</strong><span>{t('Pendentes')}</span></div>
            <div><strong>{progress}%</strong><span>{t('Concluído')}</span></div>
          </div>
          {proposalError && (
            <div className="api-error" role="alert">
              <span>{t(proposalError)}</span>
              <button type="button" className="button outline tiny" onClick={() => setProposalRetry((value) => value + 1)}>
                {t('Tentar novamente')}
              </button>
            </div>
          )}
          {proposalLoading && <p role="status">{t('Carregando propostas recebidas…')}</p>}
          {isDatabaseEvent && linkedSuppliers.length > 0 && (
            <div className="consolidation-linked-suppliers">
              <h3>{t('Fornecedores vinculados')}</h3>
              {linkedSuppliers.map((supplier) => (
                <div className="consolidation-linked-supplier" key={supplier.id}>
                  <span><strong>{supplier.name}</strong><small>{t(supplier.category || 'Categoria não informada')}</small></span>
                  <Badge tone="blue">{t('Vinculado')}</Badge>
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
                    <span>{t(proposal.category || 'Categoria não informada')} · #{proposal.protocol || proposal.id}</span>
                    {proposal.items?.length > 0 && (
                      <small>{proposal.items.map((item) => `${item.qty} ${t(item.unit)} ${item.name}`).join(' · ')}</small>
                    )}
                  </div>
                  <div className="consolidation-partner-end">
                    <strong>{money(proposal.total)}</strong>
                    {proposal.status === 'Em análise' ? (
                      <div className="actions">
                        <button className="button tiny outline" onClick={() => setProposalStatus(proposal, 'Não selecionada')}>
                          {t('Recusar')}
                        </button>
                        <button className="button tiny blue-button" onClick={() => setProposalStatus(proposal, 'Aprovada')}>
                          {t('Aprovar')}
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
                      <span>{t(supplier.category)}</span>
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
                        >{t('Confirmar')}</button>
                      ) : <Badge>{t('Confirmado')}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title={isDatabaseEvent ? t('Nenhuma proposta recebida') : t('Nenhum parceiro vinculado')}>
              {isDatabaseEvent
                ? t('Fornecedores poderão enviar propostas quando o evento estiver publicado.')
                : t('Você pode adicionar fornecedores antes de publicar o evento.')}
            </Empty>
          )}
        </section>

        <section className="panel consolidation-readiness">
          <div className="consolidation-section-heading">
            <div>
              <h2>{t('Resumo para publicação')}</h2>
              <p>{t('Uma última conferência antes de disponibilizar o evento.')}</p>
            </div>
            <Badge tone={isPublished ? 'green' : isCancelled ? 'red' : pendingCount ? 'amber' : 'blue'}>
              {isCancelled ? t('Cancelado') : isPublished ? t('Publicado') : pendingCount ? t('Pendente') : t('Pronto para publicar')}
            </Badge>
          </div>
          <div className="consolidation-progress-label"><span>{t('Etapa de consolidação')}</span><strong>{progress}%</strong></div>
          <progress value={progress} max="100" aria-label={t('Progresso da consolidação')} />
          <div className="consolidation-budget">
            <div><span>{t('Receita bruta estimada (lotação completa)')}</span><strong>{estimatedRevenue === null ? t('Defina a capacidade') : money(estimatedRevenue)}</strong></div>
            <div><span>{t('Custos dos fornecedores')}</span><strong>{money(total)}</strong></div>
            <div><span>{t('Preço mínimo por ingresso para cobrir fornecedores')}</span><strong>{minimumTicketPrice === null ? t('Defina a capacidade') : money(minimumTicketPrice)}</strong></div>
            <div className="consolidation-budget-total"><span>{t('Saldo bruto estimado')}</span><strong>{estimatedResult === null ? t('Defina a capacidade') : money(estimatedResult)}</strong></div>
          </div>
          <p className="muted">{t('Estimativa considera lotação completa e somente propostas aprovadas; não inclui impostos, taxas ou demais despesas.')}</p>
          <p className="consolidation-guidance">
            {isCancelled
              ? (event.cancelReason ? t('Evento cancelado. Motivo: {motivo}.', { motivo: event.cancelReason }) : t('Evento cancelado.'))
              : pendingCount
              ? pendingCount === 1 ? t('1 proposta aguarda análise.') : t('{pendingCount} propostas aguardam análise.', { pendingCount })
              : isPublished
                ? isDatabaseEvent
                  ? t('Este evento já está publicado no catálogo.')
                  : t('Este evento já está publicado no catálogo da demonstração.')
                : t('Os dados e parceiros estão prontos para a publicação do evento.')}
          </p>
          <div className="consolidation-actions">
            <button className="button danger-outline" onClick={() => setModal(true)} disabled={isCancelled}>{t('Cancelar evento')}</button>
            <button
              className="button blue-button"
              disabled={pendingCount > 0 || isPublished || isCancelled}
              onClick={async () => {
                if (await change({ status: 'Publicado' })) {
                  notify('Evento publicado no catálogo.');
                }
              }}
            >{isPublished ? t('Evento publicado') : t('Consolidar e publicar')}</button>
          </div>
        </section>
      </div>

      {allEvents.length > 1 && (
        <section className="consolidation-switcher">
          <div className="consolidation-section-heading">
            <div><h2>{t('Outros eventos')}</h2><p>{t('Troque de evento sem voltar ao painel.')}</p></div>
            <Link className="text-link" to="/organizador/eventos">{t('Ver todos')}</Link>
          </div>
          <div className="consolidation-event-list">
            {allEvents.filter((item) => item.id !== id).map((item) => (
              <Link className="consolidation-event-option" key={item.id} to={`/organizador/eventos/${item.id}/consolidar`}>
                <span><strong>{item.title}</strong><small>{dateLabel(item.date)} · {item.location || t('Local a definir')}</small></span>
                <strong>{money(item.price || 0)}</strong>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Evento do banco (etapa 6): cancela com motivo e estorna quem pagou. */}
      {modal && isDatabaseEvent && (
        <CancelarEvento
          evento={event}
          aoFechar={() => setModal(false)}
          aoConcluir={(resultado) => {
            setModal(false);
            update('events', (old) =>
              old.map((item) =>
                String(item.id) === id
                  ? { ...item, status: 'Cancelado', cancelReason: resultado.reason }
                  : item,
              ),
            );
            notify(mensagemCancelamento(resultado));
          }}
        />
      )}
      {modal && !isDatabaseEvent && (
        <Modal title={t('Cancelar este evento?')} onClose={() => setModal(false)}>
          <p>{t('O evento ficará marcado como cancelado. Você ainda poderá consultar os dados posteriormente.')}</p>
          <div className="actions">
            <button className="button outline" onClick={() => setModal(false)}>{t('Voltar')}</button>
            <button className="button danger" onClick={async () => {
              if (await change({ status: 'Cancelado' })) {
                setModal(false);
                notify('Evento cancelado.');
              }
            }}>{t('Confirmar cancelamento')}</button>
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
    const text = `${supplier.name} ${t(supplier.category)}`.toLowerCase();
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
        title={t('Fornecedores')}
        subtitle={databaseOrganizer
          ? t('Selecione um evento e vincule fornecedores cadastrados à sua organização.')
          : t('Encontre parceiros para os seus eventos e consulte os valores de referência.')}
      >
        {!event && <Link className="button blue-button" to="/organizador/novo">{t('Criar evento')}</Link>}
      </PageTitle>

      {event && (
        <label className="supplier-event-select">
          {t('Vincular fornecedores ao evento')}
          <select
            aria-label={t('Evento para vincular fornecedores')}
            value={eventId}
            onChange={(e) => setSearchParams({ evento: e.target.value })}
          >
            {data.events.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
      )}
      {loading && <p role="status">{t('Carregando fornecedores e eventos do banco…')}</p>}
      {loadingLinks && <p role="status">{t('Carregando vínculos do evento…')}</p>}
      {loadError && (
        <div className="api-error" role="alert">
          <span>{t('Não foi possível concluir a operação:')} {t(loadError)}</span>
          <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
            {t('Tentar novamente')}
          </button>
        </div>
      )}
      {!data.events.length && !loading && (
        <Empty title={t('Crie um evento antes de vincular fornecedores')}>
          <Link className="button blue-button" to="/organizador/novo">{t('Criar evento')}</Link>
        </Empty>
      )}

      <section className="supplier-toolbar" aria-label={t('Filtros de fornecedores')}>
        <label className="supplier-search">
          <span className="sr-only">{t('Buscar fornecedores')}</span>
          <span aria-hidden="true">⌕</span>
          <input
            aria-label={t('Buscar por fornecedor ou categoria')}
            placeholder={t('Buscar fornecedor ou serviço...')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="supplier-clear-search" onClick={() => setQuery('')} aria-label={t('Limpar busca')}>
              ×
            </button>
          )}
        </label>
        <label className="supplier-filter">
          <span className="sr-only">{t('Filtrar por categoria')}</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="Todas as categorias">{t('Todas as categorias')}</option>
            {categories.map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
        </label>
        <label className="supplier-filter supplier-status-filter">
          <span className="sr-only">{t('Filtrar por status')}</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="Todos os status">{t('Todos os status')}</option>
            {(databaseOrganizer
              ? ['Disponível', 'Vinculado']
              : [...new Set([...suppliers.map((supplier) => supplier.status), 'Disponível', 'Vinculado'])]
            ).map((item) => (
              <option key={item} value={item}>
                {t(item)}
              </option>
            ))}
          </select>
        </label>
        {(query || category !== 'Todas as categorias' || status !== 'Todos os status') && (
          <button
            type="button"
            className="supplier-reset"
            onClick={() => { setQuery(''); setCategory('Todas as categorias'); setStatus('Todos os status'); }}
          >
            {t('Limpar filtros')}
          </button>
        )}
      </section>

      <div className="supplier-results-line">
        <span><strong>{filtered.length}</strong> {filtered.length === 1 ? t('fornecedor encontrado') : t('fornecedores encontrados')}</span>
        <span className="supplier-results-hint">{databaseOrganizer
          ? event ? t('Evento: {title}', { title: event.title }) : t('Selecione ou crie um evento.')
          : t('Valores de referência sujeitos a confirmação com o parceiro.')}</span>
      </div>

      <section className="supplier-table-card" aria-label={t('Lista de fornecedores')}>
        {filtered.length && !loading ? (
          <div className="supplier-table-scroll">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th scope="col">{t('Fornecedor')}</th>
                  <th scope="col">{t('Categoria')}</th>
                  <th scope="col">{t('Valor de referência')}</th>
                  <th scope="col">{t('Status')}</th>
                  <th scope="col"><span className="sr-only">{t('Ações')}</span></th>
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
                            ? t('{productCount} itens ativos no catálogo', { productCount: supplier.productCount })
                            : t('Parceiro para eventos')}</small>
                        </span>
                      </div>
                    </td>
                    <td><span className="supplier-category">{t(supplier.category)}</span></td>
                    <td><strong className="supplier-price">
                      {supplier.price === null || supplier.price === undefined ? t('Sem preço de referência') : money(supplier.price)}
                    </strong></td>
                    <td>
                      <span className={`supplier-status ${linkedIds.has(String(supplier.id)) ? 'is-confirmed' : 'is-pending'}`}>
                        <span aria-hidden="true" />{linkedIds.has(String(supplier.id)) ? t('Vinculado') : t('Disponível')}
                      </span>
                    </td>
                    <td>
                      <div className="supplier-row-actions">
                        <button type="button" className="button outline supplier-details-button" onClick={() => setSelected(supplier)}>
                          {t('Detalhes')}
                        </button>
                        <button
                          type="button"
                          className={`button ${linkedIds.has(String(supplier.id)) ? 'outline' : 'blue-button'} supplier-link-button`}
                          disabled={!canLink || linkingId === supplier.id}
                          onClick={() => toggleLink(supplier)}
                          title={event ? (linkedIds.has(String(supplier.id)) ? t('Remover vínculo de {name} do evento {title}', { name: supplier.name, title: event.title }) : t('Vincular {name} ao evento {title}', { name: supplier.name, title: event.title })) : t('Crie um evento para vincular fornecedores')}
                        >
                          {linkingId === supplier.id ? t('Salvando…') : linkedIds.has(String(supplier.id)) ? t('Remover') : t('Vincular')}
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
            <strong>{t('Nenhum fornecedor encontrado')}</strong>
            <p>{databaseOrganizer && !rows.length
              ? t('Nenhum fornecedor possui cadastro ativo no banco.')
              : t('Tente mudar a busca ou remover algum filtro.')}</p>
            <button type="button" className="button outline" onClick={() => { setQuery(''); setCategory('Todas as categorias'); setStatus('Todos os status'); }}>
              {t('Limpar filtros')}
            </button>
          </div>
        )}
      </section>

      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="supplier-detail-modal">
            <span className="supplier-initials supplier-modal-initials" aria-hidden="true">{initials(selected.name)}</span>
            <div>
              <p className="muted">{t(selected.category)}</p>
              <p className="supplier-modal-price">
                {selected.price === null || selected.price === undefined
                  ? t('Sem preço de referência')
                  : money(selected.price)}{' '}
                <span>{t('valor de referência')}</span>
              </p>
              <section aria-label={t('Itens ativos do fornecedor')}>
                <h3>{t('Itens do catálogo')}</h3>
                {selected.products?.length ? (
                  <ul className="supplier-product-list">
                    {selected.products.map((product) => (
                      <li key={product.id}>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {t(product.category)} · {t(product.unit)}
                          </small>
                          {product.description && <small>{product.description}</small>}
                        </span>
                        <strong>{money(product.price)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">{t('Este fornecedor ainda não cadastrou itens ativos.')}</p>
                )}
              </section>
              <p className="muted">{t('Confirme disponibilidade, escopo do serviço e orçamento diretamente com o parceiro antes de fechar a contratação.')}</p>
              <div className="supplier-modal-actions">
                <button type="button" className="button outline" onClick={() => setSelected(null)}>{t('Fechar')}</button>
                <button
                  type="button"
                  className={`button ${linkedIds.has(String(selected.id)) ? 'outline' : 'blue-button'}`}
                  disabled={!canLink || linkingId === selected.id}
                  onClick={() => toggleLink(selected)}
                >
                  {linkedIds.has(String(selected.id)) ? t('Remover do evento') : t('Vincular ao evento')}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
