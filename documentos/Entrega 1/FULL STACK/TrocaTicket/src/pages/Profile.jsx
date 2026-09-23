import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { Field, PageTitle, Panel } from '../components/UI';
import { roleNames } from '../data/demo';
export default function Profile() {
  const { data, update, role, notify } = useStore();
  const [form, setForm] = useState(data.profile);
  const [error, setError] = useState('');
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
    reader.onload = () => setForm((old) => ({ ...old, photo: reader.result }));
    reader.readAsDataURL(file);
  }
  return (
    <div className="workspace narrow">
      <PageTitle
        title="Configurações & Perfil"
        subtitle="Gerencie seus dados de demonstração e suas preferências de comunicação."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim().length < 2) {
            setError('Informe um nome válido.');
            return;
          }
          update('profile', form);
          setError('');
          notify('Perfil salvo neste navegador.');
        }}
      >
        <Panel className="profile-banner">
          <div className="avatar large">
            {form.photo ? (
              <img src={form.photo} alt="Foto de perfil" />
            ) : (
              form.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h2>{form.name}</h2>
            <label className="button dark upload-label">
              ↑ Enviar nova foto
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={photo} />
            </label>
            <button
              type="button"
              className="button text-danger"
              onClick={() => setForm({ ...form, photo: '' })}
            >
              Remover foto
            </button>
            <p className="muted">PNG, JPG ou WEBP · até 2 MB</p>
          </div>
        </Panel>
        <Panel
          title="Informações Pessoais & Contato"
          subtitle="Use dados fictícios: as informações ficam armazenadas neste navegador."
        >
          <div className="form-grid">
            <Field
              label="Nome completo"
              name="profile-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Field
              label="Tipo de perfil"
              name="profile-role"
              value={roleNames[role] || 'Participante'}
              readOnly
            />
            <Field
              label="E-mail"
              name="profile-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Field
              label="Telefone / WhatsApp"
              name="profile-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="info-note">
            A autenticação e a alteração de senha estarão disponíveis quando o backend for
            conectado.
          </div>
        </Panel>
        <Panel
          title="Opções & Preferências do Sistema"
          subtitle="Preferências demonstrativas; nenhuma mensagem externa será enviada."
        >
          {[
            'Notificações por e-mail',
            'Alertas críticos no celular / WhatsApp',
            'Relatórios financeiros semanais',
            'Lembretes de homologação de contratos',
          ].map((name, i) => (
            <label className="preference" key={name}>
              <span>
                <strong>{name}</strong>
                <small>Personalize os avisos que deseja acompanhar.</small>
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
        {error && (
          <p role="alert" className="field-error">
            {error}
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
            Cancelar alterações
          </button>
          <button className="button dark">✓ Salvar alterações</button>
        </div>
      </form>
    </div>
  );
}
