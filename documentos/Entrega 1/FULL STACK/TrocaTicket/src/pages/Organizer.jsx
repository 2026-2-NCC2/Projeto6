import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../context/Store';
import { suppliers } from '../data/demo';
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

export function Organizer({ list = false }) {
  const { data } = useStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [view, setView] = useState('Grade');
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
              ['Parceiros', suppliers.length, 'Rede de fornecedores'],
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
              <article className="managed-event" key={event.id}>
                <div className="managed-image">
                  <img src={event.image} alt={event.title} />
                  <Badge>{event.status}</Badge>
                </div>
                <div className="managed-body">
                  <p className="eyebrow purple">{event.category}</p>
                  <h3>{event.title}</h3>
                  <p>
                    ▦ {dateLabel(event.date)} · {event.time}
                  </p>
                  <p>⌖ {event.location}</p>
                  <div className="card-actions">
                    <span>
                      Capacidade: <strong>{event.capacity}</strong>
                    </span>
                    <Link className="text-link" to={`/organizador/eventos/${event.id}/consolidar`}>
                      Detalhes →
                    </Link>
                  </div>
                </div>
              </article>
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
                    <small>{event.suppliers.length} fornecedores vinculados</small>
                  </Link>
                ))}
            </div>
          </Panel>
        </div>
        <aside>
          <Panel
            title="Últimos Fornecedores"
            subtitle="Contratos recentes e contatos rápidos"
            action={
              <Link className="text-link" to="/organizador/fornecedores">
                Ver todos
              </Link>
            }
          >
            {suppliers.map((s) => (
              <Link className="supplier-row" to="/organizador/fornecedores" key={s.id}>
                <img src={s.image} alt="" />
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.category}</small>
                  <Badge>{s.status}</Badge>
                </div>
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

const blank = {
  title: '',
  category: 'Show / Cultura',
  format: 'Presencial',
  date: '2026-10-24',
  endDate: '2026-10-24',
  time: '16:00',
  endTime: '23:00',
  location: '',
  capacity: 1200,
  price: 80,
  description: '',
  image: '/images/asset-5.jpg',
  suppliers: ['vibe', 'buffet'],
};
export function EventEditor() {
  const { id } = useParams();
  const { data, update, notify } = useStore();
  const navigate = useNavigate();
  const existing = data.events.find((e) => e.id === id);
  const [form, setForm] = useState(existing || blank);
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);
  if (id && !existing) return <NotFound title="Evento não encontrado" />;
  function field(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
  }
  function save(consolidate) {
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Informe um nome com pelo menos 3 caracteres.';
    if (!form.location.trim()) next.location = 'Informe o local.';
    if (
      !form.date ||
      !form.endDate ||
      `${form.endDate}T${form.endTime}` <= `${form.date}T${form.time}`
    )
      next.endDate = 'O término deve ser posterior ao início.';
    if (Number(form.capacity) < 1 || !Number.isInteger(Number(form.capacity)))
      next.capacity = 'Informe uma capacidade inteira maior que zero.';
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)
      next.price = 'Informe um preço válido.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    const event = {
      ...form,
      id: id || crypto.randomUUID(),
      capacity: Number(form.capacity),
      price: Number(form.price),
      status: existing?.status || 'Rascunho',
    };
    update('events', (old) => (id ? old.map((e) => (e.id === id ? event : e)) : [...old, event]));
    notify(
      consolidate
        ? 'Evento salvo. Revise os custos antes de publicar.'
        : 'Rascunho salvo neste navegador.',
    );
    navigate(`/organizador/eventos/${event.id}/${consolidate ? 'consolidar' : 'editar'}`);
  }
  function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setErrors({ ...errors, image: 'Escolha JPG, PNG ou WEBP de até 2 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => field('image', reader.result);
    reader.readAsDataURL(file);
  }
  return (
    <div className="workspace">
      <PageTitle
        title={id ? 'Editar Evento' : 'Novo Evento'}
        subtitle="Preencha as informações abaixo para planejar, orçar e publicar seu evento."
      >
        <button className="button outline" onClick={() => setPreview(true)}>
          ◉ Pré-visualizar
        </button>
        <button className="button blue-button" onClick={() => save(false)}>
          Salvar rascunho
        </button>
      </PageTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(true);
        }}
        noValidate
      >
        <Panel>
          <div className="editor-layout">
            <div>
              <h2 className="form-section-title">Ⅰ Informações Principais & Localização</h2>
              <Field
                label="Nome do evento *"
                name="title"
                value={form.title}
                onChange={(e) => field('title', e.target.value)}
                error={errors.title}
              />
              <div className="form-grid">
                <Field label="Categoria" name="category">
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => field('category', e.target.value)}
                  >
                    {['Show / Cultura', 'Corporativo', 'Workshop', 'Gastronomia'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Formato do evento" name="format">
                  <select
                    id="format"
                    value={form.format}
                    onChange={(e) => field('format', e.target.value)}
                  >
                    {['Presencial', 'Online', 'Híbrido'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                label="Endereço / Local da realização *"
                name="location"
                value={form.location}
                onChange={(e) => field('location', e.target.value)}
                error={errors.location}
              />
              <div className="form-grid">
                {[
                  ['date', 'Início do evento', 'date'],
                  ['endDate', 'Término previsto', 'date'],
                  ['time', 'Horário de início', 'time'],
                  ['endTime', 'Horário de término', 'time'],
                  ['capacity', 'Capacidade máxima', 'number'],
                  ['price', 'Preço base do ingresso (R$)', 'number'],
                ].map(([key, label, type]) => (
                  <Field
                    key={key}
                    label={label}
                    name={key}
                    type={type}
                    min={key === 'capacity' ? 1 : key === 'price' ? 0 : undefined}
                    step={key === 'price' ? '0.01' : undefined}
                    value={form[key]}
                    onChange={(e) => field(key, e.target.value)}
                    error={errors[key]}
                  />
                ))}
              </div>
              <Field label="Descrição & programação resumida" name="description">
                <textarea
                  id="description"
                  maxLength={1000}
                  rows={5}
                  value={form.description}
                  onChange={(e) => field('description', e.target.value)}
                />
              </Field>
              <small className="muted">{form.description.length} / 1000 caracteres</small>
            </div>
            <div>
              <h2 className="form-section-title">Ⅱ Fotos & Mídia</h2>
              <label className="cover-upload">
                <img src={form.image} alt="Capa do evento" />
                <span>↑ Clique para substituir a foto principal</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
              </label>
              <small className="muted">JPG, PNG ou WEBP · até 2 MB</small>
              {errors.image && <p className="field-error">{errors.image}</p>}
              <div className="media-options">
                {[5, 1, 20].map((i) => (
                  <button
                    type="button"
                    key={i}
                    aria-label={`Usar capa ${i}`}
                    onClick={() => field('image', `/images/asset-${i}.jpg`)}
                  >
                    <img src={`/images/asset-${i}.jpg`} alt="Opção de capa" />
                  </button>
                ))}
              </div>
              <Panel
                className="soft"
                title="Fornecedores vinculados"
                subtitle="Selecione os parceiros para esta operação."
              >
                {suppliers.map((s) => (
                  <label className="supplier-check" key={s.id}>
                    <input
                      type="checkbox"
                      checked={form.suppliers.includes(s.id)}
                      onChange={(e) =>
                        field(
                          'suppliers',
                          e.target.checked
                            ? [...form.suppliers, s.id]
                            : form.suppliers.filter((x) => x !== s.id),
                        )
                      }
                    />
                    <span>
                      <strong>{s.name}</strong>
                      <small>{money(s.price)}</small>
                    </span>
                    <Badge>{s.status}</Badge>
                  </label>
                ))}
              </Panel>
            </div>
          </div>
          <div className="form-footer">
            <Link className="button outline" to="/organizador">
              Cancelar
            </Link>
            <button type="button" className="button outline" onClick={() => save(false)}>
              Salvar rascunho
            </button>
            <button className="button blue-button">Consolidação de custo →</button>
          </div>
        </Panel>
      </form>
      {preview && (
        <Modal title="Prévia do evento" onClose={() => setPreview(false)}>
          <img className="modal-cover" src={form.image} alt="Capa" />
          <h2>{form.title || 'Nome do evento'}</h2>
          <p>{form.description}</p>
          <p>
            {dateLabel(form.date)} · {form.location || 'Local a definir'}
          </p>
          <strong>{money(form.price)} / ingresso</strong>
        </Modal>
      )}
    </div>
  );
}

export function Consolidation() {
  const { id } = useParams();
  const { data, update, notify } = useStore();
  const [modal, setModal] = useState(false);
  const event = data.events.find((e) => e.id === id);
  if (!event) return <NotFound title="Evento não encontrado" />;
  const selected = suppliers.filter((s) => event.suppliers.includes(s.id));
  const confirmations = event.confirmations || [];
  const pending = selected.filter((s) => s.status === 'Pendente' && !confirmations.includes(s.id));
  const total = selected.reduce((v, s) => v + s.price, 0);
  const progress = selected.length
    ? Math.round(((selected.length - pending.length) / selected.length) * 100)
    : 100;
  const change = (values) =>
    update('events', (old) => old.map((e) => (e.id === id ? { ...e, ...values } : e)));
  return (
    <div className="workspace">
      <PageTitle
        title="Seleção e Consolidação"
        subtitle="Revise os fornecedores e os custos antes de confirmar a realização do evento."
      >
        <DownloadButton
          name="custos-evento.csv"
          rows={[
            [event.title],
            ['Fornecedor', 'Valor'],
            ...selected.map((s) => [s.name, s.price]),
            ['Total', total],
          ]}
        />
        <Link className="button outline" to={`/organizador/eventos/${id}/editar`}>
          Editar evento
        </Link>
      </PageTitle>
      <div className="consolidation-layout">
        <Panel
          title="Status Fornecedores"
          subtitle={`${selected.length} vinculados · ${progress}% concluído`}
        >
          <div className="mini-stats">
            <div>
              <strong>{selected.length - pending.length}</strong>Confirmados
            </div>
            <div>
              <strong>{pending.length}</strong>Pendentes
            </div>
          </div>
          {selected.map((s) => (
            <div className="supplier-status" key={s.id}>
              <strong>{s.name}</strong>
              <small>{s.category}</small>
              <div className="card-actions">
                <span>{money(s.price)}</span>
                {pending.some((p) => p.id === s.id) ? (
                  <button
                    className="button tiny outline"
                    onClick={() => {
                      change({ confirmations: [...confirmations, s.id] });
                      notify('Confirmação simulada registrada.');
                    }}
                  >
                    Confirmar parceiro
                  </button>
                ) : (
                  <Badge>Confirmado</Badge>
                )}
              </div>
            </div>
          ))}
          {!selected.length && (
            <p>
              Nenhum fornecedor vinculado. Adicione parceiros na edição do evento se necessário.
            </p>
          )}
          <Link className="text-link" to="/organizador/fornecedores">
            Gerenciar fornecedores →
          </Link>
        </Panel>
        <Panel>
          <div className="event-summary">
            <img src={event.image} alt="" />
            <div>
              <Badge>{event.category}</Badge>
              <h2>{event.title}</h2>
              <small>ID: {event.id.slice(0, 12)}</small>
            </div>
          </div>
          <div className="summary-grid">
            {[
              ['Data & Horário', `${dateLabel(event.date)} · ${event.time}`],
              ['Localização', event.location],
              ['Capacidade', `${event.capacity} pessoas`],
              ['Orçamento consolidado', money(total)],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="panel-heading">
            <h3>Status do evento</h3>
            <Badge>{event.status}</Badge>
          </div>
          <progress value={progress} max="100" aria-label="Progresso da consolidação" />
          <p className="muted">
            {pending.length
              ? 'Confirme os parceiros pendentes para liberar a publicação.'
              : 'Tudo pronto para publicar este evento na demonstração.'}
          </p>
          <div className="info-note">
            Receita estimada com lotação completa:{' '}
            <strong>{money(event.capacity * event.price)}</strong>
            <br />
            Resultado estimado após fornecedores:{' '}
            <strong>{money(event.capacity * event.price - total)}</strong>
          </div>
          <div className="form-footer">
            <button
              className="button danger-outline"
              onClick={() => setModal(true)}
              disabled={event.status === 'Cancelado'}
            >
              Cancelar evento
            </button>
            <button
              className="button blue-button"
              disabled={
                pending.length > 0 || event.status === 'Publicado' || event.status === 'Cancelado'
              }
              onClick={() => {
                change({ status: 'Publicado' });
                notify('Evento publicado no catálogo da demonstração.');
              }}
            >
              ✓ {event.status === 'Publicado' ? 'Publicado' : 'Consolidar e publicar'}
            </button>
          </div>
        </Panel>
      </div>
      {modal && (
        <Modal title="Cancelar este evento?" onClose={() => setModal(false)}>
          <p>Ele ficará marcado como cancelado. Você pode continuar editando seus dados.</p>
          <div className="actions">
            <button className="button outline" onClick={() => setModal(false)}>
              Voltar
            </button>
            <button
              className="button danger"
              onClick={() => {
                change({ status: 'Cancelado' });
                setModal(false);
                notify('Evento cancelado.');
              }}
            >
              Confirmar cancelamento
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Suppliers() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const filtered = suppliers.filter((s) =>
    `${s.name} ${s.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="workspace">
      <PageTitle
        title="Rede de Fornecedores"
        subtitle="Encontre parceiros para transformar o seu próximo evento."
      />
      <div className="filter-bar">
        <input
          aria-label="Buscar fornecedores"
          placeholder="Buscar por nome ou especialidade…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="cards-three">
        {filtered.map((s) => (
          <Panel key={s.id}>
            <img className="supplier-cover" src={s.image} alt={s.name} />
            <Badge>{s.status}</Badge>
            <h2>{s.name}</h2>
            <p className="muted">{s.category}</p>
            <strong>{money(s.price)}</strong>
            <div className="form-footer">
              <button className="button outline" onClick={() => setSelected(s)}>
                Ver detalhes
              </button>
              <Link className="button blue-button" to="/organizador/novo">
                Vincular a evento
              </Link>
            </div>
          </Panel>
        ))}
      </div>
      {!filtered.length && <Empty />}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <p>{selected.category}</p>
          <p>
            Valor de referência: <strong>{money(selected.price)}</strong>
          </p>
          <p>
            Atendimento em São Paulo e região. Os contratos desta plataforma são demonstrativos.
          </p>
          <Link className="button blue-button" to="/organizador/novo">
            Planejar evento com este parceiro
          </Link>
        </Modal>
      )}
    </div>
  );
}
