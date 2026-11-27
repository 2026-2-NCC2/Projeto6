import React, { useEffect, useId, useRef } from 'react';

// Janela do painel de acessibilidade (etapa 8, adaptada de PreferenceDialog.jsx da 2.0):
// <dialog> nativo com foco contido, Esc e clique fora fecham; ao fechar, o foco volta ao botão
// que abriu.
export default function JanelaPreferencias({ titulo, className = '', aoFechar, children }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const no = ref.current;
    const anterior = document.activeElement;
    const rolagemAntiga = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    no.showModal();
    return () => {
      no.close();
      document.body.style.overflow = rolagemAntiga;
      anterior?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`preference-dialog ${className}`}
      aria-labelledby={id}
      onKeyDown={(evento) => {
        if (evento.key !== 'Tab') return;
        const controles = Array.from(
          evento.currentTarget.querySelectorAll(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((elemento) => elemento.getClientRects().length && elemento.tabIndex >= 0);
        const primeiro = controles[0];
        const ultimo = controles[controles.length - 1];
        if (!primeiro) {
          evento.preventDefault();
          return;
        }
        if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }}
      onCancel={(evento) => {
        evento.preventDefault();
        aoFechar();
      }}
      onClick={(evento) => {
        if (evento.target !== evento.currentTarget) return;
        const caixa = evento.currentTarget.getBoundingClientRect();
        if (
          evento.clientX < caixa.left ||
          evento.clientX > caixa.right ||
          evento.clientY < caixa.top ||
          evento.clientY > caixa.bottom
        ) {
          aoFechar();
        }
      }}
    >
      <div id={id} className="sr-only">
        {titulo}
      </div>
      {children}
    </dialog>
  );
}
