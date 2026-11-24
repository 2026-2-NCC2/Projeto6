// Renderizador de markdown bem simples e seguro (gera elementos React,
// nunca HTML cru). Suporta: **negrito**, *itálico*, `código`, [link](url),
// listas (- / 1.), citações (>) e blocos de código (```).

function inline(texto, chave = "i") {
  const partes = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let ultimo = 0;
  let m;
  let n = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const t = m[0];
    const k = `${chave}-${n++}`;
    if (t.startsWith("**")) partes.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) partes.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, rotulo, url] = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const seguro = /^https?:\/\//i.test(url) ? url : "#";
      partes.push(
        <a key={k} href={seguro} target="_blank" rel="noreferrer noopener">
          {rotulo}
        </a>,
      );
    } else partes.push(<em key={k}>{t.slice(1, -1)}</em>);
    ultimo = m.index + t.length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function Markdown({ texto, className = "md" }) {
  const linhas = (texto || "").split("\n");
  const blocos = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (linha.startsWith("```")) {
      const cod = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith("```")) cod.push(linhas[i++]);
      i++;
      blocos.push(<pre key={i}><code>{cod.join("\n")}</code></pre>);
    } else if (/^\s*[-*] /.test(linha)) {
      const itens = [];
      while (i < linhas.length && /^\s*[-*] /.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*[-*] /, ""));
      blocos.push(<ul key={i}>{itens.map((t, j) => <li key={j}>{inline(t, `u${i}${j}`)}</li>)}</ul>);
    } else if (/^\s*\d+\. /.test(linha)) {
      const itens = [];
      while (i < linhas.length && /^\s*\d+\. /.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*\d+\. /, ""));
      blocos.push(<ol key={i}>{itens.map((t, j) => <li key={j}>{inline(t, `o${i}${j}`)}</li>)}</ol>);
    } else if (linha.startsWith(">")) {
      const cit = [];
      while (i < linhas.length && linhas[i].startsWith(">")) cit.push(linhas[i++].replace(/^>\s?/, ""));
      blocos.push(<blockquote key={i}>{inline(cit.join(" "), `q${i}`)}</blockquote>);
    } else if (linha.trim() === "") {
      i++;
    } else {
      const par = [];
      while (i < linhas.length && linhas[i].trim() !== "" && !/^(\s*[-*] |\s*\d+\. |>|```)/.test(linhas[i])) par.push(linhas[i++]);
      blocos.push(<p key={i}>{inline(par.join(" "), `p${i}`)}</p>);
    }
  }
  return <div className={className}>{blocos}</div>;
}
