import React, { useEffect, useRef, useId } from 'react';
import { Link } from 'react-router';
export const money = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dateLabel = (date) =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : 'A definir';
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
  return <span className={`badge ${color}`}>{children}</span>;
}
export function PageTitle({ title, subtitle, children, eyebrow }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow purple">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
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
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({ title = 'Nenhum resultado encontrado', children }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">◇</span>
      <h3>{title}</h3>
      <p>{children || 'Tente ajustar os filtros para encontrar o que procura.'}</p>
    </div>
  );
}
export function Tabs({ options, value, onChange, label = 'Filtrar resultados' }) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={value === option ? 'active' : ''}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
export function Field({ label, name, error, children, ...props }) {
  return (
    <div className={`field ${props.className || ''}`}>
      <label htmlFor={name}>{label}</label>
      {children || (
        <input
          id={name}
          name={name}
          {...props}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}{' '}
      {error && (
        <small className="field-error" id={`${name}-error`}>
          {error}
        </small>
      )}
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
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" aria-label="Fechar janela" onClick={onClose}>
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
      {children}
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
      <Empty title={title}>O endereço solicitado não está disponível.</Empty>
      <Link className="button primary" to="/perfis">
        Escolher uma área
      </Link>
    </div>
  );
}
