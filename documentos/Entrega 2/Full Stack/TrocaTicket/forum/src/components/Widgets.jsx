import { useState } from "react";
import { Link } from "react-router";
import Icon from "./Icon.jsx";
import { Avatar, Card, ComunidadeIcone } from "./Common.jsx";
import { urlPublicacao } from "./PostCard.jsx";
import { useForum } from "../store/ForumContext.jsx";
import { dataPorExtenso, numeroCompacto, tempoRelativo } from "../utils/format.js";

export function BotaoSeguir({ slug, pequeno = false, mais = false }) {
  const f = useForum();
  const segue = f.segue(slug);
  return (
    <button
      type="button"
      className={`btn ${pequeno ? "btn-pequeno" : ""} ${segue ? "btn-primario" : "btn-suave"}`}
      aria-pressed={segue}
      onClick={(e) => (e.stopPropagation(), f.alternarSeguir(slug))}
    >
      {segue ? (
        <>
          <Icon name="check" size={14} stroke={3} /> Seguindo
        </>
      ) : (
        `${mais ? "+ " : ""}Seguir`
      )}
    </button>
  );
}

export function GarantiaTrocaTicket() {
  return (
    <Card className="card-texto">
      <h3 className="card-titulo">
        <Icon name="shieldCheck" size={20} className="texto-verde" /> Garantia TrocaTicket
      </h3>
      <p>
        Todas as negociações autenticadas contam com retenção do pagamento até a validação na portaria. Nunca compre ingressos transferidos por WhatsApp ou links
        suspeitos.
      </p>
      <Link to="/t/AvisosESeguranca/post/8901" className="link-forte">
        Conheça a blindagem P2P →
      </Link>
    </Card>
  );
}

