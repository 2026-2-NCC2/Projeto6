import React, { useState } from 'react';
import { Link, useParams } from 'react-router';
import { opportunities } from '../data/demo';
import { useStore } from '../context/Store';
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
const lots = [
  ['LT-2032-TM1', 'tim-maia', 'Pista Premium', 5000, 3420, 'Aprovado'],
  ['LT-2031-LP2', 'lil-peep', 'Camarote Gold', 2500, 1890, 'Em revisão'],
  ['LT-2028-MJ3', 'michael', 'Arquibancada Geral', 12000, 8950, 'Pendente'],
  ['LT-2032-TM2', 'tim-maia', 'Cadeira Superior', 3800, 2110, 'Aprovado'],
  ['LT-2031-LP3', 'lil-peep', 'Pista Comum', 4200, 3010, 'Aprovado'],
  ['LT-2028-MJ4', 'michael', 'VIP Lounge', 800, 620, 'Aprovado'],
];
export function Admin() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = lots.filter((l) =>
    `${l[0]} ${opportunities.find((e) => e.id === l[1]).title}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const count = Math.max(1, Math.ceil(filtered.length / 4));
  const current = Math.min(page, count);
  return (
    <div className="workspace">
      <PageTitle
        title="Painel Geral"
        subtitle="Visão consolidada dos eventos e relatórios de demonstração."
      >
        <Link className="button blue-button" to="/admin/moderacao">
          Moderar cadastros →
        </Link>
        <DownloadButton
          name="relatorio-geral.csv"
          rows={[['Lote', 'Evento', 'Setor', 'Emitidos', 'Trocas', 'Status'], ...lots]}
        />
      </PageTitle>
      <div className="filter-bar">
        <input
          aria-label="Buscar relatórios"
          placeholder="Buscar por evento, artista ou código…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <h2 className="subheading">Visão Geral dos Eventos Prioritários</h2>
      <div className="cards-three">
        {opportunities.map((event, i) => (
          <Panel className="admin-event" key={event.id}>
            <div className="card-actions">
              <Badge>EVENTO {i + 1}</Badge>
              <Badge>{['Aprovado / Ativo', 'Em auditoria', 'Pré-venda ativa'][i]}</Badge>
            </div>
            <h2>{event.title.toUpperCase()}</h2>
            <p className="muted">{event.subtitle}</p>
            <div className="info-note">▦ {dateLabel(event.date)}</div>
            <div className="mini-stats">
              <div>
                <small>Trocas efetuadas</small>
                <strong>{[3420, 1890, 8950][i].toLocaleString('pt-BR')}</strong>
              </div>
              <div>
                <small>Conversão geral</small>
                <strong className="green-text">{['94,8%', '87,4%', '99,2%'][i]}</strong>
              </div>
            </div>
            <Link className="button dark full" to={`/admin/relatorios/${event.id}`}>
              Visão e relatórios ↗
            </Link>
          </Panel>
        ))}
      </div>
      <Panel
        title="Lista Consolidada de Relatórios Recentes e Lotes"
        subtitle="Histórico de validação e transferências demonstrativas."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID do lote</th>
                <th>Evento / artista</th>
                <th>Data prevista</th>
                <th>Emitidos</th>
                <th>Trocas concluídas</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((current - 1) * 4, current * 4).map((l) => {
                const event = opportunities.find((e) => e.id === l[1]);
                return (
                  <tr key={l[0]}>
                    <td>
                      <code>{l[0]}</code>
                    </td>
                    <td>
                      <strong>{event.title}</strong>
                      <small>{l[2]}</small>
                    </td>
                    <td>{dateLabel(event.date)}</td>
                    <td>{l[3]}</td>
                    <td className="green-text">{l[4]}</td>
                    <td>
                      <Badge>{l[5]}</Badge>
                    </td>
                    <td>
                      <Link className="text-link" to={`/admin/relatorios/${event.id}`}>
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <Empty />}
        <div className="pagination">
          <span>
            {filtered.length} registros · página {current} de {count}
          </span>
          <button disabled={current === 1} onClick={() => setPage(current - 1)}>
            Anterior
          </button>
          <button disabled={current === count} onClick={() => setPage(current + 1)}>
            Próxima
          </button>
        </div>
      </Panel>
    </div>
  );
}

export function Report() {
  const { id } = useParams();
  const event = opportunities.find((e) => e.id === id);
  const [group, setGroup] = useState('Por setor');
  const [selected, setSelected] = useState(null);
  if (!event) return <NotFound title="Relatório não encontrado" />;
  const sold = id === 'tim-maia' ? 80000 : id === 'lil-peep' ? 16000 : 42000;
  const sectors =
    group === 'Por setor'
      ? ['Pista Premium', 'Pista Comum', 'Cadeira Inferior', 'Camarote Gold', 'VIP Lounge']
      : ['Site', 'Aplicativo', 'Parceiros', 'Bilheteria', 'Outros'];
  const rates = [35, 25, 20, 15, 5];
  const rows = sectors.map((s, i) => [s, Math.round((sold * rates[i]) / 100), rates[i] + '%']);
  return (
    <div className="workspace">
      <PageTitle
        title="Relatórios Gerenciais"
        subtitle={`${event.title} · indicadores de demonstração`}
      >
        <Link className="button outline" to="/admin">
          ← Painel geral
        </Link>
        <DownloadButton
          name={`relatorio-${id}.csv`}
          rows={[[event.title], ['Canal / Setor', 'Vendidos', 'Participação'], ...rows]}
        />
      </PageTitle>
      <div className="cards-two">
        <Panel>
          <Badge>{event.subtitle}</Badge>
          <h1 className="report-title">{event.title.toUpperCase()}</h1>
          <p className="muted">Mega produção imersiva · experiência ao vivo</p>
          <div className="summary-grid">
            <div>
              <small>DATA DO EVENTO</small>
              <strong>{dateLabel(event.date)}</strong>
            </div>
            <div>
              <small>LOCAL / PRAÇA</small>
              <strong>{event.location}</strong>
            </div>
          </div>
          <div className="info-note">
            Capacidade: <strong>{Math.ceil(sold / 0.941).toLocaleString('pt-BR')} pessoas</strong> ·
            Lote 04
          </div>
          <Link className="button outline" to="/admin">
            Gerenciar relatórios de lotes
          </Link>
        </Panel>
        <Panel>
          <p className="eyebrow muted">Totalizadores de bilheteria</p>
          <h2 className="sales-title">
            TICKETS VENDIDOS: <span>{sold.toLocaleString('pt-BR')}</span>
          </h2>
          <progress max="100" value="94.1" aria-label="Ocupação de 94,1%" />
          <div className="summary-grid">
            <div>
              <small>Faturamento bruto</small>
              <strong>{money(sold * 310)}</strong>
            </div>
            <div>
              <small>Ticket médio</small>
              <strong>{money(310)}</strong>
            </div>
          </div>
          <Tabs options={['Por setor', 'Por canal']} value={group} onChange={setGroup} />
          <div className="chart-layout">
            <div className="donut" role="img" aria-label={rows.map((r) => r.join(': ')).join(', ')}>
              <div>
                <small>Total</small>
                <strong>{sold.toLocaleString('pt-BR')}</strong>
                <small>ingressos</small>
              </div>
            </div>
            <ul className="chart-legend">
              {rows.map((r, i) => (
                <li key={r[0]}>
                  <i
                    style={{
                      background: ['#243c91', '#2860ee', '#13a3d7', '#ff7914', '#0cba86'][i],
                    }}
                  />
                  <span>{r[0]}</span>
                  <strong>{r[2]}</strong>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
      <Panel
        title="Detalhamento de Lotes e Transações Recentes"
        subtitle="Dados fictícios para avaliação do front-end."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID transação</th>
                <th>Setor / Categoria</th>
                <th>Quantidade</th>
                <th>Valor total</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((name, i) => (
                <tr key={name}>
                  <td>
                    <code>TRX-8923{i}</code>
                  </td>
                  <td>
                    <strong>{name}</strong>
                    <small>Lote 04 · Entrada padrão</small>
                  </td>
                  <td>{i + 1} un.</td>
                  <td>{money((i + 1) * 310)}</td>
                  <td>
                    <Badge>{i === 1 ? 'Pendente' : 'Aprovado'}</Badge>
                  </td>
                  <td>
                    <button
                      className="text-link plain-button"
                      onClick={() => setSelected({ name, quantity: i + 1 })}
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {selected && (
        <Modal title="Detalhes da transação" onClose={() => setSelected(null)}>
          <h3>{selected.name}</h3>
          <p>
            {selected.quantity} ingressos · {money(selected.quantity * 310)}
          </p>
          <p>
            Registro fictício para demonstrar a consulta de transações. Não existe cobrança
            associada.
          </p>
        </Modal>
      )}
    </div>
  );
}

export function Moderation() {
  const { data, update, notify } = useStore();
  const [status, setStatus] = useState('Pendente');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(data.people[0]?.id);
  const [checks, setChecks] = useState([false, false, false]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const people = data.people.filter(
    (p) => p.status === status && p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const person = people.find((p) => p.id === selectedId) || people[0];
  function select(id) {
    setSelectedId(id);
    setChecks([false, false, false]);
    setNote('');
    setError('');
  }
  function decision(next) {
    if (next === 'Aprovado' && !checks.every(Boolean)) {
      setError('Confirme os três critérios antes de aprovar.');
      return;
    }
    if (next === 'Recusado' && note.trim().length < 5) {
      setError('Informe o motivo da recusa (mínimo de 5 caracteres).');
      return;
    }
    update('people', (old) =>
      old.map((p) => (p.id === person.id ? { ...p, status: next, note } : p)),
    );
    select(people.find((p) => p.id !== person.id)?.id);
    notify(`Cadastro ${next.toLowerCase()} na demonstração.`);
  }
  return (
    <div className="workspace">
      <PageTitle
        title="Moderação de Cadastros"
        subtitle="Fila de validação com pessoas fictícias. Nenhuma consulta externa é realizada."
      />
      <div className="filter-bar">
        <input
          aria-label="Buscar cadastro"
          placeholder="Buscar por nome…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChecks([false, false, false]);
            setNote('');
          }}
        />
        <Tabs
          options={['Pendente', 'Aprovado', 'Recusado']}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setChecks([false, false, false]);
            setNote('');
            setError('');
          }}
        />
      </div>
      <div className="dashboard-layout">
        <div>
          {person ? (
            <Panel className="moderation-panel">
              <div className="moderation-banner">
                <span>MÓDULO DE VALIDAÇÃO · #{person.id}</span>
                <Badge>{person.status}</Badge>
              </div>
              <div className="moderation-content">
                <div>
                  <div className="person-heading">
                    <span className="avatar large">
                      {person.name
                        .split(' ')
                        .map((s) => s[0])
                        .join('')}
                    </span>
                    <div>
                      <small>NOME</small>
                      <h2>{person.name}</h2>
                      <code>@{person.name.toLowerCase().replaceAll(' ', '_')}</code>
                    </div>
                  </div>
                  <div className="info-note">
                    <small>E-MAIL DE DEMONSTRAÇÃO</small>
                    <strong>{person.email}</strong>
                  </div>
                  <div className="info-note">
                    <small>DOCUMENTO</small>
                    <strong>***.***.***-**</strong>
                    <p>Dados mascarados e fictícios</p>
                  </div>
                  <div className="info-note">
                    A validação oficial de identidade e os controles de segurança serão integrados
                    ao backend.
                  </div>
                </div>
                <div className="decision-panel">
                  <h2>{status === 'Pendente' ? 'Deseja aceitar?' : 'Decisão registrada'}</h2>
                  <p className="muted">Avalie os critérios deste cadastro de demonstração.</p>
                  {status === 'Pendente' ? (
                    <>
                      {[
                        'Nome confere com o cadastro',
                        'Dados de contato revisados',
                        'Critérios de participação conferidos',
                      ].map((label, i) => (
                        <label className="check-line" key={label}>
                          <input
                            type="checkbox"
                            checked={checks[i]}
                            onChange={(e) =>
                              setChecks((old) =>
                                old.map((v, j) => (j === i ? e.target.checked : v)),
                              )
                            }
                          />
                          {label}
                        </label>
                      ))}
                      <Field label="Notas do moderador" name="moderation-note">
                        <textarea
                          id="moderation-note"
                          rows={4}
                          placeholder="Informe o motivo caso recuse…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </Field>
                      {error && (
                        <p role="alert" className="field-error">
                          {error}
                        </p>
                      )}
                      <div className="decision-buttons">
                        <button className="approve" onClick={() => decision('Aprovado')}>
                          ✓<small>Aprovar</small>
                        </button>
                        <button className="reject" onClick={() => decision('Recusado')}>
                          ×<small>Recusar</small>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Badge>{person.status}</Badge>
                      <p>{person.note || 'Sem observações.'}</p>
                      <button
                        className="button outline"
                        onClick={() => {
                          update('people', (old) =>
                            old.map((p) => (p.id === person.id ? { ...p, status: 'Pendente' } : p)),
                          );
                          setStatus('Pendente');
                          select(person.id);
                        }}
                      >
                        Reabrir análise
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Panel>
          ) : (
            <Panel>
              <Empty title="Fila concluída">
                Nenhum cadastro corresponde aos filtros selecionados.
              </Empty>
            </Panel>
          )}
        </div>
        <aside>
          <Panel title="Fila de Espera" subtitle={`${people.length} cadastros nesta seleção`}>
            {people.map((p) => (
              <button
                key={p.id}
                className={`person-row ${person?.id === p.id ? 'active' : ''}`}
                onClick={() => select(p.id)}
              >
                <span className="avatar small">
                  {p.name
                    .split(' ')
                    .map((s) => s[0])
                    .join('')}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>#{p.id}</small>
                </span>
              </button>
            ))}
          </Panel>
          <div className="info-note">
            <strong>Regras de auditoria</strong>
            <p>
              Confira cada critério e documente o motivo das recusas. As decisões ficam salvas
              apenas neste navegador.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
