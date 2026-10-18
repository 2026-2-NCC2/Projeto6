import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../context/StoreContext';
import { quoteTemplates } from '../data/quotes';
import { lineTotal, validAmount } from '../services/rules';
import { opportunities } from '../data/demo';
import {
  Badge,
  DownloadButton,
  Empty,
  Field,
  Modal,
  NotFound,
  PageTitle,
  Panel,
  Tabs,
  dateLabel,
  money,
} from '../components/UI';

export function Opportunities() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [sort, setSort] = useState('Data');
  const filtered = opportunities
    .filter(
      (e) =>
        `${e.title} ${e.organizer}`.toLowerCase().includes(query.toLowerCase()) &&
        (status === 'Todos' || e.status === status),
    )
    .sort((a, b) =>
      sort === 'Nome' ? a.title.localeCompare(b.title) : a.date.localeCompare(b.date),
    );
  return (
    <div className="workspace">
      <Panel>
        <div className="filter-bar no-margin">
          <input
            aria-label="Buscar oportunidades"
            placeholder="Buscar por evento, artista ou organizador…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Status da oportunidade"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['Todos', 'Cotação aberta', 'Em análise', 'Alta prioridade'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Ordenar oportunidades"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Data</option>
            <option>Nome</option>
          </select>
        </div>
      </Panel>
      <PageTitle
        title="Grade de Eventos Disponíveis"
        subtitle={`${filtered.length} oportunidades · selecione uma cotação para enviar sua proposta.`}
      />
      <div className="cards-three">
        {filtered.map((event, i) => (
          <Panel className="opportunity" key={event.id}>
            <div className="card-actions">
              <Badge>EVENTO {i + 1}</Badge>
              <Badge>{event.status}</Badge>
            </div>
            <h2>{event.title}</h2>
            <p className="muted">{event.subtitle}</p>
            <div className="info-note">
              <small>DATA DO EVENTO</small>
              <strong>{dateLabel(event.date)}</strong>
              <span>{event.location}</span>
            </div>
            <dl className="key-values">
              <dt>Organizador solicitante</dt>
              <dd>{event.organizer}</dd>
              <dt>Serviços solicitados</dt>
              <dd>{event.category}</dd>
              <dt>Referência de orçamento</dt>
              <dd>{money(event.price)}</dd>
            </dl>
            <Link className="button dark full" to={`/fornecedor/cotacao/${event.id}`}>
              Ver detalhes & cotar →
            </Link>
          </Panel>
        ))}
      </div>
      {!filtered.length && <Empty />}
    </div>
  );
}

