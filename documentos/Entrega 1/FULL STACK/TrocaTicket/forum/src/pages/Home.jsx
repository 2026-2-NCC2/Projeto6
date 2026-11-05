import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import Icon from "../components/Icon.jsx";
import { Vazio } from "../components/Common.jsx";
import { PostCardFeed } from "../components/PostCard.jsx";
import { ComunidadesDestaque, DiscussoesRecentes, GarantiaTrocaTicket, LinksLegais } from "../components/Widgets.jsx";
import { categorias } from "../data/forum.js";
import { useForum } from "../store/ForumContext.jsx";
import { filtrarPorBusca, ordenar } from "../utils/feed.js";

const abas = [
  { id: "para-voce", rotulo: "Para você", icone: "flame" },
  { id: "seguindo", rotulo: "Seguindo", icone: "heart" },
  { id: "em-alta", rotulo: "Em alta", icone: "trending" },
  { id: "recentes", rotulo: "Recentes", icone: "clock" },
  { id: "mais-votados", rotulo: "Mais votados", icone: "arrowUp" },
];

const titulosEspeciais = {
  salvas: { titulo: "Publicações salvas", vazio: "Você ainda não salvou nenhuma publicação.", icone: "bookmark" },
  minhas: { titulo: "Minhas publicações", vazio: "Você ainda não publicou nada. Que tal começar agora?", icone: "file" },
};

export default function Home() {
  const f = useForum();
  const [params, setParams] = useSearchParams();
  const aba = params.get("aba") || "para-voce";
  const categoria = params.get("categoria");
  const busca = params.get("busca") || "";
  const cat = categorias.find((c) => c.id === categoria);
  const especial = titulosEspeciais[aba];

  const lista = useMemo(() => {
    let l = f.publicacoes.filter((p) => !p.comunicado);
    if (aba === "seguindo") l = l.filter((p) => f.seguindo.includes(p.comunidade));
    if (aba === "salvas") l = f.publicacoes.filter((p) => f.salvos.includes(p.id));
    if (aba === "minhas") l = f.publicacoes.filter((p) => p.autor === f.usuario.username);
    if (categoria) l = l.filter((p) => p.categoria === categoria);
    l = filtrarPorBusca(l, busca);
    const modo = { "para-voce": "relevantes", seguindo: "recentes", "em-alta": "em-alta", recentes: "recentes", "mais-votados": "votados" }[aba] || "recentes";
    return ordenar(l, modo, f.pontuacao, { fixarOficiais: aba === "para-voce" && !busca });
  }, [f, aba, categoria, busca]);

  const trocarAba = (id) => {
    const p = new URLSearchParams(params);
    if (id === "para-voce") p.delete("aba");
    else p.set("aba", id);
    setParams(p);
  };
  const limpar = (chave) => {
    const p = new URLSearchParams(params);
    p.delete(chave);
    setParams(p);
  };

  return (
    <>
      <main className="col-principal" tabIndex={-1}>
        {!especial && (
          <section className="hero">
            <div>
              <span className="hero-selo">
                <Icon name="chat" size={14} /> Fórum Colaborativo
              </span>
              <h1>Tire dúvidas sobre ingressos, setores e reputação</h1>
              <p>Conecte-se com mais de 35 mil fãs verificados em todo o Brasil.</p>
            </div>
            <Link to="/criar" className="btn btn-branco">
              Publicar Agora
            </Link>
          </section>
        )}

        {especial ? (
          <h1 className="titulo-pagina">
            <Icon name={especial.icone} size={22} /> {especial.titulo}
          </h1>
        ) : (
          <div className="abas-feed" role="tablist" aria-label="Ordenar feed">
            {abas.map((a) => (
              <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} className={aba === a.id ? "ativo" : ""} onClick={() => trocarAba(a.id)}>
                <Icon name={a.icone} size={17} /> {a.rotulo}
              </button>
            ))}
          </div>
        )}

        {(cat || busca) && (
          <div className="filtros-ativos">
            {cat && (
              <span className="chip">
                {cat.emoji} {cat.nome}
                <button type="button" aria-label="Remover filtro de categoria" onClick={() => limpar("categoria")}>
                  <Icon name="x" size={12} stroke={3} />
                </button>
              </span>
            )}
            {busca && (
              <span className="chip">
                “{busca}”
                <button type="button" aria-label="Limpar busca" onClick={() => limpar("busca")}>
                  <Icon name="x" size={12} stroke={3} />
                </button>
              </span>
            )}
            <span className="texto-suave">
              {lista.length} {lista.length === 1 ? "resultado" : "resultados"}
            </span>
          </div>
        )}

        <div className="lista-posts">
          {lista.map((p) => (
            <PostCardFeed key={p.id} p={p} fixado={p.oficial && p.fixado && aba === "para-voce"} />
          ))}
          {lista.length === 0 && (
            <Vazio icone={especial?.icone || "search"} titulo="Nada por aqui ainda">
              {especial?.vazio || (aba === "seguindo" ? "Siga comunidades para ver as publicações delas aqui." : "Tente outra busca ou categoria.")}
            </Vazio>
          )}
        </div>
      </main>

      <aside className="col-direita">
        <GarantiaTrocaTicket />
        <ComunidadesDestaque />
        <DiscussoesRecentes />
        <LinksLegais />
      </aside>
    </>
  );
}
