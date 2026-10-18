// Official v7 script initializes the widget automatically. Load only after an explicit click.
let pending;
export function loadVLibras() {
  if (window.VLibrasWidget?.initBtn) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.id = 'trocaticket-vlibras';
    let timer;
    let poll;
    const fail = () => {
      clearTimeout(timer);
      clearTimeout(poll);
      script.remove();
      pending = undefined;
      reject(new Error('VLibras unavailable'));
    };
    script.onerror = fail;
    script.onload = () => {
      function checkReady() {
        if (window.VLibrasWidget?.initBtn) {
          clearTimeout(timer);
          resolve();
        } else poll = setTimeout(checkReady, 100);
      }
      checkReady();
    };
    timer = setTimeout(fail, 15000);
    document.body.append(script);
  });
  return pending;
}
