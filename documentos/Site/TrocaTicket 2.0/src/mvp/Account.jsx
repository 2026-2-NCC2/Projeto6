import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Field, PageTitle, Panel } from '../components/UI';
import { useI18n } from '../i18n';
import { useSession } from './Session';
import { buscarContaDemo, senhaInicialDemo } from './contasDemo';
import { MutationError, QueryState, useMutation, useQuery } from './shared';
export function Account({ login = false }) {
  const { t } = useI18n();
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const contaDemo = login ? buscarContaDemo(params.get('demo')) : null;
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: ['organizador', 'fornecedor'].includes(params.get('perfil'))
      ? params.get('perfil')
      : 'comprador',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (contaDemo) {
      setValues((old) => ({ ...old, email: contaDemo.email, password: senhaInicialDemo }));
      setError('');
    }
  }, [contaDemo]);
  function change(e) {
    setValues((old) => ({ ...old, [e.target.name]: e.target.value }));
  }
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await (login
        ? session.login({ email: values.email, password: values.password })
        : session.register(values));
      setValues((old) => ({ ...old, password: '' }));
      const back = params.get('voltar');
      navigate(back?.startsWith('/') && !back.startsWith('//') ? back : '/perfil');
    } catch (e) {
      setError(e.message);
      setValues((old) => ({ ...old, password: '' }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace narrow">
      <PageTitle
        title={t(login ? 'Entrar na sua conta' : 'Criar conta de demonstração')}
        subtitle={t('Use somente dados fictícios. Nenhuma mensagem será enviada.')}
      />
      <Panel>
        <form onSubmit={submit} className="mvp-stack">
          {!login && (
            <Field
              label={t('Nome')}
              name="name"
              value={values.name}
              onChange={change}
              required
              maxLength={150}
              autoComplete="name"
            />
          )}
          <Field
            label={t('E-mail')}
            name="email"
            type="email"
            value={values.email}
            onChange={change}
            required
            autoComplete="email"
            maxLength={254}
          />
          <Field
            label={t('Senha')}
            name="password"
            type="password"
            value={values.password}
            onChange={change}
            required
            minLength={10}
            maxLength={128}
            autoComplete={login ? 'current-password' : 'new-password'}
          />
          {!login && (
            <>
              <Field label={t('Tipo de perfil')} name="role">
                <select id="role" name="role" value={values.role} onChange={change}>
                  <option value="comprador">{t('Participante')}</option>
                  <option value="organizador">{t('Organizador')}</option>
                  <option value="fornecedor">{t('Fornecedor')}</option>
                </select>
              </Field>
              <p className="muted">
                {t(
                  'Organizadores e fornecedores aguardam aprovação administrativa. Documentos reais não são necessários.',
                )}
              </p>
            </>
          )}
          {error && (
            <p role="alert" className="feedback error">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {t(busy ? 'Aguarde…' : login ? 'Entrar' : 'Criar conta')}
          </button>
          <Link to={login ? '/cadastro' : '/entrar'}>
            {t(login ? 'Ainda não tenho conta' : 'Já tenho conta')}
          </Link>
          <p className="muted">
            {t(
              'Recuperação por e-mail e login com redes sociais não estão disponíveis nesta demonstração.',
            )}
          </p>
        </form>
      </Panel>
    </div>
  );
}
export function Profile() {
  const { t } = useI18n();
  const session = useSession();
  const state = useQuery('/perfil');
  const [values, setValues] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (state.data)
      setValues({
        name: state.data.name,
        email: state.data.email,
        phone: state.data.phone || '',
        description: state.data.description || '',
        photo: state.data.photo || '',
        password: '',
        currentPassword: '',
      });
  }, [state.data]);
  const action = useMutation(async () => {
    setSaved(true);
    await session.refresh();
    state.reload();
  });
  function change(e) {
    setSaved(false);
    setValues((old) => ({ ...old, [e.target.name]: e.target.value }));
  }
  async function submit(e) {
    e.preventDefault();
    const payload = { ...values };
    if (!payload.password) {
      delete payload.password;
      delete payload.currentPassword;
    }
    await action.run('/perfil', payload, 'PUT');
  }
  return (
    <div className="workspace narrow">
      <PageTitle
        title={t('Configurações & Perfil')}
        subtitle={t('Gerencie os dados da sua conta fictícia.')}
      />
      <QueryState state={state}>
        {values && (
          <Panel>
            <p>
              {t('Situação da conta')}:{' '}
              <strong>
                {t(
                  session.user.approval === 'A'
                    ? 'Aprovado'
                    : session.user.approval === 'P'
                      ? 'Pendente'
                      : 'Recusado',
                )}
              </strong>
            </p>
            {session.user.approval !== 'A' && (
              <p className="mvp-note">
                {t(
                  'Você pode consultar e editar seu perfil enquanto aguarda aprovação. As operações restritas permanecem bloqueadas.',
                )}
              </p>
            )}
            <form onSubmit={submit} className="mvp-stack">
              <div className="mvp-profile-photo">
                <span className="avatar large">
                  {values.photo ? (
                    <img src={values.photo} alt={t('Foto do perfil')} />
                  ) : (
                    values.name.slice(0, 2).toUpperCase()
                  )}
                </span>
                <Field
                  label={t('URL da foto (opcional)')}
                  name="photo"
                  type="url"
                  value={values.photo}
                  onChange={change}
                  maxLength={500}
                />
              </div>
              <div className="form-grid">
                <Field
                  label={t('Nome')}
                  name="name"
                  required
                  maxLength={150}
                  value={values.name}
                  onChange={change}
                />
                <Field
                  label={t('E-mail')}
                  name="email"
                  type="email"
                  required
                  value={values.email}
                  onChange={change}
                />
                <Field
                  label={t('Telefone fictício (opcional)')}
                  name="phone"
                  value={values.phone}
                  maxLength={11}
                  onChange={change}
                />
                <Field
                  label={t('Perfil')}
                  name="profile-role"
                  value={t(
                    {
                      comprador: 'Participante',
                      organizador: 'Organizador',
                      fornecedor: 'Fornecedor',
                    }[session.user.role],
                  )}
                  readOnly
                />
              </div>
              <Field label={t('Descrição (opcional)')} name="description">
                <textarea
                  id="description"
                  name="description"
                  maxLength={500}
                  value={values.description}
                  onChange={change}
                />
              </Field>
              <h3>{t('Alterar senha')}</h3>
              <div className="form-grid">
                <Field
                  label={t('Senha atual')}
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={change}
                />
                <Field
                  label={t('Nova senha')}
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  value={values.password}
                  onChange={change}
                />
              </div>
              <MutationError action={action} />
              {saved && <p role="status">{t('Alterações salvas no banco.')}</p>}
              <div className="actions">
                <button type="button" className="button outline" onClick={state.reload}>
                  {t('Cancelar')}
                </button>
                <button className="button primary" disabled={action.busy}>
                  {t('Salvar alterações')}
                </button>
              </div>
            </form>
          </Panel>
        )}
      </QueryState>
    </div>
  );
}
