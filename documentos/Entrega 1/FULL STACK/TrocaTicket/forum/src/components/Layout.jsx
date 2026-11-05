import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate, useSearchParams } from "react-router";
import Icon from "./Icon.jsx";
import { Avatar } from "./Common.jsx";
import { categorias } from "../data/forum.js";
import { useForum } from "../store/ForumContext.jsx";
import { tempoRelativo } from "../utils/format.js";

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="TrocaPapo — início da comunidade">
      <img src="/images/logo.png" alt="" className="logo-site-img" width="34" height="34" />
      <span className="logo-texto">
        <span>TrocaPapo</span>
        <small>COMUNIDADE</small>
      </span>
    </Link>
  );
}

function Busca() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const match = useMatch("/r/:slug/*");
  const slug = match?.params.slug;
  const [escopo, setEscopo] = useState(slug);
  const [texto, setTexto] = useState(params.get("busca") || "");
  const ref = useRef(null);

  useEffect(() => setEscopo(slug), [slug]);
  useEffect(() => setTexto(params.get("busca") || ""), [params]);
  useEffect(() => {
    const atalho = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, []);

  const enviar = (e) => {
    e.preventDefault();
    const q = texto.trim();
    const base = escopo ? `/r/${escopo}` : "/";
    navigate(q ? `${base}?busca=${encodeURIComponent(q)}` : base);
  };

  return (
    <form className="busca" role="search" onSubmit={enviar}>
      <Icon name="search" size={17} />
      {escopo && (
        <span className="busca-escopo">
          r/{escopo}
          <button type="button" aria-label="Buscar em todo o fórum" onClick={() => setEscopo(undefined)}>
            <Icon name="x" size={12} stroke={3} />
          </button>
        </span>
      )}
      <input
        ref={ref}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={escopo ? `Buscar em r/${escopo}` : "Buscar"}
        aria-label="Buscar no fórum"
      />
    </form>
  );
}

