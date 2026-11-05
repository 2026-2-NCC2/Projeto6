import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { comentarios as comentariosSeed, comunidades, notificacoesIniciais, publicacoes as publicacoesSeed, usuarioAtual } from "../data/forum.js";

const CHAVE = "forum-trocaticket:v1";

const estadoInicial = {
  dark: false,
  votos: {},
  votosComentario: {},
  salvos: [],
  seguindo: ["ShowsEFestivais"],
  minhasPublicacoes: [],
  meusComentarios: {},
  rascunhos: [
    { id: "r1", comunidade: "ShowsEFestivais", titulo: "Vale a pena o setor Pista no Morumbis?", corpo: "", etiquetas: ["Dúvida"], atualizadoEm: new Date().toISOString() },
    { id: "r2", comunidade: "TrocasEIngressos", titulo: "", corpo: "Rascunho sobre transferência nominal...", etiquetas: [], atualizadoEm: new Date().toISOString() },
  ],
  recentes: ["8910", "8905", "8907"],
  notificacoesLidas: [],
};

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
    return salvo ? { ...estadoInicial, ...salvo } : estadoInicial;
  } catch {
    return estadoInicial;
  }
}

const ForumContext = createContext(null);

// Insere comentários do usuário (lista plana com paiId) dentro da árvore de exemplo.
function montarArvore(seed, meus) {
  const clonar = (lista) => lista.map((c) => ({ ...c, respostas: clonar(c.respostas || []) }));
  const arvore = clonar(seed);
  const indice = new Map();
  const indexar = (lista) => lista.forEach((c) => (indice.set(c.id, c), indexar(c.respostas)));
  indexar(arvore);
  for (const c of meus) {
    const no = { ...c, respostas: [] };
    indice.set(c.id, no);
    const pai = c.paiId && indice.get(c.paiId);
    if (pai) pai.respostas.push(no);
    else arvore.unshift(no);
  }
  return arvore;
}

