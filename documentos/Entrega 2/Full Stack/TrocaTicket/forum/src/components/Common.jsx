import { Link } from "react-router";
import Icon from "./Icon.jsx";
import { usuarios } from "../data/forum.js";
import { useForum } from "../store/ForumContext.jsx";
import { iniciais } from "../utils/format.js";

export function Avatar({ username, size = 28, online = false }) {
  const u = usuarios[username] || {};
  const f = useForum();
  const ehContaAtual = username === f.usuario.username;
  return (
    <span className="avatar" style={{ width: size, height: size, background: u.cor || (ehContaAtual ? "#3155df" : "#334155"), fontSize: size * 0.38 }} aria-hidden="true">
      {ehContaAtual && f.usuario.photo ? (
        <img
          src={f.usuario.photo}
          alt=""
          className="avatar-foto"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        (ehContaAtual && f.usuario.iniciais) || u.iniciais || iniciais(username)
      )}
      {online && <span className="avatar-online" />}
    </span>
  );
}

export function ComunidadeIcone({ comunidade, size = 32 }) {
  return (
    <span className="com-icone" style={{ width: size, height: size, background: comunidade.cor }} aria-hidden="true">
      <Icon name={comunidade.icone} size={size * 0.55} />
    </span>
  );
}

export function Selo({ tom = "azul", children, icone }) {
  return (
    <span className={`selo selo-${tom}`}>
      {icone && <Icon name={icone} size={12} />}
      {children}
    </span>
  );
}

export function Card({ className = "", children, ...props }) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  );
}

// Votação: "vertical" (feed principal) ou "pilula" (comunidade / detalhes).
export function Votos({ id, base, variante = "vertical", comentario = false }) {
  const f = useForum();
  const voto = comentario ? f.votoComentario(id) : f.votoDe(id);
  const votar = comentario ? f.votarComentario : f.votar;
  const total = base + voto;
  return (
    <div className={`votos votos-${variante} ${voto === 1 ? "up" : voto === -1 ? "down" : ""}`}>
      <button type="button" className="voto-btn" aria-pressed={voto === 1} aria-label="Votar a favor" onClick={() => votar(id, 1)}>
        <Icon name={variante === "vertical" ? "chevronUp" : "arrowUp"} size={variante === "mini" ? 13 : 16} stroke={2.4} />
      </button>
      <span className="voto-total" aria-live="polite">
        {total}
      </span>
      <button type="button" className="voto-btn" aria-pressed={voto === -1} aria-label="Votar contra" onClick={() => votar(id, -1)}>
        <Icon name={variante === "vertical" ? "chevronDown" : "arrowDown"} size={variante === "mini" ? 13 : 16} stroke={2.4} />
      </button>
    </div>
  );
}

export function Usuario({ username, prefixo = "u/" }) {
  const u = usuarios[username] || {};
  return (
    <span className="usuario">
      {u.moderador && <Icon name="shieldCheck" size={14} className="texto-verde" />}
      <b>
        {prefixo}
        {username}
      </b>
      {u.moderador && <span className="texto-verde"> (Moderador)</span>}
    </span>
  );
}

export function LinkComunidade({ slug }) {
  return (
    <Link className="link-comunidade" to={`/t/${slug}`} onClick={(e) => e.stopPropagation()}>
      t/{slug}
    </Link>
  );
}

export async function compartilhar(url, toast) {
  // O app usa HashRouter: a rota interna vai depois do "#".
  const rota = url.replace(/^#/, "");
  const completo = `${window.location.origin}${window.location.pathname}#${rota}`;
  try {
    if (navigator.share) await navigator.share({ url: completo, title: "Fórum TrocaTicket" });
    else {
      await navigator.clipboard.writeText(completo);
      toast("Link copiado para a área de transferência");
    }
  } catch {
    /* compartilhamento cancelado */
  }
}

export function Vazio({ icone = "search", titulo, children }) {
  return (
    <div className="vazio">
      <Icon name={icone} size={28} />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
