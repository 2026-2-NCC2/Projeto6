import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge, Empty, PageTitle, Panel, money } from '../components/UI';
import { useStore } from '../context/Store';
import { criarChave, listarPedidos } from '../services/orders';
import {
  SITUACAO_ATENDIMENTO,
  abrirAtendimento,
  horaBrasilia,
  listarAtendimentos,
  responderAtendimento,
} from '../services/portaria';

// Atendimento (etapa 5): a conta de usuário abre solicitações ligadas a um pedido ou denuncia um
// anúncio; a organização do evento responde e muda a situação. Sem chat em tempo real nem e-mail.

// Grava com Idempotency-Key; a mesma chave é reusada se a API não respondeu (pode ter gravado).
function useGravacao() {
  const chaves = useRef(new Map());
  const [ocupado, setOcupado] = useState('');
  async function gravar(nome, acao) {
    if (ocupado) return null;
    if (!chaves.current.has(nome)) chaves.current.set(nome, criarChave());
    setOcupado(nome);
    try {
      const resposta = await acao(chaves.current.get(nome));
      chaves.current.delete(nome);
      return { resposta };
    } catch (error) {
      if (!error.semResposta) chaves.current.delete(nome);
      return { erro: error.message };
    } finally {
      setOcupado('');
    }
  }
  return { gravar, ocupado };
}

function Conversa({ item, organizador, gravacao, aoAtualizar }) {
  const [texto, setTexto] = useState('');
  const [situacao, setSituacao] = useState(item.status);
  const [erro, setErro] = useState('');
  const [rotulo, tom] = SITUACAO_ATENDIMENTO[item.status] || [item.status, 'blue'];
  const idTexto = `resposta-${item.id}`;

  async function responder(event) {
    event.preventDefault();
    setErro('');
    const dados = {
      message: texto.trim(),
      ...(item.canChangeStatus && situacao !== item.status ? { status: situacao } : {}),
    };
    const r = await gravacao.gravar(`responder:${item.id}:${JSON.stringify(dados)}`, (chave) =>
      responderAtendimento(item.id, dados, chave),
    );
    if (r?.erro) setErro(r.erro);
    if (r?.resposta) {
      setTexto('');
      aoAtualizar(r.resposta);
    }
  }

  return (
    <li className="support-thread">
      <div className="support-thread-head">
        <h3>{item.subject}</h3>
        <Badge tone={tom}>{rotulo}</Badge>
      </div>
      <p className="muted">
        {item.eventTitle} ·{' '}
        {item.orderId ? `Pedido nº ${item.orderId}` : `Anúncio nº ${item.listingId}`}
        {organizador && ` · aberto por ${item.requesterName}`}
      </p>
      <ol className="support-messages" aria-label={`Mensagens de "${item.subject}"`}>
        {item.messages.map((mensagem) => (
          <li key={mensagem.id} className={mensagem.author === 'organizacao' ? 'from-team' : ''}>
            <small>
              {mensagem.author === 'organizacao'
                ? `Organização do evento (${mensagem.authorName})`
                : organizador
                  ? mensagem.authorName
                  : 'Você'}{' '}
              · {horaBrasilia(mensagem.createdAt)}
            </small>
            <p>{mensagem.message}</p>
          </li>
        ))}
      </ol>
      {item.canReply ? (
        <form className="support-reply" onSubmit={responder}>
          <label htmlFor={idTexto}>{organizador ? 'Resposta da organização' : 'Responder'}</label>
          <textarea
            id={idTexto}
            required
            minLength={2}
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {item.canChangeStatus && (
            <>
              <label htmlFor={`situacao-${item.id}`}>Situação</label>
              <select
                id={`situacao-${item.id}`}
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
              >
                {Object.entries(SITUACAO_ATENDIMENTO).map(([valor, [nome]]) => (
                  <option key={valor} value={valor}>
                    {nome}
                  </option>
                ))}
              </select>
            </>
          )}
          {erro && (
            <p role="alert" className="field-error">
              {erro}
            </p>
          )}
          <button type="submit" className="button primary" disabled={Boolean(gravacao.ocupado)}>
            {organizador ? 'Enviar resposta' : 'Enviar mensagem'}
          </button>
        </form>
      ) : (
        <p className="muted">Atendimento encerrado. Se precisar, abra uma nova solicitação.</p>
      )}
    </li>
  );
}

