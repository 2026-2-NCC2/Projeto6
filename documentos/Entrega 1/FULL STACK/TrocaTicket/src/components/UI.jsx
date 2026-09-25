import React, { useEffect, useRef, useId, useState } from 'react';
import { Link } from 'react-router';
import { csvText } from '../services/rules';
export const money = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dateLabel = (date) =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : 'A definir';
export function Badge({ children, tone }) {
  const text = String(children).toLowerCase();
  const color =
    tone ||
    (/confirm|aprov|dispon|public|abert|reservado/.test(text)
      ? 'green'
      : /pend|análise|andamento|alocado|prioridade/.test(text)
        ? 'amber'
        : /recus|cancel|selecionada/.test(text)
          ? 'red'
          : 'blue');
  return <span className={`badge ${color}`}>{children}</span>;
}
export function PageTitle({ title, subtitle, children, eyebrow, as: Heading = 'h1' }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow purple">{eyebrow}</p>}
        <Heading>{title}</Heading>
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
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          onClose();
      }}
    >
      <div className="panel-heading">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" aria-label="Fechar janela" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function DownloadButton({ name, rows, children = '↓ Exportar CSV' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="button outline" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <Modal title="Exportar relatório" onClose={() => setOpen(false)}>
          <p>Confira os dados e baixe o arquivo para abrir no Excel ou em outra planilha.</p>
          <label htmlFor="csv-preview">Conteúdo do arquivo {name}</label>
          <textarea
            id="csv-preview"
            className="csv-preview"
            readOnly
            value={csvText(rows).replace(/^\ufeff/, '')}
          />
          <p className="muted">
            Se o navegador impedir o download, selecione e copie o conteúdo acima para um arquivo
            .csv.
          </p>
          <button type="button" className="button primary" onClick={() => downloadCSV(name, rows)}>
            Baixar arquivo CSV
          </button>
        </Modal>
      )}
    </>
  );
}
export function downloadCSV(name, rows) {
  const blob = new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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
