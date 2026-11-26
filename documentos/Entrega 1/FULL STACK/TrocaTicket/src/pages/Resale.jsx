import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Badge, Empty, PageTitle, Panel, money } from '../components/UI';
import { useStore } from '../context/Store';
import { criarChave, request } from '../services/orders';
import { getParticipantTickets } from '../services/tickets';

const situacoes = {
  active: 'Disponível', reserved: 'Reservado', sold: 'Vendido', cancelled: 'Cancelado',
  queued: 'Na fila', completed: 'Concluído', left: 'Saiu da fila', pending: 'Aguardando aceite',
  accepted: 'Aceito', rejected: 'Recusado', expired: 'Expirado',
};

const ler = (rota, signal) => request(rota, { signal }, 'Falha ao carregar os repasses.');

function useRepasses(carregar) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const chaves = useRef(new Map());
  const atualizando = useRef(false);
  const atualizar = () => setTentativa((n) => n + 1);

  useEffect(() => {
    const controller = new AbortController();
    setDados(null);
    setErro('');
    carregar(controller.signal)
      .then((lista) => { if (!controller.signal.aborted) setDados(lista); })
      .catch((error) => { if (!controller.signal.aborted) setErro(error.message); });
    return () => controller.abort();
  }, [carregar, tentativa]);

  async function gravar(rota, corpo = {}, metodo = 'POST') {
    if (atualizando.current) return false;
    atualizando.current = true;
    setErro('');
    setOcupado(true);
    const acao = JSON.stringify([metodo, rota, corpo]);
    if (!chaves.current.has(acao)) chaves.current.set(acao, criarChave());
    try {
      await request(rota, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': chaves.current.get(acao) },
        body: JSON.stringify(corpo),
      }, 'Não foi possível concluir a operação.');
      chaves.current.delete(acao);
      atualizar();
      return true;
    } catch (error) {
      if (!error.semResposta) chaves.current.delete(acao);
      setErro(error.message);
      return false;
    } finally {
      atualizando.current = false;
      setOcupado(false);
    }
  }
  return { dados, erro, ocupado, gravar, atualizar };
}

function Estado({ estado }) {
  if (estado.erro) return <div role="alert" className="api-error">{estado.erro}
    <button className="button outline tiny" onClick={estado.atualizar}>Atualizar</button>
  </div>;
  if (!estado.dados) return <p role="status">Carregando repasses…</p>;
  return null;
}

function ItemFila({ item, estado }) {
  return (
    <li className="resale-item">
      <span className="resale-item-text">
        <strong>{item.eventTitle}</strong>
        <small>
          {item.type} · {situacoes[item.status] || item.status}
          {item.status === 'queued' && item.position != null && ` · Posição ${item.position}`}
        </small>
      </span>
      {item.status === 'queued' && <button className="button outline tiny" disabled={estado.ocupado}
        onClick={() => estado.gravar(`/fila/${item.id}`, {}, 'DELETE')}>Sair da fila</button>}
      {item.status === 'reserved' && <Link className="button primary tiny" to="/pedidos">Abrir reserva</Link>}
    </li>
  );
}

