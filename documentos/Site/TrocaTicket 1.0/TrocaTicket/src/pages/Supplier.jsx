import { useI18n } from '../i18n';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../context/StoreContext';
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
  const { t } = useI18n();
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
            aria-label={t('Buscar oportunidades')}
            placeholder={t('Buscar por evento, artista ou organizador…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label={t('Status da oportunidade')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['Todos', 'Cotação aberta', 'Em análise', 'Alta prioridade'].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
          <select
            aria-label={t('Ordenar oportunidades')}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value={'Data'}>{t('Data')}</option>
            <option value={'Nome'}>{t('Nome')}</option>
          </select>
        </div>
      </Panel>
      <PageTitle
        title={t('Grade de Eventos Disponíveis')}
        subtitle={t('{count} oportunidades · selecione uma cotação para enviar sua proposta.', {
          count: filtered.length,
        })}
      />
      <div className="cards-three">
        {filtered.map((event, i) => (
          <Panel className="opportunity" key={event.id}>
            <div className="card-actions">
              <Badge>{t('EVENTO {number}', { number: i + 1 })}</Badge>
              <Badge>{event.status}</Badge>
            </div>
            <h2>{event.title}</h2>
            <p className="muted">{event.subtitle}</p>
            <div className="info-note">
              <small>{t('DATA DO EVENTO')}</small>
              <strong>{dateLabel(event.date)}</strong>
              <span>{event.location}</span>
            </div>
            <dl className="key-values">
              <dt>{t('Organizador solicitante')}</dt>
              <dd>{event.organizer}</dd>
              <dt>{t('Serviços solicitados')}</dt>
              <dd>{t(event.category)}</dd>
              <dt>{t('Referência de orçamento')}</dt>
              <dd>{money(event.price)}</dd>
            </dl>
            <Link className="button dark full" to={`/fornecedor/cotacao/${event.id}`}>
              {t('Ver detalhes & cotar →')}
            </Link>
          </Panel>
        ))}
      </div>
      {!filtered.length && <Empty />}
    </div>
  );
}

export function Proposals() {
  const { t } = useI18n();
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
        title={t('Minhas Propostas')}
        subtitle={t(
          'Acompanhe o ciclo de vida, os valores e o status das suas propostas comerciais.',
        )}
      >
        <Link className="button blue-button" to="/fornecedor">
          {t('+ Nova proposta comercial')}
        </Link>
      </PageTitle>
      <Tabs
        options={['Todas', 'Rascunho', 'Em análise', 'Aprovada', 'Não selecionada']}
        value={status}
        onChange={setStatus}
      />
      <div className="proposal-layout">
        <aside>
          <Panel title={t('Resumo das propostas')}>
            <div className="large-number">{data.proposals.length}</div>
            <p className="muted">{t('Propostas neste ambiente')}</p>
            <hr />
            <strong>{money(data.proposals.reduce((s, p) => s + p.total, 0))}</strong>
            <p className="muted">{t('Valor total proposto')}</p>
            <DownloadButton
              name="minhas-propostas.csv"
              rows={[
                ['Código', 'Evento', 'Status', 'Total'].map((heading) => t(heading)),
                ...data.proposals.map((p) => [p.id, p.title, p.status, p.total]),
              ]}
            />
          </Panel>
        </aside>
        <div>
          <div className="filter-bar">
            <span>{t('{count} propostas encontradas', { count: proposals.length })}</span>
            <select
              aria-label={t('Ordenar propostas')}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value={'Recentes'}>{t('Recentes')}</option>
              <option value={'Maior valor'}>{t('Maior valor')}</option>
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
                  <small>{t('ITENS & SERVIÇOS OFERTADOS')}</small>
                  <p>{p.description || t('Proposta de serviços para o evento.')}</p>
                </div>
                <div className="proposal-price">
                  <small>{t('Valor total proposto')}</small>
                  <strong>{money(p.total)}</strong>
                </div>
                <Badge>{p.status}</Badge>
                <p className="muted">{t(p.payment)}</p>
                <button className="button outline full" onClick={() => setSelected(p)}>
                  {t('Ver detalhes da proposta →')}
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
            {t('Total:')} <strong>{money(selected.total)}</strong>
          </p>
          <p>
            {t('Pagamento:')} {t(selected.payment)}
          </p>
          {selected.note && (
            <p>
              {t('Observações:')} {selected.note}
            </p>
          )}
          <p className="muted">
            {t(
              'Proposta registrada apenas neste navegador. Nenhum contrato ou pagamento real foi realizado.',
            )}
          </p>
          <DownloadButton
            name={`${selected.id}.csv`}
            rows={[
              ['Proposta', 'Evento', 'Total', 'Status', 'Pagamento'].map((heading) => t(heading)),
              [selected.id, selected.title, selected.total, selected.status, selected.payment],
            ]}
          />
          {selected.status === 'Rascunho' && (
            <Link className="button blue-button" to={`/fornecedor/cotacao/${selected.eventId}`}>
              {t('Continuar proposta')}
            </Link>
          )}
        </Modal>
      )}
    </div>
  );
}

