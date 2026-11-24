import { useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { Markdown } from "../utils/markdown.jsx";

const acoes = [
  { id: "bold", rotulo: "Negrito", antes: "**", depois: "**", exemplo: "texto em negrito" },
  { id: "italic", rotulo: "Itálico", antes: "*", depois: "*", exemplo: "texto em itálico" },
  { id: "link", rotulo: "Link", antes: "[", depois: "](https://)", exemplo: "descrição do link" },
  { sep: true },
  { id: "list", rotulo: "Lista", linha: "- " },
  { id: "listOrdered", rotulo: "Lista numerada", linha: "1. " },
  { id: "quote", rotulo: "Citação", linha: "> " },
  { id: "code", rotulo: "Código", antes: "`", depois: "`", exemplo: "código" },
];

// Editor de texto com barra de formatação em markdown + pré-visualização.
export default function Editor({ value, onChange, placeholder, rows = 8, compacto = false, id, rotulo }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(false);

  const aplicar = (a) => {
    const el = ref.current;
    const ini = el.selectionStart;
    const fim = el.selectionEnd;
    const sel = value.slice(ini, fim);
    let novo;
    let cursorIni;
    let cursorFim;
    if (a.linha) {
      const inicioLinha = value.lastIndexOf("\n", ini - 1) + 1;
      const bloco = value.slice(inicioLinha, fim) || "";
      const convertido = bloco
        .split("\n")
        .map((l, i) => (a.id === "listOrdered" ? `${i + 1}. ` : a.linha) + l)
        .join("\n");
      novo = value.slice(0, inicioLinha) + convertido + value.slice(fim);
      cursorIni = inicioLinha;
      cursorFim = inicioLinha + convertido.length;
    } else {
      const meio = sel || a.exemplo;
      novo = value.slice(0, ini) + a.antes + meio + a.depois + value.slice(fim);
      cursorIni = ini + a.antes.length;
      cursorFim = cursorIni + meio.length;
    }
    onChange(novo);
    setPreview(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorIni, cursorFim);
    });
  };

  const atalhos = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b" || k === "i") {
      e.preventDefault();
      aplicar(acoes.find((a) => a.id === (k === "b" ? "bold" : "italic")));
    }
  };

  return (
    <div className={`editor ${compacto ? "editor-compacto" : ""}`}>
      {!compacto && <Toolbar aplicar={aplicar} preview={preview} setPreview={setPreview} />}
      {preview ? (
        <div className="editor-preview" style={{ minHeight: rows * 24 }}>
          {value.trim() ? <Markdown texto={value} /> : <p className="texto-suave">Nada para pré-visualizar.</p>}
        </div>
      ) : (
        <textarea id={id} ref={ref} value={value} rows={rows} placeholder={placeholder} aria-label={rotulo || placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={atalhos} />
      )}
      {compacto && <Toolbar aplicar={aplicar} preview={preview} setPreview={setPreview} compacto />}
    </div>
  );
}

function Toolbar({ aplicar, preview, setPreview, compacto }) {
  const lista = compacto ? acoes.filter((a) => ["bold", "italic", "link", "quote"].includes(a.id)) : acoes;
  return (
    <div className="editor-toolbar">
      {lista.map((a, i) =>
        a.sep ? (
          <span key={i} className="editor-sep" />
        ) : (
          <button key={a.id} type="button" title={a.rotulo} aria-label={a.rotulo} onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar(a)}>
            <Icon name={a.id} size={16} stroke={2.2} />
          </button>
        ),
      )}
      <span className="espaco" />
      <button type="button" className={`editor-modo ${preview ? "ativo" : ""}`} onClick={() => setPreview(!preview)}>
        {preview ? "Editar" : compacto ? "Prévia" : "Markdown"}
      </button>
    </div>
  );
}
