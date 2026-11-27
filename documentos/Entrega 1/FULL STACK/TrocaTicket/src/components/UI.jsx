import React, { useEffect, useRef, useId } from 'react';
import { Link } from 'react-router';
import { localeAtual, t } from '../i18n';

// Valores em reais e datas no formato do idioma escolhido (etapa 7).
export const money = (value) =>
  Number(value).toLocaleString(localeAtual(), {
    style: 'currency',
    currency: 'BRL',
    currencyDisplay: 'narrowSymbol',
  });

export const dateLabel = (date) =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString(localeAtual()) : t('A definir');

export function Badge({ children, tone }) {
  const text = String(children).toLowerCase();
  const color =
    tone ||
    (/confirm|aprov|dispon|public|abert/.test(text)
      ? 'green'
      : /pend|análise|andamento|alocado|prioridade/.test(text)
        ? 'amber'
        : /recus|cancel|selecionada/.test(text)
          ? 'red'
          : 'blue');
  // A cor vem do texto original; a situação aparece no idioma escolhido.
  return <span className={`badge ${color}`}>{typeof children === 'string' ? t(children) : children}</span>;
}

export function PageTitle({ title, subtitle, children, eyebrow, heading: Heading = 'h1' }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow purple">{t(eyebrow)}</p>}
        <Heading>{t(title)}</Heading>
        {subtitle && <p>{t(subtitle)}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function Panel({ title, subtitle, children, className = '', action }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{t(title)}</h2>
            {subtitle && <p>{t(subtitle)}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title = 'Nenhum resultado encontrado', children, heading: Heading = 'h3' }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">◇</span>
      <Heading>{t(title)}</Heading>
      <p>{typeof children === 'string' ? t(children) : children || t('Tente ajustar os filtros para encontrar o que procura.')}</p>
    </div>
  );
}

export function Tabs({ options, value, onChange, label = 'Filtrar resultados' }) {
  return (
    <div className="tabs" role="group" aria-label={t(label)}>
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={value === option ? 'active' : ''}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {t(option)}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, name, id, error, mask, onChange, children, ...props }) {
  const fieldId = id || name;
  const errorId = `${fieldId}-error`;

  function handleChange(event) {
    const input = event.currentTarget;

    if (mask) {
      input.value = mask(input.value);
    }

    onChange?.(event);
  }

  const control = children
    ? React.Children.map(children, (child) => {
        if (
          !React.isValidElement(child) ||
          !['input', 'select', 'textarea'].includes(child.type)
        ) {
          return child;
        }
        return React.cloneElement(child, {
          id: child.props.id || fieldId,
          name: child.props.name || name,
          'aria-invalid': child.props['aria-invalid'] ?? Boolean(error),
          'aria-describedby': child.props['aria-describedby'] || (error ? errorId : undefined),
        });
      })
    : (
        <input
          {...props}
          id={fieldId}
          name={name}
          onChange={handleChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      );

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={fieldId}>{t(label)}</label>
      {control}
      {error && <span id={errorId} className="field-error" role="alert">{t(error)}</span>}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="modal"
      aria-labelledby={titleId}
      ref={ref}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="panel-heading">
        <h2 id={titleId}>{t(title)}</h2>
        <button className="icon-button" aria-label={t('Fechar janela')} onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function DownloadButton({ name, rows, children = '↓ Exportar CSV' }) {
  return (
    <button className="button outline" onClick={() => downloadCSV(name, rows)}>
      {typeof children === 'string' ? t(children) : children}
    </button>
  );
}
export function downloadCSV(name, rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const blob = new Blob(['\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function NotFound({ title = 'Página não encontrada' }) {
  return (
    <div className="workspace">
      <Empty title={title}>{t('O endereço solicitado não está disponível.')}</Empty>
      <Link className="button primary" to="/perfis">
        {t('Escolher uma área')}
      </Link>
    </div>
  );
}
