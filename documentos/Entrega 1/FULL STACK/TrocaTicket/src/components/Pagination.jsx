import React from 'react';

// 1 2 3 … 10: sempre mostra as pontas e a página atual com vizinhas.
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, 2, pages - 1, pages, page - 1, page, page + 1]);
  const sorted = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) result.push(`gap-${n}`);
    result.push(n);
  });
  return result;
}

/** Paginação com resumo à esquerda. `summary(from, to, total)` personaliza o texto. */
export default function Pagination({ page, pageSize, total, onPage, summary }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pager">
      <span className="pager-summary">
        {summary ? (
          summary(from, to, total)
        ) : (
          <>
            Mostrando <strong>{from}</strong> a <strong>{to}</strong> de <strong>{total}</strong>{' '}
            resultados
          </>
        )}
      </span>
      <nav className="pager-nav" aria-label="Paginação">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        {pageList(page, pages).map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={item === page ? 'active' : ''}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Próximo
        </button>
      </nav>
    </div>
  );
}
