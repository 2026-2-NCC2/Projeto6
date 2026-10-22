import React, { useEffect, useState } from 'react';
import { useStore } from '../context/Store';
import { Empty, Modal, PageTitle } from '../components/UI';

const PAGE_SIZE = 5;
const OPEN_STATUSES = ['Pendente', 'Em revisão'];
const STATUS = {
  Pendente: { tab: 'Pendente', tone: 'amber', badge: 'Aguardando Avaliação', plural: 'pendentes' },
  'Em revisão': { tab: 'Em Revisão', tone: 'blue', badge: 'Em revisão', plural: 'em revisão' },
  Aprovado: { tab: 'Aprovados', tone: 'green', badge: 'Aprovado', plural: 'aprovados' },
  Recusado: { tab: 'Rejeitados', tone: 'red', badge: 'Recusado', plural: 'rejeitados' },
};
const CRITERIA = [
  'Nome confere com a base oficial',
  'Nenhum alerta de fraude no IP',
  'Maioridade legal (+18 anos)',
];

const initials = (name) => {
  const parts = name.split(' ');
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
};
const maskEmail = (email) => `${'*'.repeat(7)}@${email.split('@')[1] ?? ''}`;

function Icon({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
const SearchIcon = () => (
  <Icon size={18}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);
const MailIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Icon>
);
const LockIcon = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.5-2" />
  </Icon>
);
const IdIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M15 10h3M15 14h3" />
  </Icon>
);
const CalendarIcon = () => (
  <Icon size={15}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Icon>
);
const InfoIcon = () => (
  <Icon size={18}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);
