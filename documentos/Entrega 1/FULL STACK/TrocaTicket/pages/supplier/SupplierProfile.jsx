import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/Store';
import { Badge, Modal, PageTitle, Panel } from '../../components/UI';
import { FormInput, FormSelect, FormTextArea, PreferenceItem } from '../../components/supplier/FormControls';
import AvatarUpload from '../../components/supplier/AvatarUpload';
import PasswordSection from '../../components/supplier/PasswordSection';
import Icon from '../../components/supplier/Icon';
import { PanelTitle, StatusPill } from '../../components/supplier/common';
import {
  brazilStates,
  initialSupplierProfile,
  supplierCategories,
  supplierNotificationOptions,
} from '../../data/supplier';
import { maskCep, maskCnpj, maskPhone, onlyDigits } from '../../utils/masks';

const EMPTY_PASSWORD = { current: '', next: '', confirm: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCESS_HISTORY = [
  ['Hoje, 09:12', 'Chrome em Windows', 'São Paulo, SP', 'Sessão atual'],
  ['Ontem, 18:40', 'Safari em iPhone', 'São Paulo, SP', 'Concluído'],
  ['3 dias atrás, 11:05', 'Chrome em Windows', 'Campinas, SP', 'Concluído'],
];

// Retorna { idDoCampo: 'mensagem' } na mesma ordem em que os campos aparecem na tela.
function validate(form, password) {
  const e = {};
  if (form.name.trim().length < 2) e['sp-name'] = 'Informe seu nome completo.';
  if (!EMAIL.test(form.email)) e['sp-email'] = 'Informe um e-mail válido.';
  if (![10, 11].includes(onlyDigits(form.phone).length)) e['sp-phone'] = 'Informe DDD + número (10 ou 11 dígitos).';
  if (form.legalName.trim().length < 2) e['sp-legalName'] = 'Informe a razão social.';
  if (!form.category) e['sp-category'] = 'Escolha a categoria principal.';
  if (form.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/i.test(form.website.trim()))
    e['sp-website'] = 'Informe um endereço válido, como www.suaempresa.com.br.';
  const { zip, city, state } = form.address;
  if (zip && onlyDigits(zip).length !== 8) e['sp-zip'] = 'O CEP deve ter 8 dígitos.';
  if (!city.trim()) e['sp-city'] = 'Informe a cidade.';
  if (!state) e['sp-state'] = 'Escolha o estado.';
  if (password.current || password.next || password.confirm) {
    if (!password.current) e['sp-currentPassword'] = 'Informe a senha atual.';
    if (password.next.length < 8) e['sp-newPassword'] = 'Use pelo menos 8 caracteres.';
    if (password.confirm !== password.next) e['sp-confirmPassword'] = 'As senhas não conferem.';
  }
  return e;
}

export default function SupplierProfile() {
  const { data, update, notify } = useStore();
  const saved = { ...initialSupplierProfile, ...data.supplierProfile };
  const [form, setForm] = useState(saved);
  const [password, setPassword] = useState(EMPTY_PASSWORD);
  const [errors, setErrors] = useState({});
  const [history, setHistory] = useState(false);

  const hasPassword = !!(password.current || password.next || password.confirm);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(saved) || hasPassword,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, data.supplierProfile, hasPassword],
  );

  const set = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));
  const setAddress = (key) => (value) => setForm((old) => ({ ...old, address: { ...old.address, [key]: value } }));
  const setNotification = (key) => (value) =>
    setForm((old) => ({ ...old, notifications: { ...old.notifications, [key]: value } }));

  function submit(event) {
    event.preventDefault();
    const next = validate(form, password);
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    const lastSync = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const next_profile = { ...form, lastSync };
    update('supplierProfile', next_profile);
    setForm(next_profile);
    setPassword(EMPTY_PASSWORD);
    notify(
      hasPassword
        ? 'Perfil salvo. A troca de senha foi validada, mas só será aplicada quando o backend for conectado.'
        : 'Perfil do fornecedor salvo neste navegador.',
    );
  }

  function cancel() {
    setForm(saved);
    setPassword(EMPTY_PASSWORD);
    setErrors({});
  }

  return (
    <div className="workspace narrow sp-page sp-form">
      <PageTitle
        title="Configurações & Perfil"
        subtitle="Gerencie seus dados pessoais, foto, credenciais de acesso corporativo e parâmetros de comunicação."
      >
        <button type="button" className="button outline sp-small-button" onClick={() => setHistory(true)}>
          <Icon name="history" size={14} /> Histórico de acesso
        </button>
      </PageTitle>

      <form noValidate onSubmit={submit}>
        <Panel>
          <AvatarUpload name={form.tradeName || form.name} photo={form.photo} onChange={set('photo')}>
            <h2 className="sp-profile-name">{form.name}</h2>
          </AvatarUpload>
        </Panel>

        <Panel
          title={<PanelTitle icon="user">Informações pessoais & contato</PanelTitle>}
          subtitle="Estes dados aparecem nos contratos, ordens de serviço e credenciais dos eventos."
        >
          <div className="sp-form-grid">
            <FormInput
              label="Nome completo"
              name="sp-name"
              required
              autoComplete="name"
              value={form.name}
              error={errors['sp-name']}
              onChange={set('name')}
            />
            <FormSelect
              label="Tipo de perfil"
              name="sp-role"
              options={['Fornecedor']}
              value="Fornecedor"
              disabled
              onChange={() => {}}
            />
            <FormInput
              label="E-mail corporativo"
              name="sp-email"
              type="email"
              required
              autoComplete="email"
              aside={form.emailVerified ? <span className="sp-verified">✓ Verificado</span> : null}
              value={form.email}
              error={errors['sp-email']}
              onChange={(value) => setForm((old) => ({ ...old, email: value, emailVerified: false }))}
            />
            <FormInput
              label="Telefone / WhatsApp"
              name="sp-phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(11) 90000-0000"
              mask={maskPhone}
              value={form.phone}
              error={errors['sp-phone']}
              onChange={set('phone')}
            />
          </div>
        </Panel>

        <Panel
          title={<PanelTitle icon="building">Dados da empresa</PanelTitle>}
          subtitle="Informações exibidas aos organizadores quando você envia uma proposta."
        >
          <div className="sp-form-grid">
            <FormInput
              label="Razão social"
              name="sp-legalName"
              required
              value={form.legalName}
              error={errors['sp-legalName']}
              onChange={set('legalName')}
            />
            <FormInput label="Nome fantasia" name="sp-tradeName" value={form.tradeName} onChange={set('tradeName')} />
            <FormInput
              label="CNPJ"
              name="sp-document"
              mask={maskCnpj}
              value={form.document}
              readOnly
              aside={<span className="sp-locked">Bloqueado para edição</span>}
            />
            <FormSelect
              label="Categoria principal"
              name="sp-category"
              required
              placeholder="Selecione…"
              options={supplierCategories}
              value={form.category}
              error={errors['sp-category']}
              onChange={set('category')}
            />
            <FormInput
              className="span-2"
              label="Site"
              name="sp-website"
              type="url"
              placeholder="www.suaempresa.com.br"
              value={form.website}
              error={errors['sp-website']}
              onChange={set('website')}
            />
            <FormTextArea
              className="span-2"
              label="Sobre a empresa"
              name="sp-description"
              maxLength={300}
              hint="Resuma serviços, estrutura e diferenciais."
              value={form.description}
              onChange={set('description')}
            />
          </div>
        </Panel>

        <Panel
          title={<PanelTitle icon="pin">Endereço</PanelTitle>}
          subtitle="Local de operação, usado para calcular logística e frete."
        >
          <div className="sp-form-grid cols-6">
            <FormInput
              className="span-2"
              label="CEP"
              name="sp-zip"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              mask={maskCep}
              value={form.address.zip}
              error={errors['sp-zip']}
              onChange={setAddress('zip')}
            />
            <FormInput
              className="span-3"
              label="Logradouro"
              name="sp-street"
              autoComplete="address-line1"
              value={form.address.street}
              onChange={setAddress('street')}
            />
            <FormInput label="Número" name="sp-number" value={form.address.number} onChange={setAddress('number')} />
            <FormInput
              className="span-3"
              label="Complemento"
              name="sp-complement"
              value={form.address.complement}
              onChange={setAddress('complement')}
            />
            <FormInput
              className="span-3"
              label="Bairro"
              name="sp-district"
              value={form.address.district}
              onChange={setAddress('district')}
            />
            <FormInput
              className="span-4"
              label="Cidade"
              name="sp-city"
              required
              autoComplete="address-level2"
              value={form.address.city}
              error={errors['sp-city']}
              onChange={setAddress('city')}
            />
            <FormSelect
              className="span-2"
              label="Estado"
              name="sp-state"
              required
              placeholder="UF"
              options={brazilStates}
              value={form.address.state}
              error={errors['sp-state']}
              onChange={setAddress('state')}
            />
          </div>
        </Panel>

        <Panel
          title={<PanelTitle icon="shield">Segurança da conta & credenciais</PanelTitle>}
          subtitle="Preencha apenas se quiser trocar a senha. A autenticação real depende do backend."
          action={<small className="muted">Última alteração de senha: 45 dias atrás</small>}
        >
          <PasswordSection values={password} onChange={setPassword} errors={errors} />
          <div className="sp-security-card">
            <span className="sp-security-icon">
              <Icon name="shield-check" size={18} />
            </span>
            <div>
              <strong>Autenticação de 2 fatores (2FA)</strong>
              <small>Exigir código via app autenticador ao conectar de um novo navegador.</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.twoFactor}
              className={`sp-toggle ${form.twoFactor ? 'on' : ''}`}
              onClick={() => set('twoFactor')(!form.twoFactor)}
            >
              <StatusPill tone={form.twoFactor ? 'green' : 'gray'} dot={false}>
                {form.twoFactor ? 'Ativado' : 'Desativado'}
              </StatusPill>
            </button>
          </div>
        </Panel>

        <Panel
          title={<PanelTitle icon="settings">Opções & preferências do sistema</PanelTitle>}
          subtitle="Configure os canais de recebimento de relatórios e notificações de eventos."
        >
          {supplierNotificationOptions.map((option) => (
            <PreferenceItem
              key={option.key}
              title={option.title}
              description={option.description}
              checked={!!form.notifications[option.key]}
              onChange={setNotification(option.key)}
            />
          ))}
        </Panel>

        <div className="sp-form-footer">
          <p role="status">
            {dirty ? (
              'Você tem alterações não salvas.'
            ) : (
              <>
                <Icon name="check" size={14} /> Última sincronização do perfil hoje às {form.lastSync}.
              </>
            )}
          </p>
          <div className="actions end">
            <button className="button outline" type="button" onClick={cancel} disabled={!dirty}>
              Cancelar
            </button>
            <button className="button dark" disabled={!dirty}>
              <Icon name="check" size={14} /> Salvar alterações
            </button>
          </div>
        </div>
      </form>

      {history && (
        <Modal title="Histórico de acesso" onClose={() => setHistory(false)}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Dispositivo</th>
                  <th>Local</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_HISTORY.map(([when, device, place, state]) => (
                  <tr key={when}>
                    <td>{when}</td>
                    <td>{device}</td>
                    <td>{place}</td>
                    <td>
                      <Badge tone={state === 'Sessão atual' ? 'green' : 'blue'}>{state}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">Dados de demonstração. O histórico real será exibido quando o backend for conectado.</p>
        </Modal>
      )}
    </div>
  );
}