export function Quote() {
  const { t } = useI18n();
  const { id } = useParams();
  const { data, update, notify } = useStore();
  const navigate = useNavigate();
  const event = opportunities.find((e) => e.id === id);
  const draft = data.proposals.find((p) => p.eventId === id && p.status === 'Rascunho');
  const [prices, setPrices] = useState(draft?.prices || [3750, 14200, 380]);
  const [note, setNote] = useState(draft?.note || '');
  const [payment, setPayment] = useState(draft?.payment || '50% sinal + 50% D+10');
  const [error, setError] = useState('');
  if (!event) return <NotFound title={t('Cotação não encontrada')} />;
  const items = [
    ['Ilhas de Bares Modulares (Pista & Premium)', 12, 'Módulos', 3800],
    ['Logística Térmica & Abastecimento de Chopp', 3, 'Diárias', 14500],
    ['Staff Operacional Treinado (Bartenders e Caixas)', 70, 'Profissionais', 380],
  ];
  const total = items.reduce((sum, item, i) => sum + item[1] * (Number(prices[i]) || 0), 0);
  function submit(status) {
    if (prices.some((v) => !Number.isFinite(Number(v)) || Number(v) <= 0)) {
      setError('Informe um valor maior que zero para todos os itens.');
      return;
    }
    const proposal = {
      id: draft?.id || `PRP-${Date.now().toString().slice(-7)}`,
      eventId: id,
      title: event.title,
      total,
      status,
      date: new Date().toISOString().slice(0, 10),
      description: 'Gestão integral de bar, logística térmica e equipe operacional.',
      payment,
      prices: prices.map(Number),
      note,
    };
    update('proposals', (old) =>
      draft ? old.map((p) => (p.id === draft.id ? proposal : p)) : [proposal, ...old],
    );
    notify(
      status === 'Rascunho'
        ? t('Rascunho da proposta salvo.')
        : t('Proposta enviada para análise na demonstração.'),
    );
    navigate('/fornecedor/propostas');
  }
  return (
    <div className="workspace">
      <PageTitle
        title={t('Eventos · Nova Proposta')}
        subtitle={t('Selecione uma demanda e envie sua proposta técnica e comercial.')}
      />
      <div className="quote-layout">
        <aside>
          <Panel title={t('Organizadora responsável')}>
            <strong>{event.organizer}</strong>
            <p className="muted">{event.location}</p>
            <Badge>Cadastro demonstrativo</Badge>
          </Panel>
          <h3>{t('Demanda & Concorrência')}</h3>
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
          <Panel title={t('Evento: detalhes & briefing')}>
            <p className="muted">
              {t(
                'Operação completa de bebidas e bar. Inclui montagem, abastecimento, equipe e desmontagem.',
              )}
            </p>
            <DownloadButton
              name="briefing.csv"
              rows={[
                [event.title],
                ['Item', 'Quantidade', 'Unidade', 'Referência'].map((heading) => t(heading)),
                ...items,
              ]}
            >
              {t('↓ Baixar briefing CSV')}
            </DownloadButton>
          </Panel>
        </aside>
        <Panel className="quote-main">
          <Badge>
            {t('COTAÇÃO ATIVA ·')} {event.id.toUpperCase()}
          </Badge>
          <h1>
            {event.title} — {event.subtitle}
          </h1>
          <p className="muted">
            ⌖ {event.location} · {dateLabel(event.date)}
          </p>
          <div className="info-note">
            <strong>{t('Escopo resumido:')}</strong>{' '}
            {t(
              'gestão integral dos pontos de bar, armazenamento refrigerado, montagem de ilhas e equipe treinada para atendimento.',
            )}
          </div>
          <h2>{t('Itens requisitados para cotação')}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Item / Especificação')}</th>
                  <th>{t('Quantidade')}</th>
                  <th>{t('Unidade')}</th>
                  <th>{t('Referência')}</th>
                  <th>{t('Sua proposta (R$)')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(([name, qty, unit, price], i) => (
                  <tr key={name}>
                    <td>
                      <strong>{t(name)}</strong>
                      <small>{t('Conforme escopo do evento')}</small>
                    </td>
                    <td>{qty}</td>
                    <td>{t(unit)}</td>
                    <td>{money(price)}</td>
                    <td>
                      <input
                        aria-label={t('Valor unitário de {name}', { name: t(name) })}
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
            <Field label={t('Observações & diferenciais')} name="quote-note">
              <textarea
                id="quote-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('Informe prazo de montagem, equipe e diferenciais…')}
              />
            </Field>
            <Field label={t('Condição de faturamento')} name="payment">
              <select id="payment" value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value={'50% sinal + 50% D+10'}>{t('50% sinal + 50% D+10')}</option>
                <option value={'Faturamento 28 DDL'}>{t('Faturamento 28 DDL')}</option>
              </select>
            </Field>
          </div>
          {error && (
            <p role="alert" className="field-error">
              {t(error)}
            </p>
          )}
          <div className="quote-total">
            <div>
              <small>{t('TOTAL PROPOSTO DA COTAÇÃO')}</small>
              <strong>{money(total)}</strong>
            </div>
            <button className="button outline" onClick={() => submit('Rascunho')}>
              {t('Salvar rascunho')}
            </button>
            <button className="button blue-button" onClick={() => submit('Em análise')}>
              {t('Enviar proposta comercial →')}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function Inventory() {
  const { t } = useI18n();
  const { data, update, notify } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const [selectedId, setSelectedId] = useState(data.inventory[0]?.id);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const selected = data.inventory.find((i) => i.id === selectedId);
  const categories = ['Todas', ...new Set(data.inventory.map((i) => i.category))];
  const items = data.inventory.filter(
    (i) =>
      `${i.name} ${i.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'Todas' || i.category === category) &&
      (status === 'Todos' || i.status === status),
  );
  function save(e) {
    e.preventDefault();
    if (editing.name.trim().length < 3 || Number(editing.price) <= 0) {
      setError('Informe nome e preço maiores que zero.');
      return;
    }
    const item = {
      ...editing,
      id: editing.id || `ITEM-${Date.now().toString().slice(-6)}`,
      price: Number(editing.price),
    };
    update('inventory', (old) =>
      editing.id ? old.map((i) => (i.id === item.id ? item : i)) : [...old, item],
    );
    setSelectedId(item.id);
    setEditing(null);
    notify(t('Item salvo no inventário.'));
  }
  return (
    <div className="workspace">
      <PageTitle
        title={t('Itens & Inventário')}
        subtitle={t('{count} itens cadastrados · {available} disponíveis para cotação', {
          count: data.inventory.length,
          available: data.inventory.filter((i) => i.status === 'Disponível').length,
        })}
      >
        <DownloadButton
          name="catalogo-fornecedor.csv"
          rows={[
            ['Código', 'Nome', 'Categoria', 'Unidade', 'Preço', 'Status'].map((heading) =>
              t(heading),
            ),
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
          {t('+ Adicionar novo item')}
        </button>
      </PageTitle>
      <Panel>
        <div className="filter-bar">
          <input
            aria-label={t('Buscar inventário')}
            placeholder={t('Buscar por nome ou código…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label={t('Disponibilidade')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {['Todos', 'Disponível', 'Alocado', 'Manutenção', 'Inativo'].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
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
            {t('Limpar filtros')}
          </button>
        </div>
        <Tabs options={categories} value={category} onChange={setCategory} />
      </Panel>
      <div className="dashboard-layout">
        <Panel
          title={t('Composição de custos & itens cadastrados')}
          subtitle={t('{count} resultados', { count: items.length })}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Item & código')}</th>
                  <th>{t('Categoria')}</th>
                  <th>{t('Valor')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Ação')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className={selectedId === item.id ? 'selected-row' : ''} key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>#{item.id}</small>
                    </td>
                    <td>
                      {t(item.category)}
                      <small>{t(item.unit)}</small>
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
                        aria-label={t('Ver {name}', { name: item.name })}
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
              <h3>{t('Especificações técnicas')}</h3>
              <p>{selected.description}</p>
              <dl className="key-values">
                <dt>{t('Categoria')}</dt>
                <dd>{t(selected.category)}</dd>
                <dt>{t('Unidade')}</dt>
                <dd>{t(selected.unit)}</dd>
                <dt>{t('Situação')}</dt>
                <dd>
                  <Badge>{selected.status}</Badge>
                </dd>
              </dl>
              <Link className="button blue-button full" to="/fornecedor">
                {t('+ Ver oportunidades de cotação')}
              </Link>
              <div className="actions">
                <button
                  className="button outline"
                  onClick={() => {
                    setError('');
                    setEditing({ ...selected });
                  }}
                >
                  {t('Editar cadastro')}
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
                    notify(
                      selected.status === 'Inativo' ? t('Item reativado.') : t('Item desativado.'),
                    );
                  }}
                >
                  {selected.status === 'Inativo' ? t('Reativar item') : t('Desativar item')}
                </button>
              </div>
            </Panel>
          )}
        </aside>
      </div>
      {editing && (
        <Modal
          title={editing.id ? t('Editar item') : t('Novo item do catálogo')}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <Field
              label={t('Nome do item')}
              name="item-name"
              required
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <div className="form-grid">
              <Field label={t('Categoria')} name="item-category">
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
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={t('Unidade')}
                name="item-unit"
                required
                value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
              />
              <Field
                label={t('Valor de referência (R$)')}
                name="item-price"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              />
              <Field label={t('Status')} name="item-status">
                <select
                  id="item-status"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                >
                  {['Disponível', 'Alocado', 'Manutenção', 'Inativo'].map((s) => (
                    <option key={s} value={s}>
                      {t(s)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t('Descrição técnica')} name="item-description">
              <textarea
                id="item-description"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </Field>
            {error && (
              <p role="alert" className="field-error">
                {t(error)}
              </p>
            )}
            <button className="button blue-button full">{t('Salvar item')}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
