import React, { useEffect, useState } from 'react';
import { Badge, Empty, Modal, PageTitle } from '../../components/UI';
import { useStore } from '../../context/Store';
import { initialsOf } from '../../utils/format';
import useGravacao from '../../utils/useGravacao';
import {
  PERFIL_CONTA,
  SITUACAO_CONTA,
  dataHoraBrasilia,
  decidirConta,
  documentoFormatado,
  documentoOculto,
  listarContas,
  resumoAdmin,
} from '../../services/admin';

// Aprovação de contas com os dados do banco (etapa 6). A moderação de demonstração continua em
// pages/Moderation.jsx. Organizador e fornecedor só publicam e negociam depois da aprovação;
// recusar exige motivo, que fica no histórico e aparece para a própria conta.

const FILTROS = [
  ['P', 'Aguardando'],
  ['A', 'Aprovadas'],
  ['R', 'Recusadas'],
  ['', 'Todas'],
];
const PERFIS = [
  ['', 'Todos os perfis'],
  ['2', 'Organizadores'],
  ['3', 'Fornecedores'],
  ['1', 'Usuários'],
  ['4', 'Administração'],
];
const MENSAGEM = {
  A: 'Conta aprovada. As ações foram liberadas.',
  R: 'Conta recusada. O motivo ficou no histórico.',
  P: 'Conta voltou para a análise.',
};