const ChevronIcon = ({ direction }) => (
  <Icon size={18}>
    <path d={direction === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7'} />
  </Icon>
);
const CheckIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
const CrossIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export default function Moderation() {
  const { data, update, notify } = useStore();
  const [status, setStatus] = useState('Pendente');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(data.people[0]?.id);
  const [checks, setChecks] = useState([false, false, false]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [queuePage, setQueuePage] = useState(0);

  const counts = Object.fromEntries(
    Object.keys(STATUS).map((key) => [key, data.people.filter((p) => p.status === key).length]),
  );
  const people = data.people.filter(
    (p) => p.status === status && p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const person = people.find((p) => p.id === selectedId) || people[0];
  const index = person ? people.indexOf(person) : -1;
  const isOpen = !!person && OPEN_STATUSES.includes(person.status);
  const pages = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const currentPage = Math.min(queuePage, pages - 1);
  const visible = people.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // A lista lateral acompanha o cadastro em foco (setas da triagem, aprovação, busca).
  useEffect(() => {
    if (index >= 0) setQueuePage(Math.floor(index / PAGE_SIZE));
  }, [index]);

  function reset() {
    setChecks([false, false, false]);
    setNote('');
    setError('');
    setRevealed(false);
  }
  function select(id) {
    setSelectedId(id);
    reset();
  }
  function decision(next) {
    if (!isOpen) return;
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
    select((people[index + 1] || people[index - 1])?.id);
    notify(`Cadastro ${next.toLowerCase()} na demonstração.`);
  }

  // Atalhos do design: V aprova e X recusa (ignorados ao digitar ou com a janela aberta).
  useEffect(() => {
    if (!isOpen || preview) return undefined;
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'v') decision('Aprovado');
      if (key === 'x') decision('Recusado');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const current = person && STATUS[person.status];

  return (
    <div className="workspace moderation">
      <PageTitle
        title="Moderação de Cadastros"
        subtitle="Fila de validação com pessoas fictícias. Nenhuma consulta externa é realizada."
      />
      <div className="mod-toolbar">
        <label className="mod-search">
          <SearchIcon />
          <input
            aria-label="Buscar cadastro"
            placeholder="Buscar por nome…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              reset();
            }}
          />
        </label>
        <div className="mod-chips" role="group" aria-label="Filtrar por situação">
          {Object.entries(STATUS).map(([key, item]) => (
            <button
              type="button"
              key={key}
              className={`mod-chip ${item.tone} ${status === key ? 'active' : ''}`}
              aria-pressed={status === key}
              onClick={() => {
                setStatus(key);
                reset();
              }}
            >
              <i aria-hidden="true" />
              {item.tab}
              <b>{counts[key]}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-layout mod-layout">
        <div>
          <div className="mod-triage">
            <span>
              <strong>Fila de Triagem:</strong>{' '}
              {person
                ? `Cadastro ${index + 1} de ${people.length} ${STATUS[status].plural}`
                : 'Nenhum cadastro nesta seleção'}
            </span>
            <div>
              <button
                type="button"
                aria-label="Cadastro anterior"
                disabled={index <= 0}
                onClick={() => select(people[index - 1].id)}
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                aria-label="Próximo cadastro"
                disabled={index < 0 || index >= people.length - 1}
                onClick={() => select(people[index + 1].id)}
              >
                <ChevronIcon direction="right" />
              </button>
            </div>
          </div>
          {person ? (
            <section className="mod-card" aria-label={`Cadastro de ${person.name}`}>
              <div className="mod-banner">
                <span>
                  MÓDULO DE VALIDAÇÃO<i aria-hidden="true">|</i>
                  <code>ID: #{person.id}</code>
                </span>
                <span className={`mod-status ${current.tone}`}>
                  <i aria-hidden="true" />
                  {current.badge}
                </span>
              </div>
              <div className="mod-body">
                <div className="mod-details">
                  <div className="mod-identity">
                    <span className="mod-photo">
                      <svg viewBox="0 0 64 64" aria-hidden="true">
                        <circle cx="32" cy="24" r="11" fill="currentColor" />
                        <path d="M10 60c1-14 10-22 22-22s21 8 22 22z" fill="currentColor" />
                      </svg>
                      {isOpen && <em title="Aguardando decisão" />}
                    </span>
                    <div>
                      <p className="mod-name">
                        <small>NOME:</small>
                        <strong>{person.name}</strong>
                      </p>
                      <p className="mod-username">
                        <small>USERNAME:</small>
                        <code>{person.username}</code>
                        <span>#{person.id}</span>
                      </p>
                      <p className="mod-registered">
                        <CalendarIcon /> Cadastrado hoje às {person.time} (Horário de Brasília)
                      </p>
                    </div>
                  </div>

                  <div className="mod-row">
                    <span className="mod-row-icon">
                      <MailIcon />
                    </span>
                    <div className="mod-row-text">
                      <small>EMAIL:</small>
                      <code>{revealed ? person.email : maskEmail(person.email)}</code>
                    </div>
                    <div className="mod-row-extra">
                      {person.emailVerified && (
                        <span className="mod-pill green">✓ E-mail verificado via OTP</span>
                      )}
                      <button
                        type="button"
                        className="mod-link"
                        aria-pressed={revealed}
                        onClick={() => setRevealed(!revealed)}
                      >
                        {revealed ? 'Ocultar' : 'Revelar'}
                      </button>
                    </div>
                  </div>
                  <div className="mod-row">
                    <span className="mod-row-icon">
                      <LockIcon />
                    </span>
                    <div className="mod-row-text">
                      <small>SENHA:</small>
                      <code className="mod-dots" aria-label="Senha oculta">
                        ••••••••••
                      </code>
                    </div>
                    <div className="mod-row-extra">
                      <span className="mod-tag">Criptografia Argon2id / Hash Seguro</span>
                    </div>
                  </div>
                  <div className="mod-row">
                    <span className="mod-row-icon">
                      <IdIcon />
                    </span>
                    <div className="mod-row-text">
                      <small>CPF:</small>
                      <code>***.***.***-XX</code>
                    </div>
                    <div className="mod-row-extra">
                      <span className="mod-pill amber">Receita Federal: {person.cpfStatus}</span>
                      <button
                        type="button"
                        className="mod-link"
                        onClick={() =>
                          notify(
                            'Consulta simulada: nenhuma base externa é acessada nesta demonstração.',
                          )
                        }
                      >
                        Consultar Base
                      </button>
                    </div>
                  </div>

                  <div className="mod-meta">
                    <div className="mod-meta-box">
                      <h3>Metadados de Conexão</h3>
                      <p>
                        <span>IP:</span> {person.ip} ({person.city})
                      </p>
                      <p>
                        <span>Dispositivo:</span> {person.device}
                      </p>
                    </div>
                    <div className="mod-meta-box mod-proof">
                      <div>
                        <h3>Comprovante de Identidade</h3>
                        <p>
                          Documento anexado: <br />
                          {person.document}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button outline"
                        onClick={() => setPreview(true)}
                      >
                        Visualizar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mod-decision">
                  <h2>{isOpen ? 'Deseja aceitar?' : 'Decisão registrada'}</h2>
                  <p className="mod-lead">
                    Avaliação decisória do moderador para permissão de compras e trocas na
                    plataforma Troca Ticket.
                  </p>
                  {isOpen ? (
                    <>
                      <div className="mod-checks">
                        {CRITERIA.map((label, i) => (
                          <label key={label}>
                            <input
                              type="checkbox"
                              checked={checks[i]}
                              onChange={(e) =>
                                setChecks((old) =>
                                  old.map((value, j) => (j === i ? e.target.checked : value)),
                                )
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <label className="mod-notes" htmlFor="moderation-note">
                        Notas do moderador:
                      </label>
                      <textarea
                        id="moderation-note"
                        rows={3}
                        placeholder="Insira o motivo caso vá recusar…"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      {error && (
                        <p role="alert" className="field-error">
                          {error}
                        </p>
                      )}
                      <p className="mod-action-label">AÇÃO IMEDIATA</p>
                      <div className="mod-actions">
                        <button
                          type="button"
                          className="approve"
                          aria-keyshortcuts="V"
                          onClick={() => decision('Aprovado')}
                        >
                          <CheckIcon />
                          <span>
                            Aprovar
                            <br />
                            (V)
                          </span>
                        </button>
                        <button
                          type="button"
                          className="reject"
                          aria-keyshortcuts="X"
                          onClick={() => decision('Recusado')}
                        >
                          <CrossIcon />
                          <span>
                            Recusar
                            <br />
                            (X)
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={`mod-status ${current.tone}`}>
                        <i aria-hidden="true" />
                        {current.badge}
                      </span>
                      <p>{person.note || 'Sem observações.'}</p>
                      <button
                        type="button"
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
            </section>
          ) : (
            <section className="panel">
              <Empty title="Fila concluída">
                Nenhum cadastro corresponde aos filtros selecionados.
              </Empty>
            </section>
          )}
        </div>

        <aside>
          <section className="mod-queue" aria-label="Fila de espera">
            <div className="mod-queue-head">
              <div>
                <h2>Fila de Espera</h2>
                <p>Cadastros por ordem cronológica</p>
              </div>
              <span className="mod-count">
                {visible.length} de {people.length}
              </span>
            </div>
            {visible.length ? (
              <ul>
                {visible.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={person?.id === p.id ? 'active' : ''}
                      aria-current={person?.id === p.id}
                      onClick={() => select(p.id)}
                    >
                      <span className="mod-avatar">{initials(p.name)}</span>
                      <span className="mod-queue-name">
                        <strong>{p.name}</strong>
                        <small>@{p.username}</small>
                      </span>
                      {person?.id === p.id ? (
                        <span className="mod-focus">Em Foco</span>
                      ) : (
                        <time>{p.time}</time>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mod-queue-empty">Nenhum cadastro nesta seleção.</p>
            )}
            <div className="mod-pager">
              <span>
                Página <strong>{currentPage + 1}</strong> de {pages}
              </span>
              <div>
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => setQueuePage(currentPage - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={currentPage >= pages - 1}
                  onClick={() => setQueuePage(currentPage + 1)}
                >
                  Próximo
                </button>
              </div>
            </div>
          </section>
          <div className="mod-audit">
            <h3>
              <InfoIcon /> Regras de Auditoria Troca Ticket
            </h3>
            <p>
              Cadastros aprovados têm liberação imediata para anunciar ingressos nominais.
              Certifique-se da consistência entre nome registrado e documento oficial. As decisões
              ficam salvas apenas neste navegador.
            </p>
          </div>
        </aside>
      </div>

      {preview && person && (
        <Modal title="Comprovante de Identidade" onClose={() => setPreview(false)}>
          <p>
            <strong>{person.document}</strong>
          </p>
          <p className="muted">
            Pré-visualização indisponível na demonstração: nenhum documento real é enviado ou
            armazenado.
          </p>
          <button type="button" className="button outline" onClick={() => setPreview(false)}>
            Fechar
          </button>
        </Modal>
      )}
    </div>
  );
}