export function ComunidadesDestaque() {
  const f = useForum();
  const lista = ["ShowsEFestivais", "TrocasEIngressos", "DicasESeguranca"].map(f.getComunidade);
  return (
    <Card>
      <h3 className="card-titulo entre">
        Comunidades em Destaque <Icon name="star" size={17} />
      </h3>
      <ul className="lista-comunidades">
        {lista.map((c) => (
          <li key={c.slug}>
            <Link to={`/t/${c.slug}`}>
              <b>t/{c.slug}</b>
              <small>{numeroCompacto(c.membros)} membros</small>
            </Link>
            <BotaoSeguir slug={c.slug} pequeno />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function DiscussoesRecentes() {
  const f = useForum();
  const lista = f.recentes.map(f.getPublicacao).filter(Boolean);
  return (
    <Card>
      <h3 className="card-titulo entre">
        Discussões Recentes
        {lista.length > 0 && (
          <button type="button" className="link-btn cinza" onClick={f.limparRecentes}>
            Limpar
          </button>
        )}
      </h3>
      {lista.length === 0 ? (
        <p className="texto-suave">As discussões que você abrir aparecerão aqui.</p>
      ) : (
        <ul className="lista-recentes">
          {lista.map((p) => (
            <li key={p.id}>
              <Link to={urlPublicacao(p)}>
                <small>t/{p.comunidade}</small>
                <b>{p.titulo}</b>
                <span>
                  {f.pontuacao(p)} upvotes • {f.totalComentarios(p)} comentários
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function LinksLegais() {
  return (
    <div className="links-legais">
      <nav>
        <Link to="/t/AvisosESeguranca">Diretrizes</Link>
        <Link to="/t/ShowsEFestivais?aba=sobre">Privacidade</Link>
        <Link to="/t/ShowsEFestivais?aba=sobre">Termos de Uso</Link>
        <Link to="/?categoria=golpes">Denúncias</Link>
      </nav>
      <small>TrocaTicket Brasil © {new Date().getFullYear()}</small>
    </div>
  );
}

export function SobreComunidade({ c }) {
  return (
    <Card>
      <div className="card-titulo-pequeno">SOBRE A COMUNIDADE</div>
      <p className="texto-medio">{c.sobre}</p>
      <p className="texto-suave linha-icone">
        <Icon name="calendar" size={15} /> Criada em {dataPorExtenso(c.criadaEm)}
      </p>
      <div className="estatisticas">
        <div>
          <b>{numeroCompacto(c.membros)}</b>
          <small>Membros</small>
        </div>
        <div>
          <b>
            <span className="bolinha-verde" /> {c.online}
          </b>
          <small>Online agora</small>
        </div>
      </div>
      <Link to={`/criar?r=${c.slug}`} className="btn btn-primario btn-bloco">
        Criar Publicação nesta Comunidade
      </Link>
    </Card>
  );
}

export function MeuFlair() {
  const f = useForum();
  return (
    <Card>
      <div className="card-titulo-pequeno entre">
        MEU FLAIR NO FÓRUM
        <button type="button" className="link-btn" onClick={() => f.toast("Edição de flair disponível em breve")}>
          Editar
        </button>
      </div>
      <div className="flair">
        <Avatar username={f.usuario.username} size={30} />
        <div>
          <b>u/{f.usuario.username}</b>
          <span className="selo selo-laranja">
            {f.usuario.flair} ★ (Nível {f.usuario.nivel})
          </span>
        </div>
      </div>
    </Card>
  );
}

export function Regras({ c, compacto = false }) {
  const [aberta, setAberta] = useState(null);
  return (
    <Card>
      <div className="card-titulo-pequeno">REGRAS DE T/{c.slug.toUpperCase()}</div>
      <ol className={`regras ${compacto ? "compacto" : ""}`}>
        {c.regras.map((r, i) => (
          <li key={r.titulo}>
            <button type="button" aria-expanded={aberta === i} onClick={() => setAberta(aberta === i ? null : i)}>
              <span>
                {i + 1}. {r.titulo}
              </span>
              <Icon name={aberta === i ? "chevronUp" : "chevronDown"} size={15} />
            </button>
            {aberta === i && <p>{r.texto}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function ComunidadesRelacionadas({ atual }) {
  const f = useForum();
  const lista = f.comunidades.filter((c) => c.slug !== atual).slice(0, 4);
  return (
    <Card>
      <div className="card-titulo-pequeno">COMUNIDADES RELACIONADAS</div>
      <ul className="lista-relacionadas">
        {lista.map((c) => (
          <li key={c.slug}>
            <ComunidadeIcone comunidade={c} size={30} />
            <Link to={`/t/${c.slug}`}>
              <b>t/{c.slug}</b>
              <small>{numeroCompacto(c.membros)} membros</small>
            </Link>
            <BotaoSeguir slug={c.slug} pequeno mais />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CartaoComunidade({ c }) {
  return (
    <Card className="cartao-comunidade">
      <div className="cartao-comunidade-faixa" style={{ background: `linear-gradient(120deg, ${c.cor}, #1e1b4b)` }} />
      <div className="cartao-comunidade-topo">
        <ComunidadeIcone comunidade={c} size={44} />
        <BotaoSeguir slug={c.slug} pequeno />
      </div>
      <Link to={`/t/${c.slug}`} className="cartao-comunidade-nome">
        t/{c.slug}
      </Link>
      <small className="texto-suave">Comunidade oficial TrocaTicket</small>
      <p className="texto-medio">{c.descricao}</p>
      <div className="estatisticas">
        <div>
          <b>{numeroCompacto(c.membros)}</b>
          <small>Membros</small>
        </div>
        <div>
          <b>
            <span className="bolinha-verde" /> {c.online}
          </b>
          <small>Online agora</small>
        </div>
      </div>
      <Link to={`/criar?r=${c.slug}`} className="btn btn-suave btn-bloco">
        + Criar publicação nesta comunidade
      </Link>
    </Card>
  );
}

export function DiscussoesRelacionadas({ atual }) {
  const f = useForum();
  const p = f.getPublicacao(atual);
  const lista = f.publicacoes
    .filter((x) => x.id !== atual && !x.comunicado)
    .sort((a, b) => (b.comunidade === p?.comunidade) - (a.comunidade === p?.comunidade) || b.votos - a.votos)
    .slice(0, 3);
  return (
    <Card>
      <div className="card-titulo-pequeno">DISCUSSÕES RELACIONADAS</div>
      <ul className="lista-recentes">
        {lista.map((x) => (
          <li key={x.id}>
            <Link to={urlPublicacao(x)}>
              <b>{x.titulo}</b>
              <span>
                {f.totalComentarios(x)} comentários • {tempoRelativo(x.criadoEm)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GarantiaVerde() {
  return (
    <section className="card card-verde">
      <strong>
        <span className="check-redondo">
          <Icon name="check" size={14} stroke={3} />
        </span>
        Garantia Blindada TrocaTicket
      </strong>
      <p>O valor de qualquer repasse de ingresso fica sob custódia segura até que o comprador acesse a catraca do evento com sucesso.</p>
    </section>
  );
}

export function DicaPublicar() {
  return (
    <section className="card card-azul">
      <span className="caixa-icone-tile">
        <Icon name="lightbulb" size={18} />
      </span>
      <div>
        <strong>Dica para publicar</strong>
        <p>Use um título claro e forneça detalhes de localização ou data para que outros membros possam te ajudar mais rápido.</p>
      </div>
    </section>
  );
}
