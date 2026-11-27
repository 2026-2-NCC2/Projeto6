import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { initialsOf } from '../../utils/format';
import { t } from '../../i18n';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

/*
 * Foto de perfil com envio, validação e remoção.
 *  - photo:     data URL atual (vazio = mostra as iniciais)
 *  - onChange:  recebe o novo data URL (ou '' ao remover)
 *  - children:  conteúdo exibido ao lado da foto (nome, selos…)
 */
export default function AvatarUpload({ name, photo, onChange, maxMB = 2, children, disabled = false }) {
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
          {photo ? <img src={photo} alt={name ? t('Foto de {nome}', { nome: name }) : t('Foto de perfil')} /> : initialsOf(name)}
        </div>
        <button type="button" className="sp-avatar-camera" onClick={openPicker} aria-label={t('Escolher foto de perfil')} disabled={disabled}>
          <Icon name="camera" size={14} />
        </button>
      </div>
      <div className="sp-avatar-body">
        {children}
        <div className="actions">
          <button type="button" className="button dark sp-small-button" onClick={openPicker} disabled={disabled}>
            <Icon name="upload" size={14} /> {photo ? t('Trocar foto') : t('Enviar nova foto')}
          </button>
          {photo && (
            <button
              type="button"
              className="sp-danger-text"
              disabled={disabled}
              onClick={() => {
                setError('');
                onChange('');
              }}
            >
              {t('Remover foto')}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          className="sp-hidden-input"
          type="file"
          tabIndex={-1}
          aria-label={t('Foto de perfil')}
          accept={ACCEPTED.join(',')}
          disabled={disabled}
          onChange={pick}
        />
        <p className="sp-hint">{t('Formatos recomendados: PNG, JPG ou WEBP (máx.')} {maxMB} {t('MB)')}</p>
        {error && (
          <p role="alert" className="field-error">
            {t(error)}
          </p>
        )}
      </div>
    </div>
  );
}
