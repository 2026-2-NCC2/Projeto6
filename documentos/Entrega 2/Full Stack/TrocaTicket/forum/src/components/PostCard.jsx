import { useState } from "react";
import { Link, useNavigate } from "react-router";
import Icon from "./Icon.jsx";
import { Avatar, LinkComunidade, Selo, Usuario, Votos, compartilhar } from "./Common.jsx";
import { useForum } from "../store/ForumContext.jsx";
import { tempoRelativo } from "../utils/format.js";

export const urlPublicacao = (p) => `/t/${p.comunidade}/post/${p.id}`;

function MenuMais({ p }) {
  const f = useForum();
  const [aberto, setAberto] = useState(false);
  return (
    <div className="menu-mais" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="icone-btn" aria-label="Mais opções" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <Icon name="more" size={18} stroke={3} />
      </button>
      {aberto && (
        <div className="popover" role="menu" onMouseLeave={() => setAberto(false)}>
          <button role="menuitem" type="button" onClick={() => (f.alternarSalvo(p.id), setAberto(false))}>
            <Icon name="bookmark" size={16} /> {f.estaSalvo(p.id) ? "Remover dos salvos" : "Salvar"}
          </button>
          <button role="menuitem" type="button" onClick={() => (f.toast("Publicação ocultada do seu feed"), setAberto(false))}>
            <Icon name="eye" size={16} /> Ocultar
          </button>
          {p.autor === f.usuario.username && (
            <button
              role="menuitem"
              type="button"
              className="texto-vermelho"
              onClick={() => {
                const confirmar = window.confirm("Tem certeza de que deseja excluir esta publicação? Essa ação não pode ser desfeita.");
                if (confirmar) {
                  f.removerPublicacao(p.id);
                  setAberto(false);
                }
              }}
            >
              <Icon name="trash" size={16} /> Excluir publicação
            </button>
          )}
          <button role="menuitem" type="button" className="texto-vermelho" onClick={() => (f.toast("Denúncia enviada à moderação"), setAberto(false))}>
            <Icon name="flag" size={16} /> Denunciar
          </button>
        </div>
      )}
    </div>
  );
}

function Caixas({ p }) {
  return (
    <>
      {p.custodia && (
        <div className="caixa caixa-azul">
          <strong className="texto-verde">
            <Icon name="lock" size={14} /> Custódia Protegida:
          </strong>
          <p>{p.custodia}</p>
        </div>
      )}
      {p.blindagem && (
        <div className="caixa caixa-azul caixa-icone">
          <span className="caixa-icone-tile">
            <Icon name="shieldCheck" size={18} />
          </span>
          <div>
            <strong>Sistema TrocaTicket de Blindagem Ativo</strong>
            <p>{p.blindagem}</p>
          </div>
        </div>
      )}
    </>
  );
}

function Imagem({ imagem }) {
  return (
    <figure className="post-imagem">
      <img src={imagem.src} alt={imagem.legenda || imagem.local || "Imagem da publicação"} loading="lazy" />
      {imagem.local && (
        <figcaption className="post-imagem-local">
          <Icon name="pin" size={13} /> {imagem.local}
        </figcaption>
      )}
      {imagem.legenda && (
        <figcaption className="post-imagem-legenda">
          <span>{imagem.legenda}</span>
          {imagem.rotulo && <span className="rotulo">{imagem.rotulo}</span>}
        </figcaption>
      )}
    </figure>
  );
}

