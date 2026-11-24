import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/Store';
import { Badge, Modal, PageTitle, Panel } from '../../components/UI';
import { atualizarSenhaUsuario, excluirFotoUsuario, uploadFotoUsuario } from '../../services/api';
import { getSupplierProfile, saveSupplierProfile } from '../../services/supplier';
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

function syncSessionUser(updates) {
  try {
    const raw = sessionStorage.getItem('trocaticket-user');
    const user = raw ? JSON.parse(raw) : null;
    if (!user || typeof user !== 'object' || Array.isArray(user)) return false;
    sessionStorage.setItem('trocaticket-user', JSON.stringify({ ...user, ...updates }));
    return true;
  } catch {
    return false;
  }
}

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
  const { data, role, update, notify } = useStore();
  const saved = {
    ...initialSupplierProfile,
    ...data.supplierProfile,
    address: { ...initialSupplierProfile.address, ...data.supplierProfile?.address },
    notifications: { ...initialSupplierProfile.notifications, ...data.supplierProfile?.notifications },
  };
  const [form, setForm] = useState(saved);
  const [password, setPassword] = useState(EMPTY_PASSWORD);
  const [errors, setErrors] = useState({});
  const [history, setHistory] = useState(false);
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    const supplierId = Number(data.supplierProfile?.id);
    if (role !== 'fornecedor' || !Number.isSafeInteger(supplierId) || supplierId <= 0) return undefined;
    const controller = new AbortController();
    getSupplierProfile(supplierId, controller.signal)
      .then((profile) => {
        const normalizedProfile = {
          ...profile,
          address: { ...initialSupplierProfile.address, ...profile.address },
          notifications: { ...initialSupplierProfile.notifications, ...profile.notifications },
        };
        update('supplierProfile', (current) => ({ ...current, ...normalizedProfile }));
        update('profile', (current) => ({
          ...current,
          id: normalizedProfile.id,
          name: normalizedProfile.name,
          email: normalizedProfile.email,
          phone: normalizedProfile.phone,
          photo: normalizedProfile.photo || '',
        }));
        setForm((current) => ({ ...current, ...normalizedProfile }));
        setApiError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setApiError(error.message);
      });
    return () => controller.abort();
  }, [data.supplierProfile?.id, role, update]);

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

  async function changePhoto(photo) {
    const supplierId = Number(data.supplierProfile?.id);
    if (!Number.isSafeInteger(supplierId) || supplierId <= 0) {
      setForm((current) => ({ ...current, photo }));
      update('supplierProfile', (current) => ({ ...current, photo }));
      return;
    }
    setPhotoBusy(true);
    setApiError('');
    try {
      const result = photo
        ? await uploadFotoUsuario(supplierId, photo)
        : await excluirFotoUsuario(supplierId);
      const nextPhoto = result.url_foto_perfil || '';
      setForm((current) => ({ ...current, photo: nextPhoto }));
      update('supplierProfile', (current) => ({ ...current, photo: nextPhoto }));
      update('profile', (current) => ({ ...current, photo: nextPhoto }));
      const sessionSynced = syncSessionUser({ photo: nextPhoto });
      notify(
        sessionSynced
          ? photo ? 'Foto do fornecedor salva no banco de dados.' : 'Foto do fornecedor removida.'
          : 'Foto salva no banco, mas não foi possível sincronizar a sessão local. Entre novamente para atualizar.',
      );
    } catch (error) {
      setApiError(error.message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function submit(event) {
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
    const supplierId = Number(data.supplierProfile?.id);
    let sessionSynced = true;
    setSaving(true);
    setApiError('');
    try {
      if (Number.isSafeInteger(supplierId) && supplierId > 0) {
        await saveSupplierProfile(supplierId, next_profile);
        update('supplierProfile', next_profile);
        update('profile', (current) => ({
          ...current,
          name: next_profile.name,
          email: next_profile.email,
          phone: next_profile.phone,
        }));
        sessionSynced = syncSessionUser({ name: next_profile.name, email: next_profile.email });
        if (hasPassword) {
          try {
            await atualizarSenhaUsuario(supplierId, password.current, password.next);
          } catch (error) {
            setForm(next_profile);
            setApiError(`Perfil salvo, mas a senha não foi alterada. ${error.message}`);
            notify('Perfil salvo; não foi possível alterar a senha.');
            return;
          }
        }
      }
      update('supplierProfile', next_profile);
      setForm(next_profile);
      setPassword(EMPTY_PASSWORD);
      notify(
        sessionSynced
          ? 'Perfil do fornecedor salvo.'
          : 'Perfil salvo, mas não foi possível sincronizar a sessão local. Entre novamente para atualizar.',
      );
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSaving(false);
    }
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
          <AvatarUpload
            name={form.tradeName || form.name}
            photo={form.photo}
            onChange={changePhoto}
            disabled={photoBusy}
          >
            <h2 className="sp-profile-name">{form.name}</h2>
          </AvatarUpload>
        </Panel>
        {apiError && <p className="api-error" role="alert">{apiError}</p>}

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
          action={          <small className="muted">As alterações de senha são validadas pelo servidor.</small>}
        >
          <PasswordSection values={password} onChange={setPassword} errors={errors} />
          <div className="sp-security-card">
            <span className="sp-security-icon">
              <Icon name="shield-check" size={18} />
            </span>
            <div>
              <strong>Autenticação de 2 fatores (2FA)</strong>
              <small>Preferência registrada; a verificação por aplicativo ainda não está implementada.</small>
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
            <button className="button dark" disabled={!dirty || saving || photoBusy}>
              {saving ? 'Salvando…' : null}
              {!saving && <Icon name="check" size={14} />}
              {!saving && ' Salvar alterações'}
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
          <p className="muted">Este histórico é demonstrativo e não corresponde a sessões reais.</p>
        </Modal>
      )}
    </div>
  );
}
