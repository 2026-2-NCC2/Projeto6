import { useI18n } from '../i18n';
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Field, Modal, PageTitle, Panel } from '../components/UI';
import { roleNames } from '../data/demo';
import { assetUrl } from '../services/assets.js';
export default function Profile() {
  const { t } = useI18n();
  const { data, update, role, notify } = useStore();
  const [form, setForm] = useState(data.profile);
  const [error, setError] = useState('');
  const [historico, setHistorico] = useState(false);
  function photo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError('Escolha uma imagem PNG, JPG ou WEBP de até 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((old) => ({ ...old, photo: reader.result }));
      setError('');
    };
    reader.onerror = () => setError('Não foi possível ler a imagem. Tente outra foto.');
    reader.readAsDataURL(file);
  }
  return (
    <div className="workspace narrow">
      <PageTitle
        title={t('Configurações & Perfil')}
        subtitle={t('Gerencie seus dados de demonstração e suas preferências de comunicação.')}
      >
        <button className="button outline" onClick={() => setHistorico(true)}>
          {t('Histórico de acesso')}
        </button>
      </PageTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim().length < 2) {
            setError('Informe um nome válido.');
            return;
          }
          update('profile', form);
          setError('');
          notify(t('Perfil salvo neste navegador.'));
        }}
      >
        <Panel className="profile-banner">
          <div className="avatar large">
            {form.photo ? (
              <img src={assetUrl(form.photo)} alt={t('Foto de perfil')} />
            ) : (
              form.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h2>{form.name}</h2>
            <label className="button dark upload-label">
              {t('↑ Enviar nova foto')}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} />
            </label>
            <button
              type="button"
              className="button text-danger"
              onClick={() => setForm({ ...form, photo: '' })}
            >
              {t('Remover foto')}
            </button>
            <p className="muted">{t('PNG, JPG ou WEBP · até 2 MB')}</p>
          </div>
        </Panel>
        <Panel
          title={t('Informações Pessoais & Contato')}
          subtitle={t('Use dados fictícios: as informações ficam armazenadas neste navegador.')}
        >
          <div className="form-grid">
            <Field
              label={t('Nome completo')}
              name="profile-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Field
              label={t('Tipo de perfil')}
              name="profile-role"
              value={t(roleNames[role] || 'Participante')}
              readOnly
            />
            <Field
              label={t('E-mail')}
              name="profile-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Field
              label={t('Telefone / WhatsApp')}
              name="profile-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Field
              label={t('Documento fiscal')}
              name="profile-document"
              value={t('Não coletado na demonstração')}
              readOnly
            />
            <Field label={t('Fuso horário')} name="profile-timezone">
              <select
                id="profile-timezone"
                value={form.timezone || 'America/Sao_Paulo'}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                <option value="America/Sao_Paulo">{t('Brasília (GMT-3)')}</option>
                <option value="America/Manaus">{t('Manaus (GMT-4)')}</option>
                <option value="America/Rio_Branco">{t('Rio Branco (GMT-5)')}</option>
              </select>
            </Field>
          </div>
          <div className="info-note">
            {t(
              'A autenticação e a alteração de senha estarão disponíveis quando o backend for conectado.',
            )}
          </div>
        </Panel>
        {role !== 'admin' && (
          <Panel
            title={t('Opções & Preferências do Sistema')}
            subtitle={t('Preferências demonstrativas; nenhuma mensagem externa será enviada.')}
          >
            {[
              'Notificações por e-mail',
              'Alertas críticos no celular / WhatsApp',
              'Relatórios financeiros semanais',
              'Lembretes de homologação de contratos',
            ].map((name, i) => (
              <label className="preference" key={name}>
                <span>
                  <strong>{t(name)}</strong>
                  <small>{t('Personalize os avisos que deseja acompanhar.')}</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.preferences[i]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      preferences: form.preferences.map((v, j) => (j === i ? e.target.checked : v)),
                    })
                  }
                />
              </label>
            ))}
          </Panel>
        )}
        {error && (
          <p role="alert" className="field-error">
            {t(error)}
          </p>
        )}
        <div className="actions end">
          <button
            className="button outline"
            type="button"
            onClick={() => {
              setForm(data.profile);
              setError('');
            }}
          >
            {t('Cancelar alterações')}
          </button>
          <button className="button dark">{t('✓ Salvar alterações')}</button>
        </div>
      </form>
      {historico && (
        <Modal title={t('Histórico de acesso')} onClose={() => setHistorico(false)}>
          <p>
            {t('Perfil desta sessão: {profile}.', {
              profile: t(roleNames[role] || 'Participante'),
            })}
          </p>
          <p>
            {t(
              'Não há registro de autenticações reais nesta demonstração. O histórico de logins depende da integração com o backend.',
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
