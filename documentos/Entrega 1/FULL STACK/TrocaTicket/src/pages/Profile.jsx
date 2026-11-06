import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { Field, PageTitle, Panel, Modal } from '../components/UI';
import Icon from '../components/Icon';
import { roleNames } from '../data/demo';
export default function Profile() {
  const { data, update, role, notify } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(data.profile);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
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
    <div className="workspace narrow profile-workspace">
      <PageTitle
        title="Configurações & Perfil"
        subtitle="Gerencie seus dados pessoais, foto, credenciais de acesso corporativo e parâmetros de comunicação."
      >
        <button className="button outline" onClick={() => setHistory(true)}>
          Histórico de Acesso
        </button>
      </PageTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.name.trim().length < 2) {
            setError('Informe um nome válido.');
            return;
          }
          const changingPassword = Object.values(password).some(Boolean);
          if (
            changingPassword &&
            (!password.current || password.next.length < 8 || password.next !== password.confirm)
          ) {
            setError(
              'Para simular a alteração, informe a senha atual, uma nova senha com 8 caracteres e a confirmação igual.',
            );
            return;
          }
          update('profile', { ...form, updatedAt: new Date().toISOString() });
          setPassword({ current: '', next: '', confirm: '' });
          setError('');
          notify(
            changingPassword
              ? 'Perfil salvo. Alteração de senha apenas simulada; nenhuma senha foi armazenada.'
              : 'Perfil salvo neste navegador.',
          );
        }}
      >
        <Panel className="profile-banner">
          <div className="avatar large">
            {form.photo ? (
              <img src={form.photo} alt="Foto de perfil" />
            ) : (
              <img src="/images/avatar-default.png" alt="Foto de perfil padrão" />
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
          title="II. Informações Pessoais & Contato"
          subtitle="Estes dados aparecem nos contratos, ordens de serviço e credenciais dos eventos."
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
              label="E-mail corporativo"
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
            <Field
              label="Documento fiscal (CPF)"
              name="profile-document"
              value="123.456.789-00"
              readOnly
            />
            <Field label="Fuso horário operacional" name="profile-timezone">
              <select
                id="profile-timezone"
                value={form.timezone || 'America/Sao_Paulo'}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              >
                <option value="America/Sao_Paulo">Brasília (GMT−3) • Horário Oficial</option>
                <option value="America/Manaus">Manaus (GMT−4)</option>
                <option value="America/Rio_Branco">Rio Branco (GMT−5)</option>
              </select>
            </Field>
          </div>
          <div className="profile-security">
            <h3>Segurança da Conta & Credenciais</h3>
            <div className="password-grid">
              <Field
                label="Senha atual"
                name="current-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
              />
              <Field
                label="Nova senha"
                name="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password.next}
                onChange={(e) => setPassword({ ...password, next: e.target.value })}
              />
              <Field
                label="Confirmar senha"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              />
            </div>
            <label className="profile-two-factor">
              <Icon name="lock" />
              <span>
                <strong>Autenticação de 2 Fatores (2FA)</strong>
                <small>Preferência de demonstração; não ativa proteção real.</small>
              </span>
              <input
                type="checkbox"
                checked={form.twoFactor ?? true}
                onChange={(e) => setForm({ ...form, twoFactor: e.target.checked })}
                aria-label="Preferência de autenticação de dois fatores"
              />
            </label>
          </div>
        </Panel>
        <Panel
          title="III. Opções & Preferências do Sistema"
          subtitle="Configure os canais de recebimento de relatórios e notificações de eventos."
        >
          {[
            'Notificações por e-mail',
            'Alertas críticos no celular / WhatsApp',
            'Consolidação e relatórios financeiros semanais',
            'Lembretes de homologação de contratos',
          ].map((name, i) => (
            <label className="preference" key={name}>
              <span>
                <strong>{name}</strong>
                <small>
                  {
                    [
                      'Receba atualizações quando contratos forem assinados por fornecedores.',
                      'Avisos urgentes de prazos expirando, divergência de orçamento ou pendências técnicas imediatas.',
                      'Envio automático do resumo de orçado vs. contratado, margem livre e contingência às sextas-feiras.',
                      'Notificar 48 horas antes da abertura pública de vendas de ingressos caso haja fornecedor pendente.',
                    ][i]
                  }
                </small>
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
                <Panel title="IV. Sessão" subtitle="Encerre o acesso a esta conta neste navegador.">
          <button
            type="button"
            className="button outline"
            onClick={() => navigate('/', { replace: true, state: { loggedOut: true } })}
          >
            <Icon name="logout" size={18} /> Sair da conta
          </button>
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
              setPassword({ current: '', next: '', confirm: '' });
              setError('');
            }}
          >
            Cancelar alterações
          </button>
          <button className="button dark">✓ Salvar alterações</button>
        </div>
      </form>
      {history && (
        <Modal title="Histórico de Acesso" onClose={() => setHistory(false)}>
          <p>Esta demonstração não registra acessos de outros dispositivos.</p>
          <p>
            Perfil atual: <strong>{roleNames[role] || 'Participante'}</strong>
          </p>
          <p>
            {data.profile.updatedAt
              ? `Última alteração local: ${new Date(data.profile.updatedAt).toLocaleString('pt-BR')}`
              : 'Nenhuma alteração de perfil salva neste navegador.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