export function Proposals() {
  const { data } = useStore();
  const [status, setStatus] = useState('Todas');
  const [sort, setSort] = useState('Recentes');
  const [selected, setSelected] = useState(null);
  const proposals = data.proposals
    .filter((p) => status === 'Todas' || p.status === status)
    .sort((a, b) => (sort === 'Maior valor' ? b.total - a.total : b.date.localeCompare(a.date)));
  return (
    <div className="workspace">
      <PageTitle
        title="Minhas Propostas"
        subtitle="Acompanhe o ciclo de vida, os valores e o status das suas propostas comerciais."
      >
        <Link className="button blue-button" to="/fornecedor">
          + Nova proposta comercial
        </Link>
      </PageTitle>
      <Tabs
        options={['Todas', 'Rascunho', 'Em análise', 'Aprovada', 'Não selecionada']}
        value={status}
        onChange={setStatus}
      />
      <div className="proposal-layout">
        <aside>
          <Panel title="Resumo das propostas">
            <div className="large-number">{data.proposals.length}</div>
            <p className="muted">Propostas neste ambiente</p>
            <hr />
            <strong>{money(data.proposals.reduce((s, p) => s + p.total, 0))}</strong>
            <p className="muted">Valor total proposto</p>
            <DownloadButton
              name="minhas-propostas.csv"
              rows={[
                ['Código', 'Evento', 'Status', 'Total'],
                ...data.proposals.map((p) => [p.id, p.title, p.status, p.total]),
              ]}
            />
          </Panel>
        </aside>
        <div>
          <div className="filter-bar">
            <span>{proposals.length} propostas encontradas</span>
            <select
              aria-label="Ordenar propostas"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option>Recentes</option>
              <option>Maior valor</option>
            </select>
          </div>
          <div className="cards-two">
            {proposals.map((p) => (
              <Panel
                className={`proposal-card ${p.status === 'Aprovada' ? 'approved' : 'pending'}`}
                key={p.id}
              >
                <div className="card-actions">
                  <code>{p.id}</code>
                  <small>{dateLabel(p.date)}</small>
                </div>
                <h2>{p.title}</h2>
                <p className="muted">{opportunities.find((e) => e.id === p.eventId)?.location}</p>
                <div className="info-note">
                  <small>ITENS & SERVIÇOS OFERTADOS</small>
                  <p>{p.description || 'Proposta de serviços para o evento.'}</p>
                </div>
                <div className="proposal-price">
                  <small>Valor total proposto</small>
                  <strong>{money(p.total)}</strong>
                </div>
                <Badge>{p.status}</Badge>
                <p className="muted">{p.payment}</p>
                <button className="button outline full" onClick={() => setSelected(p)}>
                  Ver detalhes da proposta →
                </button>
              </Panel>
            ))}
          </div>
          {!proposals.length && <Empty />}
        </div>
      </div>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <Badge>{selected.status}</Badge>
          <p>{selected.description}</p>
          <p>
            Total: <strong>{money(selected.total)}</strong>
          </p>
          <p>Pagamento: {selected.payment}</p>
          {selected.note && <p>Observações: {selected.note}</p>}
          <p className="muted">
            Proposta registrada apenas neste navegador. Nenhum contrato ou pagamento real foi
            realizado.
          </p>
          <DownloadButton
            name={`${selected.id}.csv`}
            rows={[
              ['Proposta', 'Evento', 'Total', 'Status', 'Pagamento'],
              [selected.id, selected.title, selected.total, selected.status, selected.payment],
            ]}
          />
          {selected.status === 'Rascunho' && (
            <Link className="button blue-button" to={`/fornecedor/cotacao/${selected.eventId}`}>
              Continuar proposta
            </Link>
          )}
        </Modal>
      )}
    </div>
  );
}

