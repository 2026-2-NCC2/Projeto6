import React from 'react';
import { Field } from '../UI';
import { t } from '../../i18n';

/*
 * Controles de formulário construídos sobre o <Field> do projeto.
 * O onChange recebe o VALOR (string), não o evento — já com a máscara aplicada, se houver.
 */
const describedBy = (name, error, hint) => (error ? `${name}-error` : hint ? `${name}-hint` : undefined);

export function FormInput({ label, name, error, hint, mask, onChange, className, required, aside, ...props }) {
  return (
    <Field label={required ? `${t(label)} *` : label} name={name} error={error} className={className}>
      {aside && <span className="sp-field-aside">{t(aside)}</span>}
      <input
        id={name}
        name={name}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={describedBy(name, error, hint)}
        onChange={(event) => onChange?.(mask ? mask(event.target.value) : event.target.value)}
        {...props}
      />
      {hint && !error && (
        <small className="sp-field-hint" id={`${name}-hint`}>
          {t(hint)}
        </small>
      )}
    </Field>
  );
}

export function FormSelect({ label, name, error, options, placeholder, onChange, className, required, ...props }) {
  return (
    <Field label={required ? `${t(label)} *` : label} name={name} error={error} className={className}>
      <select
        id={name}
        name={name}
        aria-required={required || undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        {...props}
      >
        {placeholder && <option value="">{t(placeholder)}</option>}
        {options.map((option) => {
          const { value, label: text } = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <option key={value} value={value}>
              {t(text)}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function FormTextArea({ label, name, error, hint, onChange, className, maxLength, value, rows = 4, ...props }) {
  // Campo vazio no banco chega como null: o texto e o contador tratam como vazio.
  const texto = value ?? '';
  return (
    <Field label={label} name={name} error={error} className={className}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={texto}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={describedBy(name, error, hint)}
        onChange={(event) => onChange?.(event.target.value)}
        {...props}
      />
      <div className="sp-field-meta">
        {hint && !error ? (
          <small className="sp-field-hint" id={`${name}-hint`}>
            {t(hint)}
          </small>
        ) : (
          <span />
        )}
        {maxLength && (
          <small className="sp-field-hint" aria-hidden="true">
            {texto.length}/{maxLength}
          </small>
        )}
      </div>
    </Field>
  );
}

// Linha de preferência com checkbox estilizado
export function PreferenceItem({ title, description, checked, onChange }) {
  return (
    <label className="sp-preference">
      <span>
        <strong>{t(title)}</strong>
        {description && <small>{t(description)}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

// Opções de rádio em formato de cartão (ex.: condição de faturamento)
export function RadioCards({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="sp-radio-cards">
      <legend>{t(legend)}</legend>
      {options.map((option) => (
        <label key={option} className={value === option ? 'checked' : ''}>
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
          <span>{t(option)}</span>
        </label>
      ))}
    </fieldset>
  );
}
