import React, { useRef } from 'react';
import { Icon } from './Icons';

/** Seção de formulário com ícone, título e subtítulo. */
export function FormSection({ icon, title, subtitle, children, className = '' }) {
  return (
    <section className={`fc-section ${className}`}>
      <header className="fc-section-head">
        <h2>
          {icon && <Icon name={icon} size={20} />}
          {title}
        </h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

/** Rótulo + mensagem de ajuda/erro compartilhados por todos os campos. */
export function FieldShell({ id, label, required, aside, hint, error, children }) {
  return (
    <div className={`fc-field ${error ? 'has-error' : ''}`}>
      <div className="fc-label-row">
        <label htmlFor={id}>
          {label}
          {required && (
            <span className="fc-required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
        {aside && <span className="fc-aside">{aside}</span>}
      </div>
      {children}
      {hint && !error && <small className="fc-hint">{hint}</small>}
      {error && (
        <small className="fc-error" id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

/** Campo de texto com ícone opcional. `readOnly`/`disabled` aplicam o visual de bloqueado. */
export function TextField({ label, name, icon, required, aside, hint, error, ...input }) {
  const locked = input.readOnly || input.disabled;
  return (
    <FieldShell id={name} {...{ label, required, aside, hint, error }}>
      <div className={`fc-control ${locked ? 'is-locked' : ''}`}>
        {icon && <Icon name={icon} size={16} />}
        <input
          id={name}
          name={name}
          aria-required={required || undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...input}
        />
      </div>
    </FieldShell>
  );
}

/** Select estilizado. `options` aceita strings ou { value, label }. */
export function SelectField({ label, name, options, required, aside, hint, error, ...select }) {
  return (
    <FieldShell id={name} {...{ label, required, aside, hint, error }}>
      <div className={`fc-control fc-select ${select.disabled ? 'is-locked' : ''}`}>
        <select id={name} name={name} aria-invalid={!!error} {...select}>
          {options.map((option) => {
            const { value, label: text } =
              typeof option === 'string' ? { value: option, label: option } : option;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <Icon name="chevron-down" size={16} />
      </div>
    </FieldShell>
  );
}

/** Linha com ícone, texto e interruptor (ex.: autenticação em 2 fatores). */
export function ToggleRow({ icon, title, description, checked, onChange, onLabel, offLabel }) {
  return (
    <label className="fc-toggle">
      <span className="fc-toggle-icon">
        <Icon name={icon} size={20} />
      </span>
      <span className="fc-toggle-text">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className={`fc-badge ${checked ? 'on' : 'off'}`}>{checked ? onLabel : offLabel}</span>
      <input
        type="checkbox"
        role="switch"
        className="fc-switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

// Recorta a imagem em quadrado e reduz para `size` px, mantendo o armazenamento local pequeno.
function squareThumbnail(file, size) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      if (side < size) {
        reject(new Error(`A imagem precisa ter no mínimo ${size}×${size}px.`));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, size, size);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem escolhida.'));
    };
    image.src = url;
  });
}

/** Avatar com envio/remoção de foto (PNG, JPG ou WEBP). Devolve um data URL quadrado. */
export function PhotoUpload({
  name,
  title,
  photo,
  initials,
  onChange,
  onError,
  minSize = 400,
  maxMb = 5,
}) {
  const input = useRef(null);
  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      onError('Formato inválido. Use PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      onError(`A imagem deve ter no máximo ${maxMb} MB.`);
      return;
    }
    try {
      onChange(await squareThumbnail(file, minSize));
      onError('');
    } catch (error) {
      onError(error.message);
    }
  }
  return (
    <div className="fc-photo">
      <div className="fc-photo-avatar">
        {photo ? <img src={photo} alt={`Foto de ${name}`} /> : <span>{initials}</span>}
        <button
          type="button"
          className="fc-photo-camera"
          aria-label="Trocar foto"
          onClick={() => input.current.click()}
        >
          <Icon name="camera" size={16} />
        </button>
      </div>
      <div className="fc-photo-body">
        <h2>{title}</h2>
        <div className="fc-photo-actions">
          <button type="button" className="button dark" onClick={() => input.current.click()}>
            <Icon name="upload" size={15} /> Enviar Nova Foto
          </button>
          <button
            type="button"
            className="fc-link-danger"
            disabled={!photo}
            onClick={() => onChange('')}
          >
            Remover Foto
          </button>
        </div>
        <p>
          Formatos recomendados: PNG, JPG ou WEBP (Resolução mínima {minSize}×{minSize}px, máx.{' '}
          {maxMb}MB).
        </p>
        <input
          ref={input}
          type="file"
          hidden
          tabIndex={-1}
          accept="image/png,image/jpeg,image/webp"
          onChange={pick}
          data-testid="photo-input"
        />
      </div>
    </div>
  );
}
