import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Badge, Empty, PageTitle, Panel, money } from '../components/UI';
import { useStore } from '../context/Store';
import { listarPedidos } from '../services/orders';
import useGravacao from '../utils/useGravacao';
import {
  SITUACAO_ATENDIMENTO,
  abrirAtendimento,
  horaBrasilia,
  listarAtendimentos,
  responderAtendimento,
} from '../services/portaria';
import { t } from '../i18n';

// Atendimento (etapa 5): a conta de usuário abre solicitações ligadas a um pedido ou denuncia um
// anúncio; a organização do evento responde e muda a situação. Desde a etapa 6, a administração
// vê todas as solicitações e também responde. Sem chat em tempo real nem e-mail.
// modo: 'usuario' (quem abre), 'organizador' (do evento) ou 'admin' (administração).

function autorDaMensagem(mensagem, equipe) {
  const { authorName } = mensagem;
  if (mensagem.author === 'organizacao')
    return t('Organização do evento ({authorName})', { authorName });
  if (mensagem.author === 'administracao') return t('Administração ({authorName})', { authorName });
  return equipe ? authorName : t('Você');
}

function Conversa({ item, modo, gravacao, aoAtualizar }) {
  const equipe = modo !== 'usuario';
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
        <Badge tone={tom}>{t(rotulo)}</Badge>
      </div>
      <p className="muted">
        {item.eventTitle} ·{' '}
        {item.orderId
          ? t('Pedido nº {orderId}', { orderId: item.orderId })
          : t('Anúncio nº {listingId}', { listingId: item.listingId })}
        {equipe && t(' · aberto por {requesterName}', { requesterName: item.requesterName })}
      </p>
      <ol
        className="support-messages"
        aria-label={t('Mensagens de "{subject}"', { subject: item.subject })}
      >
        {item.messages.map((mensagem) => (
          <li
            key={mensagem.id}
            className={
              mensagem.author === 'administracao'
                ? 'from-team from-admin'
                : mensagem.author === 'organizacao'
                  ? 'from-team'
                  : ''
            }
          >
            <small>
              {autorDaMensagem(mensagem, equipe)} · {horaBrasilia(mensagem.createdAt)}
            </small>
            <p>{mensagem.message}</p>
          </li>
        ))}
      </ol>
      {item.canReply ? (
        <form className="support-reply" onSubmit={responder}>
          <label htmlFor={idTexto}>
            {modo === 'admin'
              ? t('Resposta da administração')
              : modo === 'organizador'
                ? t('Resposta da organização')
                : t('Responder')}
          </label>
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
              <label htmlFor={`situacao-${item.id}`}>{t('Situação')}</label>
              <select
                id={`situacao-${item.id}`}
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
              >
                {Object.entries(SITUACAO_ATENDIMENTO).map(([valor, [nome]]) => (
                  <option key={valor} value={valor}>
                    {t(nome)}
                  </option>
                ))}
              </select>
            </>
          )}
          {erro && (
            <p role="alert" className="field-error">
              {t(erro)}
            </p>
          )}
          <button type="submit" className="button primary" disabled={Boolean(gravacao.ocupado)}>
            {equipe ? t('Enviar resposta') : t('Enviar mensagem')}
          </button>
        </form>
      ) : (
        <p className="muted">
          {t('Atendimento encerrado. Se precisar, abra uma nova solicitação.')}
        </p>
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
  const [assunto, setAssunto] = useState(inicialAnuncio ? t('Denúncia de anúncio') : '');
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
      setAviso(
        'Solicitação registrada. A organização do evento ou a administração responde por aqui.',
      );
      aoCriar(r.resposta);
    }
  }

  return (
    <Panel title={t('Abrir solicitação')}>
      <form className="support-form" onSubmit={enviar}>
        <label htmlFor="atendimento-tipo">{t('Sobre')}</label>
        <select id="atendimento-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="pedido">{t('Um pedido meu')}</option>
          <option value="anuncio">{t('Um anúncio de revenda (denúncia ou dúvida)')}</option>
        </select>
        {tipo === 'pedido' ? (
          <>
            <label htmlFor="atendimento-pedido">{t('Pedido')}</label>
            <select
              id="atendimento-pedido"
              required
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
            >
              <option value="">{t('Selecione um pedido')}</option>
              {pedidos.map((item) => (
                <option key={item.id} value={item.id}>
                  {t('Pedido nº')} {item.id} · {item.eventTitle} · {money(item.total)}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label htmlFor="atendimento-anuncio">{t('Número do anúncio')}</label>
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
        <label htmlFor="atendimento-assunto">{t('Assunto')}</label>
        <input
          id="atendimento-assunto"
          required
          minLength={3}
          maxLength={150}
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
        />
        <label htmlFor="atendimento-mensagem">{t('Mensagem')}</label>
        <textarea
          id="atendimento-mensagem"
          required
          minLength={3}
          maxLength={2000}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
        <p className="muted">
          {t('Não envie documentos, dados de pagamento ou informações pessoais reais.')}
        </p>
        {erro && (
          <p role="alert" className="field-error">
            {t(erro)}
          </p>
        )}
        {aviso && <p role="status">{t(aviso)}</p>}
        <button type="submit" className="button primary" disabled={Boolean(gravacao.ocupado)}>
          {t('Enviar solicitação')}
        </button>
      </form>
    </Panel>
  );
}

function Atendimentos({ modo }) {
  const equipe = modo !== 'usuario';
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
      equipe ? Promise.resolve([]) : listarPedidos(controller.signal),
    ])
      .then(([lista, meusPedidos]) => {
        setItens(lista);
        setPedidos(meusPedidos);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErro(error.message);
      });
    return () => controller.abort();
  }, [equipe, tentativa]);

  const atualizarItem = useCallback((novo) => {
    setItens((lista) => [novo, ...(lista || []).filter((item) => item.id !== novo.id)]);
  }, []);

  return (
    <div className={equipe ? '' : 'support-layout'}>
      {!equipe && <NovaSolicitacao pedidos={pedidos} gravacao={gravacao} aoCriar={atualizarItem} />}
      <Panel
        title={equipe ? t('Solicitações recebidas') : t('Suas solicitações')}
        action={
          <button
            type="button"
            className="button outline tiny"
            onClick={() => setTentativa((n) => n + 1)}
          >
            {t('Atualizar')}
          </button>
        }
      >
        {erro && (
          <p role="alert" className="api-error">
            {t(erro)}
          </p>
        )}
        {!itens && !erro && <p role="status">{t('Carregando atendimentos…')}</p>}
        {itens &&
          (itens.length ? (
            <ul className="support-list">
              {itens.map((item) => (
                <Conversa
                  key={item.id}
                  item={item}
                  modo={modo}
                  gravacao={gravacao}
                  aoAtualizar={atualizarItem}
                />
              ))}
            </ul>
          ) : (
            <p>
              {modo === 'admin'
                ? t('Nenhuma solicitação na plataforma.')
                : modo === 'organizador'
                  ? t('Nenhuma solicitação sobre os seus eventos.')
                  : t('Você ainda não abriu nenhuma solicitação.')}
            </p>
          ))}
      </Panel>
    </div>
  );
}

