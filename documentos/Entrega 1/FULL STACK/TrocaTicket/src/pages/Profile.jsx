import React, { useState, useEffect } from 'react';
import { useStore } from '../context/Store';
import { Field, PageTitle, Panel } from '../components/UI';
import { roleNames } from '../data/demo';
import { atualizarUsuario, uploadFotoUsuario, excluirFotoUsuario } from '../services/api';
export default function Profile() {
  const { data, update, role, notify } = useStore();
  const [form, setForm] = useState(data.profile);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data.profile) {
      setForm(data.profile);
    }
  }, [data.profile]);

  async function photo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError('Escolha uma imagem PNG, JPG ou WEBP de até 2 MB.');
      return;
    }
    setError('');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      
      // Visualização imediata na tela
      setForm((old) => ({ ...old, photo: base64Data }));

      // Se o usuário possui ID cadastrado no banco, envia para a API e salva o arquivo
      if (form.id) {
        setUploading(true);
        try {
          const resultado = await uploadFotoUsuario(form.id, base64Data);
          const novaUrl = resultado.url_foto_perfil;

          setForm((old) => ({ ...old, photo: novaUrl }));
          update('profile', (old) => ({ ...old, photo: novaUrl }));

          try {
            const user = JSON.parse(sessionStorage.getItem('trocaticket-user') || '{}');
            user.photo = novaUrl;
            sessionStorage.setItem('trocaticket-user', JSON.stringify(user));
          } catch {}

          notify('Foto de perfil salva no banco de dados com sucesso!');
        } catch (err) {
          setError(err.message || 'Erro ao salvar foto no servidor.');
        } finally {
          setUploading(false);
        }
      } else {
        update('profile', (old) => ({ ...old, photo: base64Data }));
        notify('Foto de perfil atualizada.');
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleRemovePhoto() {
    if (form.id && form.photo) {
      setUploading(true);
      try {
        await excluirFotoUsuario(form.id);
      } catch (err) {
        console.warn('Erro ao remover foto do servidor:', err);
      } finally {
        setUploading(false);
      }
    }

    setForm((old) => ({ ...old, photo: '' }));
    update('profile', (old) => ({ ...old, photo: '' }));

    try {
      const user = JSON.parse(sessionStorage.getItem('trocaticket-user') || '{}');
      user.photo = '';
      sessionStorage.setItem('trocaticket-user', JSON.stringify(user));
    } catch {}

    setError('');
    notify('Foto de perfil removida com sucesso!');
  }
  return (
    <div className="workspace narrow">
      <PageTitle
        title="Configurações & Perfil"
        subtitle="Gerencie seus dados de demonstração e suas preferências de comunicação."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (form.name.trim().length < 2) {
            setError('Informe um nome válido.');
            return;
          }
          if (form.id) {
            try {
              await atualizarUsuario(form.id, {
                nome: form.name,
                email: form.email,
              });
            } catch (err) {
              console.warn('Erro ao sincronizar com banco de dados:', err);
            }
          }
          update('profile', form);
          try {
            sessionStorage.setItem('trocaticket-user', JSON.stringify(form));
          } catch {}
          setError('');
          notify('Perfil salvo com sucesso.');
        }}
      >
        <Panel className="profile-banner">
          <div className="avatar large">
            {form.photo ? (
              <img src={form.photo} alt={`Foto de ${form.name}`} />
            ) : (
              form.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h2>{form.name}</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="button dark upload-label" style={{ margin: 0, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'wait' : 'pointer' }}>
                {uploading ? 'A enviar foto…' : '↑ Enviar nova foto'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={photo}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>

              {form.photo && (
                <button
                  type="button"
                  className="button text-danger"
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                >
                  Remover foto
                </button>
              )}
            </div>

            {error && (
              <p className="field-error" role="alert" style={{ marginTop: '10px', marginBottom: 0 }}>
                {error}
              </p>
            )}

            <p className="muted" style={{ marginTop: '6px' }}>
              PNG, JPG ou WEBP · até 2 MB (salva no servidor e vinculada ao banco)
            </p>
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
        {role === 'organizador' && (
          <Panel
            title="Dados da organização"
            subtitle="Informações opcionais para identificar a empresa ou produtora responsável pelos eventos."
          >
            <div className="form-grid">
              <Field
                label="Nome da organização"
                name="profile-organization"
                placeholder="Ex.: Produções Horizonte"
                value={form.organizationName || ''}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
              />
              <Field
                label="CNPJ"
                name="profile-cnpj"
                placeholder="00.000.000/0000-00"
                value={form.cnpj || ''}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <p className="muted">Preencha esses dados se o organizador representar uma empresa. O protótipo salva as alterações apenas neste navegador.</p>
          </Panel>
        )}
        {role !== 'organizador' && (
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
        )}
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