export default function AprovacoesAdmin() {
  const { data, notify } = useStore();
  const meuId = Number(data.profile?.id);
  const [situacao, setSituacao] = useState('P');
  const [perfil, setPerfil] = useState('');
  const [busca, setBusca] = useState('');
  const [termo, setTermo] = useState('');
  const [contas, setContas] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [documentos, setDocumentos] = useState({});
  const [recusando, setRecusando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [erroDecisao, setErroDecisao] = useState('');
  const gravacao = useGravacao();
  const ocupado = Boolean(gravacao.ocupado);

  useEffect(() => {
    const controller = new AbortController();
    setErro('');
    setContas(null);
    listarContas({ situacao, perfil, busca: termo }, controller.signal)
      .then(setContas)
      .catch((error) => {
        if (!controller.signal.aborted) setErro(error.message);
      });
    return () => controller.abort();
  }, [situacao, perfil, termo, tentativa]);

  useEffect(() => {
    const controller = new AbortController();
    resumoAdmin(controller.signal)
      .then(setResumo)
      .catch(() => {});
    return () => controller.abort();
  }, [tentativa]);

  const podeDecidir = (conta) => conta.profile !== 'admin' && conta.id !== meuId;

  async function decidir(conta, nova, texto = '') {
    setErroDecisao('');
    const resultado = await gravacao.gravar(`decidir:${conta.id}:${nova}:${texto}`, (chave) =>
      decidirConta(conta.id, { situacao: nova, motivo: texto }, chave),
    );
    if (resultado?.erro) {
      setErroDecisao(resultado.erro);
      if (!recusando) notify(resultado.erro);
      return false;
    }
    if (resultado?.resposta) {
      const atualizada = resultado.resposta;
      setContas((lista) =>
        (lista || [])
          .map((item) => (item.id === atualizada.id ? atualizada : item))
          .filter((item) => !situacao || item.approval === situacao),
      );
      notify(MENSAGEM[nova]);
      resumoAdmin()
        .then(setResumo)
        .catch(() => {});
      return true;
    }
    return false;
  }

  async function confirmarRecusa(event) {
    event.preventDefault();
    const texto = motivo.trim();
    if (texto.length < 3) {
      setErroDecisao('Informe o motivo da recusa (pelo menos 3 caracteres).');
      return;
    }
    if (await decidir(recusando, 'R', texto)) {
      setRecusando(null);
      setMotivo('');
    }
  }

  const contagem = {
    P: resumo?.pendingAccounts,
    R: resumo?.rejectedAccounts,
  };

  return (
    <div className="workspace admin-approvals">
      <PageTitle
        title="Aprovação de contas"
        subtitle="O cadastro público nunca cria administradores. Organizadores e fornecedores publicam e negociam só depois da aprovação."
      />

      <div className="mod-toolbar">
        <form
          className="mod-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setTermo(busca);
          }}
        >
          <input
            aria-label="Buscar por nome, e-mail ou organização"
            placeholder="Buscar por nome, e-mail ou organização…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button type="submit" className="button outline tiny">
            Buscar
          </button>
        </form>
        <div className="mod-chips" role="group" aria-label="Filtrar por situação">
          {FILTROS.map(([valor, nome]) => (
            <button
              type="button"
              key={nome}
              className={`mod-chip ${valor ? SITUACAO_CONTA[valor][1] : 'blue'} ${
                situacao === valor ? 'active' : ''
              }`}
              aria-pressed={situacao === valor}
              onClick={() => setSituacao(valor)}
            >
              <i aria-hidden="true" />
              {nome}
              {contagem[valor] !== undefined && <b>{contagem[valor]}</b>}
            </button>
          ))}
        </div>
        <label className="admin-profile-filter">
          Perfil:
          <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
            {PERFIS.map(([valor, nome]) => (
              <option key={nome} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="dashboard-layout mod-layout">
        <section className="panel" aria-labelledby="contas-titulo">
          <div className="panel-heading">
            <div>
              <h2 id="contas-titulo">Contas</h2>
              <p>
                {termo ? `Busca: “${termo}” · ` : ''}
                {contas ? `${contas.length} ${contas.length === 1 ? 'conta' : 'contas'}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="button outline tiny"
              onClick={() => setTentativa((n) => n + 1)}
            >
              Atualizar
            </button>
          </div>
          {erro && (
            <p role="alert" className="api-error">
              {erro}
            </p>
          )}
          {!contas && !erro && <p role="status">Carregando contas…</p>}
          {contas &&
            (contas.length ? (
              <ul className="approval-list">
                {contas.map((conta) => {
                  const [rotulo, tom] = SITUACAO_CONTA[conta.approval] || [conta.approval, 'blue'];
                  const empresa = ['organizador', 'fornecedor'].includes(conta.profile);
                  const visivel = Boolean(documentos[conta.id]);
                  return (
                    <li key={conta.id} className="approval-card">
                      <div className="approval-card-head">
                        <span className="mod-avatar" aria-hidden="true">
                          {initialsOf(conta.name)}
                        </span>
                        <div>
                          <h3>{conta.name}</h3>
                          <p className="muted">
                            {PERFIL_CONTA[conta.profile] || conta.profile} · conta nº {conta.id} ·
                            cadastro em {dataHoraBrasilia(conta.createdAt)}
                          </p>
                        </div>
                        <Badge tone={tom}>{rotulo}</Badge>
                      </div>
                      <dl className="approval-facts">
                        <div>
                          <dt>E-mail</dt>
                          <dd>{conta.email}</dd>
                        </div>
                        {empresa && (
                          <div>
                            <dt>
                              {conta.profile === 'fornecedor' ? 'Nome fantasia' : 'Organização'}
                            </dt>
                            <dd>{conta.organization || 'Não informado'}</dd>
                          </div>
                        )}
                        {empresa && (
                          <div>
                            <dt>CPF / CNPJ</dt>
                            <dd>
                              <code>
                                {visivel
                                  ? documentoFormatado(conta.document)
                                  : documentoOculto(conta.document)}
                              </code>{' '}
                              {conta.document && (
                                <button
                                  type="button"
                                  className="mod-link"
                                  aria-pressed={visivel}
                                  aria-label={`${visivel ? 'Ocultar' : 'Mostrar'} o documento de ${conta.name}`}
                                  onClick={() =>
                                    setDocumentos((atual) => ({ ...atual, [conta.id]: !visivel }))
                                  }
                                >
                                  {visivel ? 'Ocultar' : 'Mostrar'}
                                </button>
                              )}
                            </dd>
                          </div>
                        )}
                        {conta.lastDecision && (
                          <div>
                            <dt>Última decisão</dt>
                            <dd>
                              {(SITUACAO_CONTA[conta.lastDecision.approval] || [''])[0]} em{' '}
                              {dataHoraBrasilia(conta.lastDecision.at)}
                              {conta.lastDecision.by ? ` por ${conta.lastDecision.by}` : ''}
                              {conta.lastDecision.reason ? ` · ${conta.lastDecision.reason}` : ''}
                            </dd>
                          </div>
                        )}
                      </dl>
                      {podeDecidir(conta) ? (
                        <div className="actions approval-actions">
                          {conta.approval !== 'A' && (
                            <button
                              type="button"
                              className="button primary"
                              disabled={ocupado}
                              aria-label={`Aprovar a conta de ${conta.name}`}
                              onClick={() => decidir(conta, 'A')}
                            >
                              Aprovar
                            </button>
                          )}
                          {conta.approval !== 'R' && (
                            <button
                              type="button"
                              className="button danger-outline"
                              disabled={ocupado}
                              aria-label={`Recusar a conta de ${conta.name}`}
                              onClick={() => {
                                setErroDecisao('');
                                setMotivo('');
                                setRecusando(conta);
                              }}
                            >
                              Recusar
                            </button>
                          )}
                          {conta.approval !== 'P' && (
                            <button
                              type="button"
                              className="button outline"
                              disabled={ocupado}
                              aria-label={`Voltar para análise: conta de ${conta.name}`}
                              onClick={() => decidir(conta, 'P')}
                            >
                              Voltar para análise
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="muted">
                          {conta.id === meuId
                            ? 'Esta é a sua conta: a situação dela não muda por aqui.'
                            : 'Contas de administração são criadas e mantidas pelo script do servidor.'}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Nenhuma conta nesta seleção" heading="h3">
                {situacao === 'P'
                  ? 'Nenhuma conta aguardando aprovação no momento.'
                  : 'Ajuste os filtros ou a busca para encontrar outras contas.'}
              </Empty>
            ))}
        </section>

        <aside>
          <div className="mod-audit">
            <h3>Regras da aprovação</h3>
            <ul>
              <li>Contas de usuário já nascem aprovadas; organizador e fornecedor aguardam.</li>
              <li>
                Enquanto aguarda, a conta consulta os dados, edita o perfil e prepara rascunhos.
              </li>
              <li>Recusar exige motivo: ele fica no histórico e aparece para a conta.</li>
              <li>Conta recusada só consulta; nada é apagado e a decisão pode ser revista.</li>
              <li>Administração não muda a própria conta nem outras contas de administração.</li>
            </ul>
          </div>
        </aside>
      </div>

      {recusando && (
        <Modal
          title={`Recusar a conta de ${recusando.name}?`}
          onClose={() => !ocupado && setRecusando(null)}
        >
          <form className="cancel-event-form" onSubmit={confirmarRecusa} noValidate>
            <p>
              A conta continua existindo, mas não grava nada até uma nova decisão. O motivo aparece
              para a própria conta.
            </p>
            <label htmlFor="motivo-recusa">Motivo da recusa</label>
            <textarea
              id="motivo-recusa"
              required
              minLength={3}
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={Boolean(erroDecisao)}
              aria-describedby={erroDecisao ? 'motivo-recusa-erro' : undefined}
            />
            {erroDecisao && (
              <p id="motivo-recusa-erro" role="alert" className="field-error">
                {erroDecisao}
              </p>
            )}
            <div className="actions">
              <button
                type="button"
                className="button outline"
                disabled={ocupado}
                onClick={() => setRecusando(null)}
              >
                Voltar
              </button>
              <button type="submit" className="button danger" disabled={ocupado}>
                {ocupado ? 'Registrando…' : 'Recusar conta'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
