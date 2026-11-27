// VLibras, tradutor de português para Libras do governo federal (etapa 8, adaptado de
// src/accessibility/vlibras.js da TrocaTicket 2.0). O script oficial é baixado de
// vlibras.gov.br somente depois que a pessoa clica em "Ativar VLibras"; até lá, nada externo
// é carregado. Ele se inicia sozinho e mostra o próprio botão na tela.
export const ENDERECO_VLIBRAS = 'https://vlibras.gov.br/app/vlibras-plugin.js';
const LIMITE_MS = 15000;

let pendente;

export function vlibrasPronto() {
  return typeof window !== 'undefined' && Boolean(window.VLibrasWidget?.initBtn);
}

export function carregarVLibras() {
  if (vlibrasPronto()) return Promise.resolve();
  if (pendente) return pendente;
  pendente = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = ENDERECO_VLIBRAS;
    script.async = true;
    script.id = 'trocaticket-vlibras';
    let limite;
    let espera;
    const falhar = () => {
      clearTimeout(limite);
      clearTimeout(espera);
      script.remove();
      pendente = undefined;
      reject(new Error('VLibras indisponível'));
    };
    script.onerror = falhar;
    script.onload = () => {
      function conferir() {
        if (vlibrasPronto()) {
          clearTimeout(limite);
          resolve();
        } else {
          espera = setTimeout(conferir, 100);
        }
      }
      conferir();
    };
    limite = setTimeout(falhar, LIMITE_MS);
    document.body.append(script);
  });
  return pendente;
}