function Notificacoes() {
  const f = useForum();
  const [aberto, setAberto] = useState(false);
  const naoLidas = f.notificacoes.filter((n) => !n.lida).length;
  return (
    <div className="dropdown">
      <button type="button" className="icone-btn header-icone" aria-label={`Notificações (${naoLidas} não lidas)`} aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <Icon name="bell" size={20} />
        {naoLidas > 0 && <span className="contador">{naoLidas}</span>}
      </button>
      {aberto && (
        <div className="popover popover-largo" onMouseLeave={() => setAberto(false)}>
          <div className="popover-topo">
            <strong>Notificações</strong>
            <button type="button" className="link-btn" onClick={f.marcarNotificacoesLidas}>
              Marcar como lidas
            </button>
          </div>
          {f.notificacoes.map((n) => (
            <Link key={n.id} to={n.link} className={`notificacao ${n.lida ? "" : "nova"}`} onClick={() => setAberto(false)}>
              <span>{n.texto}</span>
              <small>{tempoRelativo(n.criadoEm)}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuUsuario() {
  const f = useForum();
  const [aberto, setAberto] = useState(false);
  return (
    <div className="dropdown">
      <button type="button" className="usuario-btn" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <Avatar username={f.usuario.username} size={34} online />
        <span className="usuario-btn-texto">
          <b>{f.usuario.nome || `u/${f.usuario.username}`}</b>
          <small>{f.usuario.role ? `Conta ${f.usuario.role}` : (f.usuario.vip ? "VIP Verified" : "Conta TrocaTicket")}</small>
        </span>
        <Icon name="chevronDown" size={15} />
      </button>
      {aberto && (
        <div className="popover" role="menu" onMouseLeave={() => setAberto(false)}>
          <Link role="menuitem" to="/?aba=minhas" onClick={() => setAberto(false)}>
            <Icon name="file" size={16} /> Minhas publicações
          </Link>
          <Link role="menuitem" to="/?aba=salvas" onClick={() => setAberto(false)}>
            <Icon name="bookmark" size={16} /> Publicações salvas
          </Link>
          <button role="menuitem" type="button" onClick={f.alternarTema}>
            <Icon name={f.dark ? "sun" : "moon"} size={16} /> Tema {f.dark ? "claro" : "escuro"}
          </button>
          <button role="menuitem" type="button" onClick={() => (f.toast("Sessão encerrada (demonstração)"), setAberto(false))}>
            <Icon name="logout" size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function Header({ onMenu }) {
  const f = useForum();
  const match = useMatch("/r/:slug/*");
  const slug = match?.params.slug;
  return (
    <header className="header">
      <div className="header-inner">
        <button type="button" className="icone-btn so-mobile" aria-label="Abrir menu" onClick={onMenu}>
          <Icon name="menu" size={22} />
        </button>
        <Logo />
        <nav className="header-nav" aria-label="Seções">
          <NavLink to="/" end>
            Discussões
          </NavLink>
          <NavLink to="/r/AvisosESeguranca">Segurança</NavLink>
        </nav>
        <Busca />
        <Link to={slug ? `/criar?r=${slug}` : "/criar"} className="btn btn-primario header-criar">
          <Icon name="plus" size={18} stroke={2.5} /> <span>Criar Publicação</span>
        </Link>
        <a className="forum-voltar" href="/" target="_top" title="Voltar ao site principal">
          <Icon name="arrowLeft" size={16} /> <span>Voltar</span>
        </a>
        <button type="button" className="icone-btn header-icone esconde-mobile" aria-label={f.dark ? "Ativar tema claro" : "Ativar tema escuro"} onClick={f.alternarTema}>
          <Icon name={f.dark ? "sun" : "moon"} size={20} />
        </button>
        <button type="button" className="icone-btn header-icone esconde-mobile" aria-label="Mensagens" onClick={() => f.toast("Mensagens privadas chegam em breve")}>
          <Icon name="chat" size={20} />
          <span className="ponto-azul" />
        </button>
        <Notificacoes />
        <MenuUsuario />
      </div>
    </header>
  );
}

const navPrincipal = [
  { aba: "para-voce", rotulo: "Início", icone: "home" },
  { aba: "em-alta", rotulo: "Em alta", icone: "flame" },
  { aba: "recentes", rotulo: "Mais recentes", icone: "clock" },
  { aba: "seguindo", rotulo: "Comunidades seguidas", icone: "users", contador: true },
  { aba: "salvas", rotulo: "Publicações salvas", icone: "bookmark" },
  { aba: "minhas", rotulo: "Minhas publicações", icone: "file" },
];

function SidebarEsquerda({ aberto, fechar }) {
  const f = useForum();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const naHome = pathname === "/";
  const abaAtual = params.get("aba") || "para-voce";
  const catAtual = params.get("categoria");
  const matchCom = useMatch("/r/:slug/*");
  const catComunidade = matchCom ? f.getComunidade(matchCom.params.slug)?.categoria : null;

  return (
    <>
      <div className={`sidebar-fundo ${aberto ? "visivel" : ""}`} onClick={fechar} />
      <aside className={`col-esquerda ${aberto ? "aberto" : ""}`} aria-label="Navegação do fórum">
        <nav className="card nav-lista">
          {navPrincipal.map((n) => (
            <Link
              key={n.aba}
              to={n.aba === "para-voce" ? "/" : `/?aba=${n.aba}`}
              className={naHome && !catAtual && abaAtual === n.aba ? "ativo" : ""}
              onClick={fechar}
            >
              <Icon name={n.icone} size={19} />
              <span>{n.rotulo}</span>
              {n.contador && <span className="contador-cinza">{f.seguindo.length}</span>}
            </Link>
          ))}
        </nav>

        <section className="card">
          <div className="card-titulo-pequeno">
            EXPLORAR CATEGORIAS <Icon name="sliders" size={15} />
          </div>
          <nav className="nav-categorias">
            {categorias.map((c) => (
              <Link
                key={c.id}
                to={`/?categoria=${c.id}`}
                className={`${catAtual === c.id || catComunidade === c.id ? "ativo" : ""} ${c.id === "golpes" ? "alerta" : ""}`}
                onClick={fechar}
              >
                <span className="emoji" aria-hidden="true">
                  {c.emoji}
                </span>
                <span>{c.nome}</span>
                {c.selo ? <span className={`selo selo-${c.selo.tom}`}>{c.selo.texto}</span> : c.contagem && <small>{c.contagem}</small>}
              </Link>
            ))}
          </nav>
          <button type="button" className="btn btn-suave btn-bloco" onClick={() => f.toast("Solicitação de nova comunidade enviada à moderação")}>
            <Icon name="plusCircle" size={18} /> Criar Comunidade
          </button>
        </section>

        <section className="card card-texto">
          <div className="card-titulo-pequeno">COMPROMISSO ÉTICO</div>
          <p>Repasse consciente sem ágio extorsivo. Denuncie cambismo e uploads de QR Codes falsos com um clique.</p>
        </section>

        <section className="card card-garantia-escuro">
          <strong>
            <Icon name="shieldCheck" size={16} /> GARANTIA BLINDADA
          </strong>
          <p>Transações protegidas por retenção bancária até o evento.</p>
          <Link to="/r/AvisosESeguranca/post/8901" onClick={fechar}>
            Entenda a proteção →
          </Link>
        </section>
      </aside>
    </>
  );
}

function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape-inner">
        <div>
          <strong className="rodape-marca">TrocaTicket</strong>
          <p>Comunidade transparente e segura de repasse de ingressos entre fãs.</p>
        </div>
        <div>
          <strong>Navegação</strong>
          <Link to="/">Feed Principal</Link>
          <Link to="/?categoria=trocas">Ingressos Verificados</Link>
          <Link to="/r/EventosSP">Cidades e Polos</Link>
        </div>
        <div>
          <strong>Confiança</strong>
          <Link to="/r/AvisosESeguranca">Diretrizes de Proteção</Link>
          <Link to="/?categoria=golpes">Denúncias de Cambismo</Link>
          <Link to="/r/ShowsEFestivais?aba=sobre">Termos e Moderação</Link>
        </div>
        <div>
          <strong>Suporte</strong>
          <Link to="/?categoria=duvidas">Perguntas Frequentes</Link>
          <Link to="/r/AvisosESeguranca">Falar com Moderadores</Link>
        </div>
      </div>
      <div className="rodape-base">
        <span>© {new Date().getFullYear()} TrocaTicket Comunidade. Todos os direitos reservados.</span>
        <span>Segurança P2P e Transparência em Eventos</span>
      </div>
    </footer>
  );
}

function Toasts() {
  const { toasts } = useForum();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <Icon name="check" size={16} stroke={3} /> {t.texto}
        </div>
      ))}
    </div>
  );
}

export default function Layout() {
  const [menu, setMenu] = useState(false);
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    setMenu(false);
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, search, hash]);

  return (
    <>
      <button type="button" className="pular" onClick={() => document.querySelector(".col-principal")?.focus()}>
        Pular para o conteúdo
      </button>
      <Header onMenu={() => setMenu(true)} />
      <div className="shell" id="conteudo">
        <SidebarEsquerda aberto={menu} fechar={() => setMenu(false)} />
        <Outlet />
      </div>
      <Rodape />
      <Toasts />
    </>
  );
}
