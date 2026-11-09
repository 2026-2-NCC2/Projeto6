import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import Icon from "../components/Icon.jsx";
import Editor from "../components/Editor.jsx";
import { Avatar, Card, LinkComunidade, Selo, Votos, compartilhar } from "../components/Common.jsx";
import { ImagemPublicacao, MenuMais } from "../components/PostCard.jsx";
import { CartaoComunidade, DiscussoesRelacionadas, GarantiaVerde, LinksLegais, Regras } from "../components/Widgets.jsx";
import { usuarios } from "../data/forum.js";
import { useForum } from "../store/ForumContext.jsx";
import { tempoRelativo } from "../utils/format.js";
import { Markdown } from "../utils/markdown.jsx";
import NotFound from "./NotFound.jsx";

const tonsEtiqueta = ["azul", "roxo", "cinza"];

function contar(lista) {
  return lista.reduce((n, c) => n + 1 + contar(c.respostas), 0);
}

function Comentario({ c, postId, autorPost, nivel = 0 }) {
  const f = useForum();
  const [respondendo, setRespondendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [recolhido, setRecolhido] = useState(false);
  const u = usuarios[c.autor] || {};
  const meu = c.autor === f.usuario.username;

  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    f.comentar(postId, texto.trim(), c.id);
    setTexto("");
    setRespondendo(false);
    f.toast("Resposta publicada");
  };

  return (
    <li className={`comentario ${nivel > 0 ? "resposta" : ""}`} id={`comentario-${c.id}`}>
      <button type="button" className="comentario-avatar" aria-label={recolhido ? "Expandir conversa" : "Recolher conversa"} onClick={() => setRecolhido(!recolhido)}>
        <Avatar username={c.autor} size={nivel > 0 ? 26 : 32} />
      </button>
      <div className="comentario-corpo">
        <div className="comentario-meta">
          <b>u/{c.autor}</b>
          {c.autor === autorPost && <span className="selo selo-roxo">OP • Autora</span>}
          {u.moderador && (
            <span className="selo selo-verde">
              <Icon name="shieldCheck" size={11} /> Mod TrocaTicket
            </span>
          )}
          {u.flair && <span className="selo selo-laranja">{u.flair} ★</span>}
          {meu && <span className="selo selo-azul">Você</span>}
          <span className="texto-suave">• {tempoRelativo(c.criadoEm)}</span>
          {recolhido && (
            <button type="button" className="link-btn" onClick={() => setRecolhido(false)}>
              [+] expandir
            </button>
          )}
        </div>
        {!recolhido && (
          <>
            <div className={c.destaque ? "comentario-destaque" : ""}>
              <Markdown texto={c.texto} className="md md-comentario" />
            </div>
            <div className="comentario-acoes">
              <Votos id={c.id} base={c.votos} variante="mini" comentario />
              <button type="button" className="acao" onClick={() => setRespondendo(!respondendo)}>
                <Icon name="chat" size={14} /> Responder
              </button>
              <button type="button" className="acao" onClick={() => compartilhar(`${window.location.hash.slice(1).split("#")[0]}#comentario-${c.id}`, f.toast)}>
                Compartilhar
              </button>
            </div>
            {respondendo && (
              <form className="form-resposta" onSubmit={enviar}>
                <Editor value={texto} onChange={setTexto} placeholder={`Responder a u/${c.autor}...`} rows={3} compacto />
                <div className="form-botoes">
                  <button type="button" className="btn btn-cinza btn-pequeno" onClick={() => setRespondendo(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primario btn-pequeno" disabled={!texto.trim()}>
                    Responder
                  </button>
                </div>
              </form>
            )}
            {c.respostas.length > 0 && (
              <ul className="lista-comentarios aninhada">
                {c.respostas.map((r) => (
                  <Comentario key={r.id} c={r} postId={postId} autorPost={autorPost} nivel={nivel + 1} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export default function PostDetail() {
  const { slug, id } = useParams();
  const f = useForum();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const p = f.getPublicacao(id);
  const c = f.getComunidade(slug);
  const [texto, setTexto] = useState("");
  const [ordem, setOrdem] = useState("relevantes");
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const { registrarVisita } = f;
  useEffect(() => {
    if (p) registrarVisita(p.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);

  useEffect(() => {
    if (hash) {
      const alvo = document.getElementById(hash.slice(1));
      if (alvo) setTimeout(() => alvo.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [hash, id]);

  const arvore = f.comentariosDe(id);
  const ordenados = useMemo(() => {
    const l = [...arvore];
    if (ordem === "recentes") l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    else l.sort((a, b) => b.votos + f.votoComentario(b.id) - (a.votos + f.votoComentario(a.id)));
    return l;
  }, [arvore, ordem, f]);

  if (!p || !c || p.comunidade !== c.slug) return <NotFound titulo="Publicação não encontrada" />;

  const visiveis = mostrarTodos ? ordenados : ordenados.filter((x) => !x.extra);
  const ocultos = f.totalComentarios(p) - contar(visiveis);

  const comentar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    f.comentar(p.id, texto.trim());
    setTexto("");
    f.toast("Comentário publicado");
  };

  return (
    <>
      <main className="col-principal" tabIndex={-1}>
        <div className="trilha">
          <button type="button" className="link-btn cinza" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/t/${c.slug}`))}>
            <Icon name="arrowLeft" size={16} /> Voltar para o Feed / t/{c.slug}
          </button>
          <nav aria-label="Trilha" className="trilha-direita">
            <Link to="/">Início</Link> &gt; <Link to={`/?categoria=${c.categoria}`}>{c.titulo.split(",")[0]}</Link> &gt; <span>Discussão #{p.id}</span>
          </nav>
        </div>

        <article className="card post-detalhe">
          <header className="post-detalhe-topo">
            <Avatar username={p.autor} size={40} />
            <div>
              <div className="post-meta">
                <LinkComunidade slug={c.slug} />
                <span className="ponto">•</span>
                <span>postado por u/{p.autor}</span>
              </div>
              <small className="texto-suave">
                {tempoRelativo(p.criadoEm)}
                {p.editadoEm && ` • Editado ${tempoRelativo(p.editadoEm)}`}
              </small>
            </div>
            <span className="espaco" />
            <MenuMais p={p} />
          </header>
          {p.etiquetas?.length > 0 && (
            <div className="etiquetas">
              {p.etiquetas.map((t, i) => (
                <Selo key={t} tom={tonsEtiqueta[i % 3]}>
                  {t}
                </Selo>
              ))}
            </div>
          )}
          <h1 className="post-detalhe-titulo">{p.titulo}</h1>
          <Markdown texto={p.corpo || p.resumo} className="md md-post" />
          {p.link && (
            <a className="link-externo" href={/^https?:\/\//.test(p.link) ? p.link : "#"} target="_blank" rel="noreferrer noopener">
              <Icon name="link" size={16} /> {p.link}
            </a>
          )}
          {p.enquete && <Enquete p={p} />}
          {p.imagem && <ImagemPublicacao imagem={p.imagem.local ? p.imagem : { ...p.imagem, rotulo: undefined }} />}
          {p.custodia && (
            <div className="caixa caixa-azul">
              <strong className="texto-verde">
                <Icon name="lock" size={14} /> Custódia Protegida:
              </strong>
              <p>{p.custodia}</p>
            </div>
          )}
          {(p.dica || p.blindagem) && (
            <div className="caixa caixa-azul">
              <p>
                <Icon name="shieldCheck" size={15} className="texto-azul" /> <b className="texto-azul">Dica Segura TrocaTicket:</b> {p.dica || p.blindagem}
              </p>
            </div>
          )}
          <footer className="post-acoes barra">
            <Votos id={p.id} base={p.votos} variante="pilula" />
            <a href="#comentarios" className="acao pilula" onClick={(e) => (e.preventDefault(), document.getElementById("comentarios")?.scrollIntoView({ behavior: "smooth" }))}>
              <Icon name="chat" size={16} /> {f.totalComentarios(p)} comentários
            </a>
            <span className="espaco" />
            <button type="button" className="acao" onClick={() => compartilhar(`#/t/${c.slug}/post/${p.id}`, f.toast)}>
              <Icon name="share" size={16} /> Compartilhar
            </button>
            <button type="button" className={`acao ${f.estaSalvo(p.id) ? "ativo" : ""}`} onClick={() => f.alternarSalvo(p.id)}>
              <Icon name="bookmark" size={16} fill={f.estaSalvo(p.id) ? "currentColor" : "none"} /> {f.estaSalvo(p.id) ? "Salvo" : "Salvar"}
            </button>
            <button type="button" className="icone-btn" aria-label="Denunciar" onClick={() => f.toast("Denúncia enviada à moderação")}>
              <Icon name="flag" size={16} />
            </button>
          </footer>
        </article>

        <Card className="comentarios" id="comentarios">
          <div className="comentarios-topo">
            <h2>
              Comentários <span className="contador-cinza">{f.totalComentarios(p)}</span>
            </h2>
            <label className="ordenar">
              Ordenar por:
              <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
                <option value="relevantes">Mais Relevantes</option>
                <option value="recentes">Mais Recentes</option>
              </select>
            </label>
          </div>

          <form className="form-comentario" onSubmit={comentar}>
            <p className="linha-icone texto-suave">
              <Avatar username={f.usuario.username} size={20} /> Comentar como <b className="texto-forte">{f.usuario.username}</b>
            </p>
            <Editor value={texto} onChange={setTexto} placeholder="Escreva seu comentário com dicas respeitosas..." rows={3} compacto />
            <div className="form-botoes">
              <button type="submit" className="btn btn-primario btn-pequeno" disabled={!texto.trim()}>
                Comentar
              </button>
            </div>
          </form>

          <ul className="lista-comentarios">
            {visiveis.map((x) => (
              <Comentario key={x.id} c={x} postId={p.id} autorPost={p.autor} />
            ))}
          </ul>
          {visiveis.length === 0 && <p className="texto-suave centro">Ainda não há comentários. Seja o primeiro!</p>}
          {!mostrarTodos && ocultos > 0 && (
            <button type="button" className="btn btn-contorno btn-bloco" onClick={() => setMostrarTodos(true)}>
              Carregar mais {ocultos} comentários...
            </button>
          )}
        </Card>
      </main>

      <aside className="col-direita">
        <CartaoComunidade c={c} />
        <Regras c={c} compacto />
        <DiscussoesRelacionadas atual={p.id} />
        <GarantiaVerde />
        <LinksLegais />
      </aside>
    </>
  );
}

function Enquete({ p }) {
  const chave = `forum-trocaticket:enquete:${p.id}`;
  const [voto, setVoto] = useState(() => localStorage.getItem(chave));
  const votar = (i) => {
    localStorage.setItem(chave, String(i));
    setVoto(String(i));
  };
  const total = p.enquete.length + (voto != null ? 1 : 0);
  return (
    <div className="enquete">
      {p.enquete.map((op, i) => {
        const n = 1 + (voto === String(i) ? 1 : 0);
        const pct = Math.round((n / total) * 100);
        return voto == null ? (
          <button key={i} type="button" className="enquete-opcao" onClick={() => votar(i)}>
            {op}
          </button>
        ) : (
          <div key={i} className={`enquete-resultado ${voto === String(i) ? "escolhido" : ""}`}>
            <span className="enquete-barra" style={{ width: `${pct}%` }} />
            <span>{op}</span>
            <b>{pct}%</b>
          </div>
        );
      })}
      <small className="texto-suave">{total} votos</small>
    </div>
  );
}
