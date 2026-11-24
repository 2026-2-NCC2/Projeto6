import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { Modal, PageTitle } from '../components/UI';
import { FormSection, PhotoUpload, SelectField, TextField, ToggleRow } from '../components/Form';
import { Icon } from '../components/Icons';
import { roleNames } from '../data/demo';

const TIMEZONES = [
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3) • Horário Oficial' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
];
const ACCESS_HISTORY = [
  ['Hoje, 14:32', 'Chrome / Windows', '203.0.113.10', 'São Paulo, BR', 'Sucesso'],
  ['Ontem, 09:05', 'Chrome / Windows', '203.0.113.10', 'São Paulo, BR', 'Sucesso'],
  ['05/10/2026, 18:47', 'Safari / iOS', '203.0.113.42', 'Campinas, BR', 'Sucesso'],
  ['03/10/2026, 22:13', 'Firefox / Linux', '198.51.100.7', 'Local desconhecido', 'Bloqueado'],
];
const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

const initials = (name) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
};
function maskPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function daysAgo(timestamp) {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return 'hoje';
  return days === 1 ? '1 dia atrás' : `${days} dias atrás`;
}
function syncLabel(timestamp) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.toDateString() === new Date().toDateString();
  return `${sameDay ? 'hoje' : date.toLocaleDateString('pt-BR')} às ${time}`;
}

export default function AdminProfile() {
  const { data, update, notify } = useStore();
  const saved = data.adminProfile;
  const [form, setForm] = useState(saved);
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [photoError, setPhotoError] = useState('');
  const [history, setHistory] = useState(false);
  const dirty =
    JSON.stringify(form) !== JSON.stringify(saved) ||
    Object.values(passwords).some((value) => value !== '');

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const setPassword = (key) => (event) => setPasswords({ ...passwords, [key]: event.target.value });

  function validate() {
    const next = {};
    if (form.name.trim().split(/\s+/).length < 2) next.name = 'Informe nome e sobrenome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Informe um e-mail válido.';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10) next.phone = 'Informe o telefone com DDD.';
    if (Object.values(passwords).some(Boolean)) {
      if (!passwords.current) next.current = 'Informe a senha atual.';
      if (passwords.next.length < 8) next.next = 'Use no mínimo 8 caracteres.';
      if (passwords.confirm !== passwords.next) next.confirm = 'As senhas não conferem.';
    }
    return next;
  }
  function submit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    const changedPassword = !!passwords.next;
    const next = {
      ...form,
      passwordChangedAt: changedPassword ? Date.now() : form.passwordChangedAt,
      syncedAt: Date.now(),
    };
    update('adminProfile', next);
    setForm(next);
    setPasswords(EMPTY_PASSWORDS);
    notify(
      changedPassword
        ? 'Perfil salvo e senha validada. Na demonstração, nenhuma senha é armazenada.'
        : 'Perfil salvo neste navegador.',
    );
  }
  function cancel() {
    setForm(saved);
    setPasswords(EMPTY_PASSWORDS);
    setErrors({});
    setPhotoError('');
  }

  return (
    <div className="workspace narrow admin-profile">
      <PageTitle
        title="Configurações & Perfil"
        subtitle="Gerencie seus dados pessoais, foto, credenciais de acesso corporativo e parâmetros de comunicação."
      >
        <button type="button" className="button outline" onClick={() => setHistory(true)}>
          <Icon name="clock" size={15} /> Histórico de Acesso
        </button>
      </PageTitle>

      <form noValidate onSubmit={submit}>
        <section className="fc-card">
          <PhotoUpload
            name={form.name}
            title={form.name}
            photo={form.photo}
            initials={initials(form.name)}
            onChange={(photo) => setForm({ ...form, photo })}
            onError={setPhotoError}
          />
          {photoError && (
            <p role="alert" className="field-error">
              {photoError}
            </p>
          )}
        </section>

        <FormSection
          icon="user"
          title="Informações Pessoais & Contato"
          subtitle="Estes dados aparecem nos contratos, ordens de serviço e credenciais dos eventos."
        >
          <div className="fc-grid">
            <TextField
              label="Nome completo"
              name="admin-name"
              required
              autoComplete="name"
              value={form.name}
              error={errors.name}
              onChange={set('name')}
            />
            <SelectField
              label="Tipo de perfil"
              name="admin-role"
              disabled
              value={form.role}
              options={Object.entries(roleNames).map(([value, label]) => ({ value, label }))}
              onChange={set('role')}
            />
            <TextField
              label="E-mail corporativo"
              name="admin-email"
              type="email"
              icon="mail"
              required
              autoComplete="email"
              value={form.email}
              error={errors.email}
              aside={
                form.emailVerified && (
                  <span className="fc-verified">
                    <Icon name="check" size={13} /> Verificado
                  </span>
                )
              }
              onChange={(event) =>
                setForm({ ...form, email: event.target.value, emailVerified: false })
              }
            />
            <TextField
              label="Telefone / WhatsApp"
              name="admin-phone"
              type="tel"
              icon="phone"
              required
              autoComplete="tel"
              inputMode="tel"
              value={form.phone}
              error={errors.phone}
              onChange={(event) => setForm({ ...form, phone: maskPhone(event.target.value) })}
            />
            <TextField
              label="Documento fiscal (CPF)"
              name="admin-cpf"
              readOnly
              aside="Bloqueado para edição"
              value={form.cpf}
            />
            <SelectField
              label="Fuso horário operacional"
              name="admin-timezone"
              value={form.timezone}
              options={TIMEZONES}
              onChange={set('timezone')}
            />
          </div>

          <div className="fc-divider" />
          <div className="fc-subhead">
            <h3>Segurança da Conta & Credenciais</h3>
            <span>Última alteração de senha: {daysAgo(form.passwordChangedAt)}</span>
          </div>
          <div className="fc-grid three">
            <TextField
              label="Senha atual"
              name="admin-password-current"
              type="password"
              autoComplete="current-password"
              placeholder="Digite a senha atual"
              value={passwords.current}
              error={errors.current}
              onChange={setPassword('current')}
            />
            <TextField
              label="Nova senha"
              name="admin-password-new"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={passwords.next}
              error={errors.next}
              onChange={setPassword('next')}
            />
            <TextField
              label="Confirmar senha"
              name="admin-password-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              value={passwords.confirm}
              error={errors.confirm}
              onChange={setPassword('confirm')}
            />
          </div>
          <ToggleRow
            icon="shield"
            title="Autenticação de 2 Fatores (2FA)"
            description="Exigir código via app autenticador ao conectar de um novo navegador."
            checked={form.twoFactor}
            onChange={(twoFactor) => setForm({ ...form, twoFactor })}
            onLabel="Ativado"
            offLabel="Desativado"
          />
        </FormSection>

        <div className="fc-actions">
          <span className="fc-sync">
            <Icon name="check" size={16} /> Última sincronização do perfil{' '}
            {syncLabel(saved.syncedAt)}
          </span>
          <div>
            <button type="button" className="button outline" disabled={!dirty} onClick={cancel}>
              Cancelar
            </button>
            <button type="submit" className="button dark" disabled={!dirty}>
              <Icon name="check" size={16} /> Salvar Alterações
            </button>
          </div>
        </div>
      </form>

      {history && (
        <Modal title="Histórico de Acesso" onClose={() => setHistory(false)}>
          <p className="muted">Registros fictícios para demonstração.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Dispositivo</th>
                  <th>IP</th>
                  <th>Local</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_HISTORY.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={i}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
