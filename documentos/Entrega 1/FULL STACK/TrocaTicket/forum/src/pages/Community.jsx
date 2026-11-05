import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import Icon from "../components/Icon.jsx";
import { Avatar, ComunidadeIcone, Vazio } from "../components/Common.jsx";
import { PostCardComunidade } from "../components/PostCard.jsx";
import { ComunidadesRelacionadas, LinksLegais, MeuFlair, Regras, SobreComunidade } from "../components/Widgets.jsx";
import { useForum } from "../store/ForumContext.jsx";
import { mesAno, numeroCompacto } from "../utils/format.js";
import { filtrarPorBusca, ordenar } from "../utils/feed.js";
import NotFound from "./NotFound.jsx";

const abas = [
  { id: "publicacoes", rotulo: "Publicações" },
  { id: "sobre", rotulo: "Sobre a Comunidade" },
  { id: "guias", rotulo: "Dúvidas & Guias de Setor" },
  { id: "midia", rotulo: "Mídia & Fotos" },
];

const ordens = [
  { id: "melhores", rotulo: "Melhores", icone: "flame" },
  { id: "recentes", rotulo: "Mais Recentes", icone: "clock" },
  { id: "votados", rotulo: "Mais Votados", icone: "trending" },
];

export default function Community() {
  const { slug } = useParams();
  const f = useForum();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [compacto, setCompacto] = useState(false);
  const [sino, setSino] = useState(false);
  const c = f.getComunidade(slug);
  const aba = params.get("aba") || "publicacoes";
  const ordem = params.get("ordem") || "melhores";
  const busca = params.get("busca") || "";

  const lista = useMemo(() => {
    if (!c) return [];
    let l = f.publicacoes.filter((p) => p.comunidade === c.slug);
    if (aba === "guias") l = l.filter((p) => (p.etiquetas || []).some((t) => /dúvida|guia|dica|relato/i.test(t)));
    if (aba === "midia") l = l.filter((p) => p.imagem);
    l = filtrarPorBusca(l, busca);
    return ordenar(l, ordem === "melhores" ? "relevantes" : ordem, f.pontuacao, { fixarComunicados: !busca });
  }, [f, c, aba, ordem, busca]);

  if (!c) return <NotFound />;

  const definir = (chave, valor, padrao) => {
    const p = new URLSearchParams(params);
    if (valor === padrao) p.delete(chave);
    else p.set(chave, valor);
    setParams(p, { replace: chave === "ordem" });
  };
  const segue = f.segue(c.slug);

  return (
    <>
      <main className="col-principal" tabIndex={-1}>
        <section className="card com-cabecalho">
          <div className="com-banner" style={{ "--cor": c.cor }}>
            <span className="pilula-escura">
              <span className="bolinha-verde" /> Temporada {new Date().getFullYear()} Ativa
            </span>
          </div>
          <div className="com-info">
            <div className="com-avatar-linha">
              <span className="com-avatar">
                <ComunidadeIcone comunidade={c} size={76} />
                <span className="com-verificado">
                  <Icon name="check" size={12} stroke={3} />
                </span>
              </span>
              <div className="com-botoes">
                <Link to={`/criar?r=${c.slug}`} className="btn btn-contorno">
                  <Icon name="plus" size={16} /> Criar Post
                </Link>
                <button type="button" className={`btn ${segue ? "btn-primario" : "btn-contorno"}`} aria-pressed={segue} onClick={() => f.alternarSeguir(c.slug)}>
                  {segue ? <Icon name="check" size={16} stroke={3} /> : <Icon name="plus" size={16} />} {segue ? "Seguindo" : "Seguir"}
                </button>
                <button
                  type="button"
                  className={`icone-btn redondo ${sino ? "ativo" : ""}`}
                  aria-pressed={sino}
                  aria-label="Notificações da comunidade"
                  onClick={() => (setSino(!sino), f.toast(sino ? "Notificações desativadas" : `Você será avisado sobre novidades em r/${c.slug}`))}
                >
                  <Icon name="bell" size={17} />
                </button>
                <button type="button" className="icone-btn redondo" aria-label="Mais opções" onClick={() => f.toast("Link da comunidade copiado")}>
                  <Icon name="more" size={17} stroke={3} />
                </button>
              </div>
            </div>
            <h1 className="com-nome">
              r/{c.slug} <span className="selo selo-cinza">Comunidade {c.oficial ? "Oficial" : "Pública"}</span>
            </h1>
            <p className="texto-suave">{c.titulo}</p>
            <p className="com-descricao">{c.descricao}</p>
            <p className="com-numeros">
              <b>{numeroCompacto(c.membros)} Membros</b>
              <span className="ponto">•</span>
              <b className="texto-verde">
                <span className="bolinha-verde" /> {c.online} Online agora
              </b>
              <span className="ponto">•</span>
              <span className="texto-suave">Criada em {mesAno(c.criadaEm)}</span>
            </p>
          </div>
          <nav className="com-abas" role="tablist">
            {abas.map((a) => (
              <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? "ativo" : ""} onClick={() => definir("aba", a.id, "publicacoes")}>
                {a.rotulo}
              </button>
            ))}
          </nav>
        </section>

        {aba === "sobre" ? (
          <section className="card card-texto sobre-detalhado">
            <h2>Sobre r/{c.slug}</h2>
            <p>{c.sobre}</p>
            <p>{c.descricao}</p>
            <h3>Regras</h3>
            <ol>
              {c.regras.map((r) => (
                <li key={r.titulo}>
                  <b>{r.titulo}.</b> {r.texto}
                </li>
              ))}
            </ol>
            <h3>Moderação</h3>
            <p className="linha-icone">
              <Avatar username="carlos_seguranca" size={24} /> u/carlos_seguranca — Moderador TrocaTicket
            </p>
          </section>
        ) : (
          <>
            <button type="button" className="card compositor" onClick={() => navigate(`/criar?r=${c.slug}`)}>
              <Avatar username={f.usuario.username} size={34} />
              <span className="compositor-input">Publique algo ou tire uma dúvida em r/{c.slug}...</span>
              <span className="compositor-icones" aria-hidden="true">
                <Icon name="image" size={19} />
                <Icon name="link" size={19} />
                <Icon name="chart" size={19} />
              </span>
            </button>

            <div className="card barra-ordem">
              <div className="barra-ordem-opcoes" role="tablist" aria-label="Ordenar publicações">
                {ordens.map((o) => (
                  <button key={o.id} type="button" role="tab" aria-selected={ordem === o.id} className={ordem === o.id ? "ativo" : ""} onClick={() => definir("ordem", o.id, "melhores")}>
                    <Icon name={o.icone} size={15} /> {o.rotulo}
                  </button>
                ))}
              </div>
              <div className="barra-ordem-vista">
                <button type="button" className={`icone-btn ${!compacto ? "ativo" : ""}`} aria-pressed={!compacto} aria-label="Visualização em cartões" onClick={() => setCompacto(false)}>
                  <Icon name="cards" size={17} />
                </button>
                <button type="button" className={`icone-btn ${compacto ? "ativo" : ""}`} aria-pressed={compacto} aria-label="Visualização compacta" onClick={() => setCompacto(true)}>
                  <Icon name="rows" size={17} />
                </button>
              </div>
            </div>

            {busca && (
              <div className="filtros-ativos">
                <span className="chip">
                  “{busca}”
                  <button type="button" aria-label="Limpar busca" onClick={() => definir("busca", "", "")}>
                    <Icon name="x" size={12} stroke={3} />
                  </button>
                </span>
                <span className="texto-suave">{lista.length} resultado(s) em r/{c.slug}</span>
              </div>
            )}

            <div className="lista-posts">
              {lista.map((p) => (
                <PostCardComunidade key={p.id} p={p} compacto={compacto} />
              ))}
              {lista.length === 0 && (
                <Vazio titulo="Nenhuma publicação encontrada">
                  <Link to={`/criar?r=${c.slug}`}>Seja o primeiro a publicar</Link>
                </Vazio>
              )}
            </div>
          </>
        )}
      </main>

      <aside className="col-direita">
        <SobreComunidade c={c} />
        <MeuFlair />
        <Regras c={c} />
        <ComunidadesRelacionadas atual={c.slug} />
        <LinksLegais />
      </aside>
    </>
  );
}
