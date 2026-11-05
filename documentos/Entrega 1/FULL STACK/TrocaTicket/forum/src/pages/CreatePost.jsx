import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import Icon from "../components/Icon.jsx";
import Editor from "../components/Editor.jsx";
import { ComunidadeIcone } from "../components/Common.jsx";
import { DicaPublicar, LinksLegais } from "../components/Widgets.jsx";
import { useForum } from "../store/ForumContext.jsx";
import { numeroCompacto, tempoRelativo } from "../utils/format.js";

const tipos = [
  { id: "texto", rotulo: "Texto", icone: "list" },
  { id: "imagem", rotulo: "Imagem", icone: "image" },
  { id: "link", rotulo: "Link", icone: "link" },
  { id: "enquete", rotulo: "Enquete", icone: "chart" },
];

const sugestoesEtiquetas = ["Shows e Festivais", "Dúvida", "Dica", "Relato de Experiência", "Review de Setor", "Ingressos & Transferência", "Segurança", "Transporte", "Hospedagem"];
const LIMITE_TITULO = 300;

// Reduz a imagem para caber no localStorage (máx. 1200px, JPEG).
function lerImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = reject;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const escala = Math.min(1, 1200 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function SeletorComunidade({ valor, onChange }) {
  const f = useForum();
  const [aberto, setAberto] = useState(false);
  const c = f.getComunidade(valor);
  return (
    <div className="dropdown seletor-comunidade">
      <button type="button" className="seletor-btn" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        {c ? <ComunidadeIcone comunidade={c} size={26} /> : <span className="com-icone vazio" />}
        <b>{c ? `r/${c.slug}` : "Escolha uma comunidade"}</b>
        <Icon name="chevronDown" size={17} />
      </button>
      {aberto && (
        <ul className="popover popover-largo" role="listbox" onMouseLeave={() => setAberto(false)}>
          {f.comunidades.map((x) => (
            <li key={x.slug} role="option" aria-selected={x.slug === valor}>
              <button type="button" onClick={() => (onChange(x.slug), setAberto(false))}>
                <ComunidadeIcone comunidade={x} size={26} />
                <span>
                  <b>r/{x.slug}</b>
                  <small>{numeroCompacto(x.membros)} membros</small>
                </span>
                {x.slug === valor && <Icon name="check" size={16} className="texto-azul" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Etiquetas({ lista, onChange }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const adicionar = (t) => {
    const v = t.trim();
    if (v && !lista.includes(v) && lista.length < 4) onChange([...lista, v]);
    setTexto("");
  };
  const tons = ["azul", "verde", "roxo", "laranja"];
  return (
    <div className="etiquetas-editor">
      <div className="etiquetas">
        <button type="button" className="chip chip-cinza" onClick={() => setEditando(!editando)} disabled={lista.length >= 4}>
          <Icon name="plus" size={14} stroke={2.5} /> Adicionar etiquetas
        </button>
        {lista.map((t, i) => (
          <span key={t} className={`chip selo-${tons[i % 4]}`}>
            {t}
            <button type="button" aria-label={`Remover etiqueta ${t}`} onClick={() => onChange(lista.filter((x) => x !== t))}>
              <Icon name="x" size={12} stroke={3} />
            </button>
          </span>
        ))}
      </div>
      {editando && lista.length < 4 && (
        <div className="etiquetas-sugestoes">
          <input
            autoFocus
            value={texto}
            maxLength={30}
            placeholder="Digite e pressione Enter (máx. 4 etiquetas)"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.preventDefault(), adicionar(texto));
              if (e.key === "Escape") setEditando(false);
            }}
          />
          <div className="etiquetas">
            {sugestoesEtiquetas
              .filter((s) => !lista.includes(s) && s.toLowerCase().includes(texto.toLowerCase()))
              .map((s) => (
                <button key={s} type="button" className="chip chip-cinza" onClick={() => adicionar(s)}>
                  {s}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatePost() {
  const f = useForum();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inicial = f.getComunidade(params.get("r") || "")?.slug || "ShowsEFestivais";

  const [rascunhoId, setRascunhoId] = useState(null);
  const [comunidade, setComunidade] = useState(inicial);
  const [tipo, setTipo] = useState("texto");
  const [titulo, setTitulo] = useState("");
  const [etiquetas, setEtiquetas] = useState(["Shows e Festivais", "Dúvida"]);
  const [corpo, setCorpo] = useState("");
  const [imagem, setImagem] = useState(null);
  const [legenda, setLegenda] = useState("");
  const [link, setLink] = useState("");
  const [opcoes, setOpcoes] = useState(["", ""]);
  const [erros, setErros] = useState({});
  const [verRascunhos, setVerRascunhos] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const arquivoRef = useRef(null);

  useEffect(() => setComunidade(inicial), [inicial]);
  const c = f.getComunidade(comunidade);

  const escolherArquivo = async (arquivo) => {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return setErros((e) => ({ ...e, imagem: "Envie um arquivo de imagem (JPG, PNG, WEBP)." }));
    if (arquivo.size > 8 * 1024 * 1024) return setErros((e) => ({ ...e, imagem: "A imagem deve ter no máximo 8 MB." }));
    try {
      setImagem(await lerImagem(arquivo));
      setErros((e) => ({ ...e, imagem: undefined }));
    } catch {
      setErros((e) => ({ ...e, imagem: "Não foi possível ler a imagem." }));
    }
  };

  const validar = () => {
    const e = {};
    if (!c) e.comunidade = "Escolha uma comunidade.";
    if (!titulo.trim()) e.titulo = "Adicione um título à publicação.";
    else if (titulo.trim().length < 10) e.titulo = "O título precisa ter pelo menos 10 caracteres.";
    if (tipo === "texto" && !corpo.trim()) e.corpo = "Escreva o conteúdo da publicação.";
    if (tipo === "imagem" && !imagem) e.imagem = "Selecione uma imagem.";
    if (tipo === "link" && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(link.trim())) e.link = "Informe um link válido começando com http:// ou https://";
    if (tipo === "enquete" && opcoes.filter((o) => o.trim()).length < 2) e.enquete = "A enquete precisa de pelo menos 2 opções.";
    if (/(\(?\d{2}\)?\s?9?\d{4}-?\d{4})/.test(`${titulo} ${corpo}`)) e.corpo = "Parece haver um telefone no texto. Não compartilhe dados pessoais (regra 4).";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const publicar = (ev) => {
    ev.preventDefault();
    if (!validar()) return;
    const id = f.criarPublicacao({
      comunidade,
      titulo: titulo.trim(),
      corpo: corpo.trim(),
      etiquetas,
      imagem: tipo === "imagem" ? { src: imagem, legenda: legenda.trim() || undefined } : undefined,
      link: tipo === "link" ? link.trim() : undefined,
      enquete: tipo === "enquete" ? opcoes.map((o) => o.trim()).filter(Boolean) : undefined,
    });
    if (rascunhoId) f.removerRascunho(rascunhoId);
    f.toast("Publicação criada com sucesso!");
    navigate(`/r/${comunidade}/post/${id}`);
  };

  const salvarRascunho = () => {
    if (!titulo.trim() && !corpo.trim()) return f.toast("Escreva algo antes de salvar o rascunho");
    const id = rascunhoId || `r${Date.now()}`;
    f.salvarRascunho({ id, comunidade, titulo, corpo, etiquetas });
    setRascunhoId(id);
    f.toast("Rascunho salvo");
  };

  const carregarRascunho = (r) => {
    setRascunhoId(r.id);
    setComunidade(r.comunidade);
    setTitulo(r.titulo);
    setCorpo(r.corpo);
    setEtiquetas(r.etiquetas || []);
    setTipo("texto");
    setErros({});
    setVerRascunhos(false);
  };

  return (
    <>
      <main className="col-principal" tabIndex={-1}>
        <div className="criar-topo">
          <div>
            <h1 className="titulo-pagina">Criar publicação</h1>
            <p className="texto-suave">Compartilhe uma dúvida, experiência ou recomendação com a comunidade.</p>
          </div>
          <div className="dropdown">
            <button type="button" className="link-btn" aria-expanded={verRascunhos} onClick={() => setVerRascunhos(!verRascunhos)}>
              Rascunhos ({f.rascunhos.length})
            </button>
            {verRascunhos && (
              <div className="popover popover-largo direita">
                <div className="popover-topo">
                  <strong>Seus rascunhos</strong>
                </div>
                {f.rascunhos.length === 0 && <p className="texto-suave popover-vazio">Nenhum rascunho salvo.</p>}
                {f.rascunhos.map((r) => (
                  <div key={r.id} className="rascunho">
                    <button type="button" onClick={() => carregarRascunho(r)}>
                      <b>{r.titulo || "(sem título)"}</b>
                      <small>
                        r/{r.comunidade} • {tempoRelativo(r.atualizadoEm)}
                      </small>
                    </button>
                    <button type="button" className="icone-btn" aria-label="Excluir rascunho" onClick={() => f.removerRascunho(r.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SeletorComunidade valor={comunidade} onChange={setComunidade} />
        {erros.comunidade && <p className="erro">{erros.comunidade}</p>}

        <form className="card criar-form" onSubmit={publicar} noValidate>
          <div className="criar-abas" role="tablist">
            {tipos.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tipo === t.id} className={tipo === t.id ? "ativo" : ""} onClick={() => setTipo(t.id)}>
                <Icon name={t.icone} size={17} /> {t.rotulo}
              </button>
            ))}
          </div>

          <div className="criar-corpo">
            <div className={`campo-titulo ${erros.titulo ? "com-erro" : ""}`}>
              <textarea
                rows={1}
                value={titulo}
                maxLength={LIMITE_TITULO}
                placeholder="Adicione um título à publicação"
                aria-label="Título"
                onChange={(e) => setTitulo(e.target.value.replace(/\n/g, ""))}
              />
              <small>
                {titulo.length}/{LIMITE_TITULO}
              </small>
            </div>
            {erros.titulo && <p className="erro">{erros.titulo}</p>}

            <Etiquetas lista={etiquetas} onChange={setEtiquetas} />

            {tipo === "imagem" && (
              <>
                <div
                  className={`upload ${arrastando ? "arrastando" : ""} ${erros.imagem ? "com-erro" : ""}`}
                  onDragOver={(e) => (e.preventDefault(), setArrastando(true))}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => (e.preventDefault(), setArrastando(false), escolherArquivo(e.dataTransfer.files[0]))}
                >
                  {imagem ? (
                    <div className="upload-preview">
                      <img src={imagem} alt="Pré-visualização" />
                      <button type="button" className="btn btn-cinza btn-pequeno" onClick={() => setImagem(null)}>
                        <Icon name="trash" size={14} /> Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <Icon name="camera" size={30} />
                      <p>Arraste uma foto aqui ou</p>
                      <button type="button" className="btn btn-suave btn-pequeno" onClick={() => arquivoRef.current.click()}>
                        Escolher imagem
                      </button>
                      <small className="texto-suave">Use fotos autorais. Nunca publique QR Codes de ingressos.</small>
                    </>
                  )}
                  <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={(e) => escolherArquivo(e.target.files[0])} />
                </div>
                {erros.imagem && <p className="erro">{erros.imagem}</p>}
                <input className="campo" value={legenda} maxLength={120} placeholder="Legenda (ex.: Visão do setor Cadeira Inferior Leste)" onChange={(e) => setLegenda(e.target.value)} />
              </>
            )}

            {tipo === "link" && (
              <>
                <input className={`campo ${erros.link ? "com-erro" : ""}`} type="url" value={link} placeholder="https://" aria-label="URL" onChange={(e) => setLink(e.target.value)} />
                {erros.link && <p className="erro">{erros.link}</p>}
              </>
            )}

            {tipo === "enquete" && (
              <div className="enquete-editor">
                {opcoes.map((o, i) => (
                  <div key={i} className="enquete-linha">
                    <input
                      className="campo"
                      value={o}
                      maxLength={80}
                      placeholder={`Opção ${i + 1}`}
                      onChange={(e) => setOpcoes(opcoes.map((x, j) => (j === i ? e.target.value : x)))}
                    />
                    {opcoes.length > 2 && (
                      <button type="button" className="icone-btn" aria-label={`Remover opção ${i + 1}`} onClick={() => setOpcoes(opcoes.filter((_, j) => j !== i))}>
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                ))}
                {opcoes.length < 6 && (
                  <button type="button" className="link-btn" onClick={() => setOpcoes([...opcoes, ""])}>
                    + Adicionar opção
                  </button>
                )}
                {erros.enquete && <p className="erro">{erros.enquete}</p>}
              </div>
            )}

            <Editor
              value={corpo}
              onChange={setCorpo}
              rows={tipo === "texto" ? 10 : 4}
              rotulo="Conteúdo da publicação"
              placeholder={
                tipo === "texto" ? "Escreva sua publicação... Dê detalhes sobre ingressos, transferências, setores ou dúvidas para ajudar os colegas." : "Texto opcional para dar contexto..."
              }
            />
            {erros.corpo && <p className="erro">{erros.corpo}</p>}
          </div>

          <div className="criar-rodape">
            <button type="button" className="btn btn-cinza" onClick={salvarRascunho}>
              Salvar rascunho
            </button>
            <button type="submit" className="btn btn-primario">
              Publicar
            </button>
          </div>
        </form>
      </main>

      <aside className="col-direita">
        {c && (
          <section className="card">
            <h3 className="card-titulo">
              <Icon name="shieldCheck" size={18} className="texto-azul" /> Regras de r/{c.slug}
            </h3>
            <ol className="regras-numeradas">
              {c.regras.map((r) => (
                <li key={r.titulo}>{r.texto}</li>
              ))}
            </ol>
          </section>
        )}
        <DicaPublicar />
        <LinksLegais />
      </aside>
    </>
  );
}
