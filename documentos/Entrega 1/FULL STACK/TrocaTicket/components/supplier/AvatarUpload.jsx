import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { initialsOf } from '../../utils/format';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

/*
 * Foto de perfil com envio, validação e remoção.
 *  - photo:     data URL atual (vazio = mostra as iniciais)
 *  - onChange:  recebe o novo data URL (ou '' ao remover)
 *  - children:  conteúdo exibido ao lado da foto (nome, selos…)
 */
export default function AvatarUpload({ name, photo, onChange, maxMB = 2, children }) {
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!ACCEPTED.includes(file.type) || file.size > maxMB * 1024 * 1024) {
      setError(`Escolha uma imagem PNG, JPG ou WEBP de até ${maxMB} MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setError('');
      onChange(reader.result);
    };
    reader.onerror = () => setError('Não foi possível ler a imagem. Tente outro arquivo.');
    reader.readAsDataURL(file);
  }
  const openPicker = () => inputRef.current?.click();

  return (
    <div className="sp-avatar-upload">
      <div className="sp-avatar-wrap">
        <div className="avatar large">
          {photo ? <img src={photo} alt={`Foto de ${name || 'perfil'}`} /> : initialsOf(name)}
        </div>
        <button type="button" className="sp-avatar-camera" onClick={openPicker} aria-label="Escolher foto de perfil">
          <Icon name="camera" size={14} />
        </button>
      </div>
      <div className="sp-avatar-body">
        {children}
        <div className="actions">
          <button type="button" className="button dark sp-small-button" onClick={openPicker}>
            <Icon name="upload" size={14} /> {photo ? 'Trocar foto' : 'Enviar nova foto'}
          </button>
          {photo && (
            <button
              type="button"
              className="sp-danger-text"
              onClick={() => {
                setError('');
                onChange('');
              }}
            >
              Remover foto
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          className="sp-hidden-input"
          type="file"
          tabIndex={-1}
          accept={ACCEPTED.join(',')}
          onChange={pick}
        />
        <p className="sp-hint">Formatos recomendados: PNG, JPG ou WEBP (máx. {maxMB} MB)</p>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