export function Quote() {
  const { id } = useParams();
  const { data, update, notify } = useStore();
  const navigate = useNavigate();
  const event = opportunities.find((e) => e.id === id);
  const draft = data.proposals.find((p) => p.eventId === id && p.status === 'Rascunho');
  const template = quoteTemplates[id];
  const [prices, setPrices] = useState(
    draft?.prices?.length === template?.items.length ? draft.prices : template?.prices || [],
  );
  const [note, setNote] = useState(draft?.note || '');
  const [payment, setPayment] = useState(draft?.payment || '50% sinal + 50% D+10');
  const [error, setError] = useState('');
  if (!event) return <NotFound title="Cotação não encontrada" />;
  const items = template.items;
  const total = lineTotal(items, prices);
  function submit(status) {
    if (prices.length !== items.length || prices.some((v) => !validAmount(v))) {
      setError('Informe valores positivos com até 2 casas decimais para todos os itens.');
      return;
    }
    const proposal = {
      id: draft?.id || `PRP-${crypto.randomUUID().slice(0, 8)}`,
      eventId: id,
      title: event.title,
      total,
      status,
      date: new Date().toISOString().slice(0, 10),
      description: template.description,
      items: items.map((item, i) => ({
        name: item[0],
        quantity: item[1],
        unit: item[2],
        price: Number(prices[i]),
      })),
      payment,
      prices: prices.map(Number),
      note,
    };
    update('proposals', (old) =>
      draft ? old.map((p) => (p.id === draft.id ? proposal : p)) : [proposal, ...old],
    );
    notify(
      status === 'Rascunho'
        ? 'Rascunho da proposta salvo.'
        : 'Proposta enviada para análise na demonstração.',
    );
    navigate('/fornecedor/propostas');
  }
  return (
    <div className="workspace">
      <PageTitle
        title="Eventos · Nova Proposta"
        subtitle="Selecione uma demanda e envie sua proposta técnica e comercial."
      />
      <div className="quote-layout">
        <aside>
          <Panel title="Organizadora responsável">
            <strong>{event.organizer}</strong>
            <p className="muted">{event.location}</p>
            <Badge>Cadastro demonstrativo</Badge>
          </Panel>
          <h3>Demanda & Concorrência</h3>
          {opportunities.map((e) => (
            <Link
              className={`demand-card ${e.id === id ? 'selected' : ''}`}
              to={`/fornecedor/cotacao/${e.id}`}
              key={e.id}
            >
              <Badge>{e.status}</Badge>
              <h3>{e.title}</h3>
              <small>{dateLabel(e.date)}</small>
            </Link>
          ))}
          <Panel title="Evento: detalhes & briefing">
            <p className="muted">{template.description}</p>
            <DownloadButton
              name="briefing.csv"
              rows={[[event.title], ['Item', 'Quantidade', 'Unidade', 'Referência'], ...items]}
            >
              ↓ Baixar briefing CSV
            </DownloadButton>
          </Panel>
        </aside>
        <Panel className="quote-main">
          <Badge>COTAÇÃO ATIVA · {event.id.toUpperCase()}</Badge>
          <h2>
            {event.title} — {event.subtitle}
          </h2>
          <p className="muted">
            ⌖ {event.location} · {dateLabel(event.date)}
          </p>
          <div className="info-note">
            <strong>Escopo resumido:</strong> {template.description}
          </div>
          <h2>Itens requisitados para cotação</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item / Especificação</th>
                  <th>Quantidade</th>
                  <th>Unidade</th>
                  <th>Referência</th>
                  <th>Sua proposta (R$)</th>
                </tr>
              </thead>
              <tbody>
                {items.map(([name, qty, unit, price], i) => (
                  <tr key={name}>
                    <td>
                      <strong>{name}</strong>
                      <small>Conforme escopo do evento</small>
                    </td>
                    <td>{qty}</td>
                    <td>{unit}</td>
                    <td>{money(price)}</td>
                    <td>
                      <input
                        aria-label={`Valor unitário de ${name}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={prices[i]}
                        onChange={(e) =>
                          setPrices((old) => old.map((v, j) => (j === i ? e.target.value : v)))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-grid quote-notes">
            <Field label="Observações & diferenciais" name="quote-note">
              <textarea
                id="quote-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Informe prazo de montagem, equipe e diferenciais…"
              />
            </Field>
            <Field label="Condição de faturamento" name="payment">
              <select id="payment" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option>50% sinal + 50% D+10</option>
                <option>Faturamento 28 DDL</option>
              </select>
            </Field>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="quote-total">
            <div>
              <small>TOTAL PROPOSTO DA COTAÇÃO</small>
              <strong>{money(total)}</strong>
            </div>
            <button className="button outline" onClick={() => submit('Rascunho')}>
              Salvar rascunho
            </button>
            <button className="button blue-button" onClick={() => submit('Em análise')}>
              Enviar proposta comercial →
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function Inventory() {
  const { data, update, notify } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const [selectedId, setSelectedId] = useState(data.inventory[0]?.id);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const categories = ['Todas', ...new Set(data.inventory.map((i) => i.category))];
  const items = data.inventory.filter(
    (i) =>
      `${i.name} ${i.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'Todas' || i.category === category) &&
      (status === 'Todos' || i.status === status),
  );
  const selected = items.find((i) => i.id === selectedId) || items[0];
  function save(e) {
    e.preventDefault();
    if (editing.name.trim().length < 3 || !editing.unit.trim() || !validAmount(editing.price)) {
      setError(
        'Informe nome com pelo menos 3 caracteres, unidade e preço positivo com até 2 casas decimais.',
      );
      return;
    }
    const item = {
      ...editing,
      id: editing.id || `ITEM-${crypto.randomUUID().slice(0, 8)}`,
      price: Number(editing.price),
    };
    update('inventory', (old) =>
      editing.id ? old.map((i) => (i.id === item.id ? item : i)) : [...old, item],
    );
    setSelectedId(item.id);
    setQuery('');
    setCategory('Todas');
    setStatus('Todos');
    setEditing(null);
    notify('Item salvo no inventário.');
  }
  return (
    <div className="workspace">
      <PageTitle
        title="Itens & Inventário"
        subtitle={`${data.inventory.length} itens cadastrados · ${data.inventory.filter((i) => i.status === 'Disponível').length} disponíveis para cotação`}
      >
        <DownloadButton
          name="catalogo-fornecedor.csv"
          rows={[
            ['Código', 'Nome', 'Categoria', 'Unidade', 'Preço', 'Status'],
            ...data.inventory.map((i) => [i.id, i.name, i.category, i.unit, i.price, i.status]),
          ]}
        />
        <button
          className="button blue-button"
          onClick={() => {
            setError('');
            setEditing({
              name: '',
              category: 'Bebidas & Bar',
              unit: 'Unidade / Diária',
              price: 0,
              status: 'Disponível',
              description: '',
            });
          }}
        >
          + Adicionar novo item
        </button>
      </PageTitle>
      <Panel>
        <div className="filter-bar">
          <input
            aria-label="Buscar inventário"
            placeholder="Buscar por nome ou código…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Disponibilidade"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['Todos', 'Disponível', 'Alocado', 'Manutenção', 'Inativo'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            className="button outline"
            onClick={() => {
              setQuery('');
              setStatus('Todos');
              setCategory('Todas');
            }}
          >
            Limpar filtros
          </button>
        </div>
        <Tabs options={categories} value={category} onChange={setCategory} />
      </Panel>
      <div className="dashboard-layout">
        <Panel
          title="Composição de custos & itens cadastrados"
          subtitle={`${items.length} resultados`}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item & código</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className={selected?.id === item.id ? 'selected-row' : ''} key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>#{item.id}</small>
                    </td>
                    <td>
                      {item.category}
                      <small>{item.unit}</small>
                    </td>
                    <td>
                      <strong>{money(item.price)}</strong>
                    </td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Ver ${item.name}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        ◉
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!items.length && <Empty />}
        </Panel>
        <aside>
          {selected && (
            <Panel className="inventory-detail">
              <div className="blue-panel">
                <Badge tone="light">ITEM EM COMPOSIÇÃO</Badge>
                <h2>{selected.name}</h2>
                <small>#{selected.id}</small>
                <strong>{money(selected.price)}</strong>
              </div>
              <h3>Especificações técnicas</h3>
              <p>{selected.description}</p>
              <dl className="key-values">
                <dt>Categoria</dt>
                <dd>{selected.category}</dd>
                <dt>Unidade</dt>
                <dd>{selected.unit}</dd>
                <dt>Situação</dt>
                <dd>
                  <Badge>{selected.status}</Badge>
                </dd>
              </dl>
              <Link className="button blue-button full" to="/fornecedor">
                + Ver oportunidades de cotação
              </Link>
              <div className="actions">
                <button
                  className="button outline"
                  onClick={() => {
                    setError('');
                    setEditing({ ...selected });
                  }}
                >
                  Editar cadastro
                </button>
                <button
                  className="button danger-outline"
                  onClick={() => {
                    update('inventory', (old) =>
                      old.map((i) =>
                        i.id === selected.id
                          ? { ...i, status: i.status === 'Inativo' ? 'Disponível' : 'Inativo' }
                          : i,
                      ),
                    );
                    notify(selected.status === 'Inativo' ? 'Item reativado.' : 'Item desativado.');
                  }}
                >
                  {selected.status === 'Inativo' ? 'Reativar' : 'Desativar'} item
                </button>
              </div>
            </Panel>
          )}
        </aside>
      </div>
      {editing && (
        <Modal
          title={editing.id ? 'Editar item' : 'Novo item do catálogo'}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <Field
              label="Nome do item"
              name="item-name"
              required
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <div className="form-grid">
              <Field label="Categoria" name="item-category">
                <select
                  id="item-category"
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                >
                  {[
                    'Bebidas & Bar',
                    'Iluminação',
                    'Estrutura & Palco',
                    'Alimentação & Buffet',
                    'Som & Acústica',
                    'Segurança & Apoio',
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field
                label="Unidade"
                name="item-unit"
                required
                value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
              />
              <Field
                label="Valor de referência (R$)"
                name="item-price"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              />
              <Field label="Status" name="item-status">
                <select
                  id="item-status"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  {['Disponível', 'Alocado', 'Manutenção', 'Inativo'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descrição técnica" name="item-description">
              <textarea
                id="item-description"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <button className="button blue-button full">Salvar item</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