export function ForumProvider({ children }) {
  const [estado, setEstado] = useState(carregar);
  const [identidadeSite, setIdentidadeSite] = useState(null);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const receberIdentidade = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "TROCATICKET_IDENTITY" && event.data.payload) {
        setIdentidadeSite(event.data.payload);
      }
    };
    window.addEventListener("message", receberIdentidade);
    // Solicita novamente caso o fórum termine de montar depois do primeiro envio.
    window.parent?.postMessage({ type: "TROCATICKET_FORUM_READY" }, window.location.origin);
    return () => window.removeEventListener("message", receberIdentidade);
  }, []);

  const usuarioSessao = useMemo(() => {
    if (!identidadeSite) return usuarioAtual;
    const nome = identidadeSite.name || "Visitante TrocaTicket";
    const emailBase = (identidadeSite.email || "").split("@")[0];
    const username = (emailBase || nome.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_"))
      .replace(/^_+|_+$/g, "").toLowerCase() || "participante";
    const iniciais = nome.split(/\\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
    return { ...usuarioAtual, username, nome, iniciais, role: identidadeSite.role };
  }, [identidadeSite]);
  const idToast = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch {
      // Cota do navegador excedida (ex.: muitas imagens): mantém só em memória.
    }
    document.documentElement.dataset.theme = estado.dark ? "dark" : "light";
    try { localStorage.setItem("trocaticket-theme", estado.dark ? "dark" : "light"); } catch {}
    window.parent?.postMessage({ type: "TROCATICKET_THEME_CHANGED", dark: estado.dark }, window.location.origin);
  }, [estado]);

  useEffect(() => {
    const syncTema = (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== "TROCATICKET_SET_THEME") return;
      setEstado((e) => ({ ...e, dark: Boolean(event.data.dark) }));
    };
    const syncStorage = (event) => {
      if (event.key === "trocaticket-theme") setEstado((e) => ({ ...e, dark: event.newValue === "dark" }));
    };
    window.addEventListener("message", syncTema);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("message", syncTema);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  const atualizar = useCallback((fn) => setEstado((e) => ({ ...e, ...fn(e) })), []);

  const toast = useCallback((texto) => {
    const id = ++idToast.current;
    setToasts((t) => [...t, { id, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const api = useMemo(() => {
    const todas = [...estado.minhasPublicacoes, ...publicacoesSeed];
    const getPublicacao = (id) => todas.find((p) => p.id === String(id));
    const getComunidade = (slug) => comunidades.find((c) => c.slug.toLowerCase() === String(slug).toLowerCase());
    const pontuacao = (p) => p.votos + (estado.votos[p.id] || 0);
    const comentariosMeus = (postId) => estado.meusComentarios[postId] || [];
    const totalComentarios = (p) => p.comentarios + comentariosMeus(p.id).length;

    return {
      ...estado,
      usuario: usuarioSessao,
      comunidades,
      publicacoes: todas,
      toasts,
      toast,
      getPublicacao,
      getComunidade,
      pontuacao,
      totalComentarios,
      votoDe: (id) => estado.votos[id] || 0,
      votar: (id, dir) =>
        atualizar((e) => {
          const atual = e.votos[id] || 0;
          return { votos: { ...e.votos, [id]: atual === dir ? 0 : dir } };
        }),
      votoComentario: (id) => estado.votosComentario[id] || 0,
      votarComentario: (id, dir) =>
        atualizar((e) => {
          const atual = e.votosComentario[id] || 0;
          return { votosComentario: { ...e.votosComentario, [id]: atual === dir ? 0 : dir } };
        }),
      estaSalvo: (id) => estado.salvos.includes(id),
      alternarSalvo: (id) => {
        const salvo = estado.salvos.includes(id);
        atualizar((e) => ({ salvos: salvo ? e.salvos.filter((x) => x !== id) : [id, ...e.salvos] }));
        toast(salvo ? "Publicação removida dos salvos" : "Publicação salva");
      },
      segue: (slug) => estado.seguindo.includes(slug),
      alternarSeguir: (slug) => {
        const segue = estado.seguindo.includes(slug);
        atualizar((e) => ({ seguindo: segue ? e.seguindo.filter((x) => x !== slug) : [...e.seguindo, slug] }));
        toast(segue ? `Você deixou de seguir r/${slug}` : `Agora você segue r/${slug}`);
      },
      removerPublicacao: (id) => {
        const publicacao = estado.minhasPublicacoes.find((item) => item.id === String(id));
        if (!publicacao || publicacao.autor !== usuarioSessao.username) return false;
        atualizar((e) => ({ minhasPublicacoes: e.minhasPublicacoes.filter((item) => item.id !== String(id)) }));
        toast("Publicação excluída");
        return true;
      },
      criarPublicacao: (dados) => {
        const id = String(9000 + estado.minhasPublicacoes.length + 1);
        const nova = {
          id,
          autor: usuarioSessao.username,
          criadoEm: new Date().toISOString(),
          votos: 1,
          comentarios: 0,
          resumo: dados.corpo.replace(/[*`>#[\]]/g, "").slice(0, 220),
          selo: dados.etiquetas[0] ? { texto: dados.etiquetas[0], tom: "azul" } : undefined,
          categoria: getComunidade(dados.comunidade)?.categoria,
          minha: true,
          ...dados,
        };
        atualizar((e) => ({ minhasPublicacoes: [nova, ...e.minhasPublicacoes] }));
        return id;
      },
      comentariosDe: (postId) => montarArvore(comentariosSeed[postId] || [], comentariosMeus(postId)),
      comentar: (postId, texto, paiId) =>
        atualizar((e) => {
          const lista = e.meusComentarios[postId] || [];
          const novo = { id: `u${Date.now()}`, autor: usuarioSessao.username, criadoEm: new Date().toISOString(), texto, votos: 1, paiId };
          return { meusComentarios: { ...e.meusComentarios, [postId]: [...lista, novo] } };
        }),
      salvarRascunho: (r) =>
        atualizar((e) => {
          const id = r.id || `r${Date.now()}`;
          const novo = { ...r, id, atualizadoEm: new Date().toISOString() };
          return { rascunhos: [novo, ...e.rascunhos.filter((x) => x.id !== id)] };
        }),
      removerRascunho: (id) => atualizar((e) => ({ rascunhos: e.rascunhos.filter((x) => x.id !== id) })),
      registrarVisita: (id) => atualizar((e) => (e.recentes[0] === id ? {} : { recentes: [id, ...e.recentes.filter((x) => x !== id)].slice(0, 5) })),
      limparRecentes: () => atualizar(() => ({ recentes: [] })),
      notificacoes: notificacoesIniciais.map((n) => ({ ...n, lida: estado.notificacoesLidas.includes(n.id) })),
      marcarNotificacoesLidas: () => atualizar(() => ({ notificacoesLidas: notificacoesIniciais.map((n) => n.id) })),
      alternarTema: () => atualizar((e) => ({ dark: !e.dark })),
    };
  }, [estado, toasts, toast, atualizar, usuarioSessao]);

  return <ForumContext.Provider value={api}>{children}</ForumContext.Provider>;
}

export function useForum() {
  const ctx = useContext(ForumContext);
  if (!ctx) throw new Error("useForum precisa estar dentro de <ForumProvider>");
  return ctx;
}