export function EventResale({ eventId, userId }) {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('Inteira');
  const [declarou, setDeclarou] = useState(false);
  const carregar = useCallback(async (signal) => {
    const [anuncios, fila] = await Promise.all([ler(`/anuncios?eventId=${eventId}`, signal), ler('/fila', signal)]);
    return { anuncios, fila: fila.filter((item) => item.eventId === eventId) };
  }, [eventId]);
  const estado = useRepasses(carregar);
  const { dados, ocupado, gravar } = estado;
  const inscritos = dados?.fila.filter((item) => item.type === tipo && ['queued', 'reserved'].includes(item.status)) || [];
  const visiveis = dados?.anuncios.filter((item) => item.type === tipo && item.status === 'active') || [];
  const meia = tipo === 'Meia-entrada';
  return (
    <Panel title="Revenda e fila de espera">
      <Estado estado={estado} />
      {dados && <>
        <label htmlFor="tipo-repasse">Tipo de ingresso para repasse</label>
        <select id="tipo-repasse" value={tipo} onChange={(e) => { setTipo(e.target.value); setDeclarou(false); }}>
          <option>Inteira</option><option>Meia-entrada</option>
        </select>
        {meia && <label className="checkbox"><input type="checkbox" checked={declarou}
          onChange={(e) => setDeclarou(e.target.checked)} />Declaro ter direito à meia-entrada neste repasse.</label>}
        {visiveis.length ? <ul className="resale-list" aria-label="Anúncios de revenda">{visiveis.map((item) =>
          <li key={item.id} className="resale-item">
            <span className="resale-item-text"><strong>{money(item.priceCents / 100)}</strong>
              <small>{item.type} · revenda</small></span>
            <button className="button primary tiny" disabled={ocupado || item.sellerId === userId || (meia && !declarou)}
              onClick={async () => {
                if (await gravar(`/anuncios/${item.id}/reservar`, { halfDeclaration: meia && declarou })) navigate('/pedidos');
              }}>{item.sellerId === userId ? 'Seu anúncio' : 'Reservar repasse'}</button>
            {item.sellerId !== userId && <Link className="text-link" to={`/atendimento?anuncio=${item.id}`}
              aria-label={`Denunciar o anúncio nº ${item.id}`}>Denunciar</Link>}
          </li>)}</ul> : <p>Nenhum anúncio disponível para este tipo de ingresso.</p>}
        {inscritos.length ? <ul className="resale-list" aria-label="Sua fila de espera">{inscritos.map((item) =>
          <ItemFila key={item.id} estado={estado} item={item} />)}</ul> :
          <button className="button outline" disabled={ocupado || (meia && !declarou)}
            onClick={() => gravar('/fila', { eventId, type: tipo, halfDeclaration: meia && declarou })}>
            Entrar na fila de repasse
          </button>}
        <p className="muted">Quando chegar sua vez, a reserva aparece em Meus pedidos para pagamento simulado.</p>
      </>}
    </Panel>
  );
}

function Oferta({ ingressos, estado }) {
  const [id, setId] = useState('');
  const [modo, setModo] = useState('revenda');
  const [preco, setPreco] = useState('');
  const [email, setEmail] = useState('');
  const ingresso = ingressos.find((item) => String(item.id) === id);
  const gratuito = modo === 'gratuito';
  async function enviar(e) {
    e.preventDefault();
    if (!ingresso) return;
    const ok = gratuito
      ? await estado.gravar('/transferencias', { ticketId: ingresso.id, email: email.trim() })
      : await estado.gravar('/anuncios', { ticketId: ingresso.id, priceCents: Math.round(Number(preco) * 100) });
    if (ok) { setId(''); setEmail(''); setPreco(''); }
  }
  return <Panel title="Repassar um ingresso">
    {!ingressos.length ? <p>Nenhum ingresso disponível para revenda ou transferência.</p> :
      <form className="form-grid" onSubmit={enviar}>
        <label>Ingresso
          <select value={id} required onChange={(e) => {
            setId(e.target.value); setPreco(''); setEmail('');
            setModo(Number(ingressos.find((t) => String(t.id) === e.target.value)?.price) > 0 ? 'revenda' : 'gratuito');
          }}>
            <option value="">Selecione um ingresso</option>
            {ingressos.map((t) => <option key={t.id} value={t.id}>{t.eventTitle} · {t.type} · {t.code}</option>)}
          </select>
        </label>
        {ingresso && <>
          <label>Forma de repasse
            <select value={modo} onChange={(e) => setModo(e.target.value)}>
              {Number(ingresso.price) > 0 && <option value="revenda">Revenda</option>}
              <option value="gratuito">Transferência gratuita</option>
            </select>
          </label>
          {gratuito ? <>
            <label>E-mail de quem vai receber<input type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} /></label>
            <p>A pessoa deve entrar na própria conta e aceitar o convite.</p>
          </> : <label>Preço de revenda (até {money(ingresso.price)})
            <input type="number" min="0.01" step="0.01" max={ingresso.price} required value={preco}
              onChange={(e) => setPreco(e.target.value)} />
          </label>}
          <button type="submit" disabled={estado.ocupado} className="button primary">
            {gratuito ? 'Enviar convite de transferência' : 'Publicar anúncio'}
          </button>
        </>}
      </form>}
  </Panel>;
}