// Cartão do feed principal (protótipo "Página Principal").
export function PostCardFeed({ p, fixado }) {
  const f = useForum();
  const navigate = useNavigate();
  const url = urlPublicacao(p);
  const abrir = (e) => {
    if (e.target.closest("a,button")) return;
    navigate(url);
  };
  return (
    <article className={`card post-feed ${p.oficial ? "post-oficial" : ""}`} onClick={abrir}>
      <Votos id={p.id} base={p.votos} />
      <div className="post-conteudo">
        <div className="post-meta">
          <LinkComunidade slug={p.comunidade} />
          <span className="ponto">•</span>
          {p.oficial ? <Usuario username={p.autor} prefixo="@" /> : <span>postado por @{p.autor}</span>}
          <span className="ponto">•</span>
          <span>{tempoRelativo(p.criadoEm)}</span>
          {p.selo && (
            <span className="meta-selo">
              <Selo tom={p.selo.tom}>
                {p.selo.emoji && `${p.selo.emoji} `}
                {p.selo.texto}
              </Selo>
            </span>
          )}
        </div>
        <h2 className="post-titulo">
          <Link to={url}>{p.titulo}</Link>
        </h2>
        <p className="post-resumo">{p.resumo}</p>
        <Caixas p={p} />
        {p.imagem?.local && <Imagem imagem={p.imagem} />}
        <div className="post-acoes">
          <Link to={`${url}#comentarios`} className="acao">
            <Icon name="chat" size={17} /> {f.totalComentarios(p)} comentários
          </Link>
          <button type="button" className={`acao ${f.estaSalvo(p.id) ? "ativo" : ""}`} onClick={() => f.alternarSalvo(p.id)}>
            <Icon name="bookmark" size={17} fill={f.estaSalvo(p.id) ? "currentColor" : "none"} /> {f.estaSalvo(p.id) ? "Salvo" : "Salvar"}
          </button>
          <button type="button" className="acao" onClick={() => compartilhar(url, f.toast)}>
            <Icon name="share" size={17} /> Compartilhar
          </button>
          <span className="espaco" />
          {fixado ? (
            <span className="fixado">
              <Icon name="pinned" size={14} /> Fixado
            </span>
          ) : (
            <MenuMais p={p} />
          )}
        </div>
      </div>
    </article>
  );
}

// Cartão da página de comunidade (protótipo "Página da Comunidade").
export function PostCardComunidade({ p, compacto }) {
  const f = useForum();
  const navigate = useNavigate();
  const url = urlPublicacao(p);
  const abrir = (e) => {
    if (e.target.closest("a,button")) return;
    navigate(url);
  };

  if (p.comunicado) {
    return (
      <article className="card post-comunicado" onClick={abrir}>
        <div className="post-meta">
          <Icon name="star" size={15} fill="currentColor" className="texto-laranja" />
          <span className="selo selo-laranja-forte">COMUNICADO DA MODERAÇÃO</span>
          <span className="ponto">•</span>
          <span>Fixado por mod/{p.autor}</span>
          <span className="ponto">•</span>
          <span>{tempoRelativo(p.criadoEm)}</span>
        </div>
        <h2 className="post-titulo">
          <Link to={url}>{p.titulo}</Link>
        </h2>
        <p className="post-resumo">{p.resumo}</p>
        <div className="post-acoes compacto texto-laranja">
          <span>
            <Icon name="chevronUp" size={15} /> {f.pontuacao(p)} votos
          </span>
          <Link to={`${url}#comentarios`}>
            <Icon name="chat" size={15} /> {f.totalComentarios(p)} comentários
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className={`card post-com ${compacto ? "compacto" : ""}`} onClick={abrir}>
      <div className="post-meta">
        <Avatar username={p.autor} size={22} />
        <b className="texto-forte">u/{p.autor}</b>
        <span className="ponto">•</span>
        <span>{tempoRelativo(p.criadoEm)}</span>
        {!compacto &&
          (p.etiquetas || []).slice(0, 2).map((t, i) => (
            <Selo key={t} tom={i === 0 ? p.selo?.tom || "azul" : "verde"}>
              {t}
            </Selo>
          ))}
        <span className="espaco" />
        <MenuMais p={p} />
      </div>
      <h2 className="post-titulo">
        <Link to={url}>{p.titulo}</Link>
      </h2>
      {!compacto && (
        <>
          <p className="post-resumo">{p.resumo}</p>
          {p.imagem && <Imagem imagem={p.imagem} />}
          <Caixas p={p} />
        </>
      )}
      <div className="post-acoes barra">
        <Votos id={p.id} base={p.votos} variante="pilula" />
        <Link to={`${url}#comentarios`} className="acao pilula">
          <Icon name="chat" size={16} /> {f.totalComentarios(p)} Comentários
        </Link>
        <button type="button" className="acao" onClick={() => compartilhar(url, f.toast)}>
          <Icon name="share" size={16} /> Compartilhar
        </button>
        <button
          type="button"
          className={`icone-btn ${f.estaSalvo(p.id) ? "ativo" : ""}`}
          aria-label={f.estaSalvo(p.id) ? "Remover dos salvos" : "Salvar"}
          onClick={() => f.alternarSalvo(p.id)}
        >
          <Icon name="bookmark" size={17} fill={f.estaSalvo(p.id) ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}

export { Imagem as ImagemPublicacao, MenuMais };