function NovaSolicitacao({ pedidos, gravacao, aoCriar }) {
  const [params] = useSearchParams();
  const inicialAnuncio = params.get('anuncio') || '';
  const [tipo, setTipo] = useState(inicialAnuncio ? 'anuncio' : 'pedido');
  const [pedido, setPedido] = useState(params.get('pedido') || '');
  const [anuncio, setAnuncio] = useState(inicialAnuncio);
  const [assunto, setAssunto] = useState(inicialAnuncio ? 'Denúncia de anúncio' : '');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function enviar(event) {
    event.preventDefault();
    setErro('');
    setAviso('');
    const dados = {
      ...(tipo === 'pedido' ? { orderId: Number(pedido) } : { listingId: Number(anuncio) }),
      subject: assunto.trim(),
      message: mensagem.trim(),
    };
    const r = await gravacao.gravar(`abrir:${JSON.stringify(dados)}`, (chave) =>
      abrirAtendimento(dados, chave),
    );
    if (r?.erro) setErro(r.erro);
    if (r?.resposta) {
      setMensagem('');
      setAssunto('');
      setAviso('Solicitação registrada. A organização do evento responde por aqui.');
      aoCriar(r.resposta);
    }
  }

  return (
    <Panel title="Abrir solicitação">
      <form className="support-form" onSubmit={enviar}>
        <label htmlFor="atendimento-tipo">Sobre</label>
        <select id="atendimento-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="pedido">Um pedido meu</option>
          <option value="anuncio">Um anúncio de revenda (denúncia ou dúvida)</option>
        </select>
        {tipo === 'pedido' ? (
          <>
            <label htmlFor="atendimento-pedido">Pedido</label>
            <select
              id="atendimento-pedido"
              required
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
            >
              <option value="">Selecione um pedido</option>
              {pedidos.map((item) => (
                <option key={item.id} value={item.id}>
                  Pedido nº {item.id} · {item.eventTitle} · {money(item.total)}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label htmlFor="atendimento-anuncio">Número do anúncio</label>
            <input
              id="atendimento-anuncio"
              type="number"
              min="1"
              step="1"
              required
              value={anuncio}
              onChange={(e) => setAnuncio(e.target.value)}
            />
          </>
        )}
        <label htmlFor="atendimento-assunto">Assunto</label>
        <input
          id="atendimento-assunto"
          required
          minLength={3}
          maxLength={150}
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
        />
        <label htmlFor="atendimento-mensagem">Mensagem</label>
        <textarea
          id="atendimento-mensagem"
          required
          minLength={3}
          maxLength={2000}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
        <p className="muted">
          Não envie documentos, dados de pagamento ou informações pessoais reais.
        </p>
        {erro && (
          <p role="alert" className="field-error">
            {erro}
          </p>
        )}
        {aviso && <p role="status">{aviso}</p>}
        <button type="submit" className="button primary" disabled={Boolean(gravacao.ocupado)}>
          Enviar solicitação
        </button>
      </form>
    </Panel>
  );
}

function Atendimentos({ organizador }) {
  const [itens, setItens] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const gravacao = useGravacao();

  useEffect(() => {
    const controller = new AbortController();
    setErro('');
    Promise.all([
      listarAtendimentos(controller.signal),
      organizador ? Promise.resolve([]) : listarPedidos(controller.signal),
    ])
      .then(([lista, meusPedidos]) => {
        setItens(lista);
        setPedidos(meusPedidos);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErro(error.message);
      });
    return () => controller.abort();
  }, [organizador, tentativa]);

  const atualizarItem = useCallback((novo) => {
    setItens((lista) => [novo, ...(lista || []).filter((item) => item.id !== novo.id)]);
  }, []);

  return (
    <div className={organizador ? '' : 'support-layout'}>
      {!organizador && (
        <NovaSolicitacao pedidos={pedidos} gravacao={gravacao} aoCriar={atualizarItem} />
      )}
      <Panel
        title={organizador ? 'Solicitações recebidas' : 'Suas solicitações'}
        action={
          <button
            type="button"
            className="button outline tiny"
            onClick={() => setTentativa((n) => n + 1)}
          >
            Atualizar
          </button>
        }
      >
        {erro && (
          <p role="alert" className="api-error">
            {erro}
          </p>
        )}
        {!itens && !erro && <p role="status">Carregando atendimentos…</p>}
        {itens &&
          (itens.length ? (
            <ul className="support-list">
              {itens.map((item) => (
                <Conversa
                  key={item.id}
                  item={item}
                  organizador={organizador}
                  gravacao={gravacao}
                  aoAtualizar={atualizarItem}
                />
              ))}
            </ul>
          ) : (
            <p>
              {organizador
                ? 'Nenhuma solicitação sobre os seus eventos.'
                : 'Você ainda não abriu nenhuma solicitação.'}
            </p>
          ))}
      </Panel>
    </div>
  );
}

export default function Support() {
  const { role, isAuthenticated } = useStore();
  const organizador = role === 'organizador';
  const permitido = isAuthenticated && ['comprador', 'organizador'].includes(role);
  return (
    <div className="workspace">
      <PageTitle
        title={organizador ? 'Atendimentos' : 'Atendimento'}
        subtitle={
          organizador
            ? 'Solicitações e denúncias sobre os seus eventos. Responda e atualize a situação.'
            : 'Fale com a organização do evento sobre um pedido ou denuncie um anúncio de revenda.'
        }
      >
        {organizador ? (
          <Link className="button outline" to="/organizador/portaria">
            Portaria
          </Link>
        ) : (
          <Link className="button outline" to="/pedidos">
            Meus pedidos
          </Link>
        )}
      </PageTitle>
      {permitido ? (
        <Atendimentos organizador={organizador} />
      ) : (
        <Empty
          title="Entre com uma conta de usuário ou de organizador para usar o atendimento."
          heading="h2"
        >
          O atendimento guarda as mensagens no banco de dados; o modo demonstração não tem
          atendimento.
        </Empty>
      )}
    </div>
  );
}
