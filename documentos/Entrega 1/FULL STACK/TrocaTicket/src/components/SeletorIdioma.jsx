import React, { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { t, useIdioma } from '../i18n';

// Seletor de idioma do header (etapa 7, adaptado do botão de idioma da TrocaTicket 2.0).
// O idioma fica salvo neste navegador; o português do Brasil é o padrão.
export default function SeletorIdioma() {
  const { idioma, idiomas, definirIdioma } = useIdioma();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const botao = useRef(null);
  const idPainel = useId();
  const atual = idiomas.find((item) => item.codigo === idioma) || idiomas[0];

  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return undefined;
    function foraDaCaixa(event) {
      if (!caixa.current?.contains(event.target)) setAberto(false);
    }
    function teclado(event) {
      if (event.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    }
    document.addEventListener('pointerdown', foraDaCaixa);
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('pointerdown', foraDaCaixa);
      document.removeEventListener('keydown', teclado);
    };
  }, [aberto]);

  function escolher(codigo) {
    definirIdioma(codigo);
    setAberto(false);
    botao.current?.focus();
  }

  return (
    <div className="language-switcher" ref={caixa}>
      <button
        ref={botao}
        type="button"
        className="language-toggle"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={`${atual.curto} · ${t('Idioma do site: {idioma}', { idioma: atual.nome })}`}
        title={t('Idioma do site')}
        onClick={() => setAberto((valor) => !valor)}
      >
        <span aria-hidden="true">{atual.curto}</span>
        <span className="demo-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {aberto && (
        <div className="language-panel" id={idPainel}>
          <p className="demo-switcher-title">
            {t('Idioma do site')}
            <small>{t('O idioma fica salvo neste navegador.')}</small>
          </p>
          <ul aria-label={t('Idiomas')}>
            {idiomas.map((item) => (
              <li key={item.codigo}>
                <button
                  type="button"
                  className="demo-option language-option"
                  lang={item.codigo}
                  aria-current={item.codigo === idioma ? 'true' : undefined}
                  onClick={() => escolher(item.codigo)}
                >
                  <span className="language-code" aria-hidden="true">
                    {item.curto}
                  </span>
                  <span>{item.nome}</span>
                  {item.codigo === idioma && <small>{t('atual')}</small>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
