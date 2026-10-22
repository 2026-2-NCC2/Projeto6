import React, { useEffect, useRef, useId, useState } from 'react';
import { Link } from 'react-router';
import { csvText } from '../services/rules';
import { getLocale, translate, useI18n } from '../i18n';
export const money = (value) =>
  Number(value).toLocaleString(getLocale(), { style: 'currency', currency: 'BRL' });
export const dateLabel = (date) =>
  date ? new Date(`${date}T12:00:00`).toLocaleDateString(getLocale()) : translate('A definir');
export function Badge({ children, tone }) {
  const { t } = useI18n();
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
  return <span className={`badge ${color}`}>{t(children)}</span>;
}
export function PageTitle({ title, subtitle, children, eyebrow, as: Heading = 'h1' }) {
  const { t } = useI18n();
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
  const { t } = useI18n();
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
export function Empty({ title = 'Nenhum resultado encontrado', children }) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <span aria-hidden="true">◇</span>
      <h3>{t(title)}</h3>
      <p>{t(children || 'Tente ajustar os filtros para encontrar o que procura.')}</p>
    </div>
  );
}
export function Tabs({ options, value, onChange, label = 'Filtrar resultados' }) {
  const { t } = useI18n();
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
export function Field({ label, name, error, children, ...props }) {
  const { t } = useI18n();
  return (
    <div className={`field ${props.className || ''}`}>
      <label htmlFor={name}>{t(label)}</label>
      {children || (
        <input
          id={name}
          name={name}
          {...props}
          placeholder={t(props.placeholder)}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}{' '}
      {error && (
        <small className="field-error" id={`${name}-error`}>
          {t(error)}
        </small>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const { t } = useI18n();
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
        <h2 id={titleId}>{t(title)}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={t('Fechar janela')}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function DownloadButton({ name, rows, children = '↓ Exportar CSV' }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="button outline" onClick={() => setOpen(true)}>
        {t(children)}
      </button>
      {open && (
        <Modal title={t('Exportar relatório')} onClose={() => setOpen(false)}>
          <p>{t('Confira os dados e baixe o arquivo para abrir no Excel ou em outra planilha.')}</p>
          <label htmlFor="csv-preview">{t('Conteúdo do arquivo {name}', { name })}</label>
          <textarea
            id="csv-preview"
            className="csv-preview"
            readOnly
            value={csvText(rows).replace(/^\ufeff/, '')}
          />
          <p className="muted">
            {t(
              'Se o navegador impedir o download, selecione e copie o conteúdo acima para um arquivo .csv.',
            )}
          </p>
          <button type="button" className="button primary" onClick={() => downloadCSV(name, rows)}>
            {t('Baixar arquivo CSV')}
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
  const { t } = useI18n();
  return (
    <div className="workspace">
      <Empty title={title}>{t('O endereço solicitado não está disponível.')}</Empty>
      <Link className="button primary" to="/perfis">
        {t('Escolher uma área')}
      </Link>
    </div>
  );
}