function Carteira({ usuarioId }) {
  const carregar = useCallback(async (signal) => {
    const [ingressos, anuncios, convites, fila] = await Promise.all([
      getParticipantTickets(usuarioId, signal), ler('/anuncios', signal), ler('/transferencias', signal), ler('/fila', signal),
    ]);
    return { ingressos, anuncios: anuncios.filter((a) => a.sellerId === usuarioId), convites, fila };
  }, [usuarioId]);
  const estado = useRepasses(carregar);
  const { dados, ocupado, gravar } = estado;
  const bloqueados = new Set([
    ...(dados?.anuncios || []).filter((a) => ['active', 'reserved'].includes(a.status)).map((a) => a.ticketId),
    ...(dados?.convites || []).filter((c) => c.status === 'pending').map((c) => c.ticketId),
  ]);
  const disponiveis = dados?.ingressos.filter((t) => t.statusCode === 'A' && !t.availableForExchange && !bloqueados.has(t.id)) || [];
  return <div className="workspace">
    <PageTitle title="Repasses e transferências">
      <Link className="button outline" to="/ingressos">Meus ingressos</Link>
      <Link className="button outline" to="/pedidos">Meus pedidos</Link>
    </PageTitle>
    <Estado estado={estado} />
    {dados && <>
      <Oferta ingressos={disponiveis} estado={estado} />
      <Panel title="Meus anúncios">{dados.anuncios.length ? <ul className="resale-list">{dados.anuncios.map((a) =>
        <li key={a.id} className="resale-item">
          <span className="resale-item-text"><strong>{a.eventTitle}</strong>
            <small>{a.type} · {money(a.priceCents / 100)}</small></span>
          <Badge>{situacoes[a.status] || a.status}</Badge>
          {a.status === 'active' && <button className="button outline" disabled={ocupado}
            onClick={() => gravar(`/anuncios/${a.id}`, {}, 'DELETE')}>Retirar anúncio</button>}
        </li>)}</ul> : <p>Nenhum anúncio em aberto.</p>}</Panel>
      <Panel title="Minhas filas de espera">{dados.fila.length ? <ul className="resale-list">{dados.fila.map((item) =>
        <ItemFila key={item.id} estado={estado} item={item} />)}</ul> : <p>Você ainda não entrou em uma fila.</p>}</Panel>
      <Panel title="Convites de transferência">
        {dados.convites.length ? <ul className="resale-list">{dados.convites.map((c) => {
          const recebido = c.toUserId === usuarioId;
          return <li key={c.id} className="resale-item">
            <span className="resale-item-text">
              <strong>{c.eventTitle}</strong>
              <small>{recebido ? `Convite recebido de ${c.fromName}` : `Convite enviado para ${c.toName}`} · {c.type}</small>
              {c.status === 'pending' && <small>Vence em {new Date(c.expiresAt).toLocaleString('pt-BR')}</small>}
              {c.status === 'pending' && recebido &&
                <small>Ao aceitar gratuitamente, seu teto para revenda passa a zero.</small>}
            </span>
            <Badge>{situacoes[c.status] || c.status}</Badge>
            {c.status === 'pending' && <span className="resale-item-actions">
              {recebido ? <>
                <button className="button primary" disabled={ocupado}
                  onClick={() => gravar(`/transferencias/${c.id}/aceitar`)}>Aceitar transferência gratuita</button>
                <button className="button outline" disabled={ocupado}
                  onClick={() => gravar(`/transferencias/${c.id}/recusar`)}>Recusar convite</button>
              </> : <button className="button outline" disabled={ocupado}
                onClick={() => gravar(`/transferencias/${c.id}/cancelar`)}>Cancelar convite</button>}
            </span>}
          </li>;
        })}</ul> : <p>Nenhum convite nesta conta.</p>}
      </Panel>
    </>}
  </div>;
}

export default function Resale() {
  const { data, role, isAuthenticated } = useStore();
  if (!isAuthenticated || role !== 'comprador') {
    return <div className="workspace"><Empty title="Entre com uma conta de usuário para gerenciar repasses." /></div>;
  }
  return <Carteira usuarioId={Number(data.profile.id)} />;
}