export default function Support() {
  const { role, isAuthenticated } = useStore();
  const modo = role === 'admin' ? 'admin' : role === 'organizador' ? 'organizador' : 'usuario';
  const permitido = isAuthenticated && ['comprador', 'organizador', 'admin'].includes(role);
  return (
    <div className="workspace">
      <PageTitle
        title={modo === 'usuario' ? t('Atendimento') : t('Atendimentos')}
        subtitle={
          modo === 'admin'
            ? t(
                'Todas as solicitações e denúncias da plataforma. A administração responde e muda a situação.',
              )
            : modo === 'organizador'
              ? t('Solicitações e denúncias sobre os seus eventos. Responda e atualize a situação.')
              : t(
                  'Fale com a organização do evento sobre um pedido ou denuncie um anúncio de revenda. A administração também acompanha.',
                )
        }
      >
        {modo === 'admin' ? (
          <Link className="button outline" to="/admin">
            {t('Painel geral')}
          </Link>
        ) : modo === 'organizador' ? (
          <Link className="button outline" to="/organizador/portaria">
            {t('Portaria')}
          </Link>
        ) : (
          <Link className="button outline" to="/pedidos">
            {t('Meus pedidos')}
          </Link>
        )}
      </PageTitle>
      {permitido ? (
        <Atendimentos modo={modo} />
      ) : (
        <Empty
          title={t(
            'Entre com uma conta de usuário, de organizador ou de administração para usar o atendimento.',
          )}
          heading="h2"
        >
          {t(
            'O atendimento guarda as mensagens no banco de dados; o modo demonstração não tem atendimento.',
          )}
        </Empty>
      )}
    </div>
  );
}
