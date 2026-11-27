import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { useStore } from '../context/Store';
import { roleNames } from '../data/demo';
import { inicioDoPerfil } from '../data/perfis';
import { Field, Tabs } from '../components/UI';

import { validateAccount, validateRecovery, maskDocument, normalizeEmail } from '../utils/validation';
import { buscarUsuario, cadastrarUsuario, fazerLogin, guardarCsrf } from '../services/api';
import { t } from '../i18n';

export default function Account({ login = false }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initialProfile = params.get('perfil');

  const [profile, setProfile] = useState(
    ['comprador', 'organizador', 'fornecedor'].includes(initialProfile)
      ? initialProfile
      : 'comprador'
  );

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { activateUser, chooseRole, notify, isAuthenticated } = useStore();


  async function handleSubmit(event) {
    event.preventDefault();

    if (busy) return;

    const form = event.currentTarget;

    const data = Object.fromEntries(
      new FormData(form)
    );

    data.email = normalizeEmail(data.email);

    const validationErrors = validateAccount(data, login);

    setErrors(validationErrors);
    setSubmitError('');

    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.keys(validationErrors)[0];

      form.elements[firstError]?.focus();

      return;
    }

    setBusy(true);

    try {
      if (login) {
        // Fluxo de Login Real
        const payload = {
          email: data.email,
          senha: data.password
        };

        const resultado = await fazerLogin(payload);
        // O cookie de sessão fica com o navegador; o token CSRF acompanha as gravações.
        guardarCsrf(resultado.csrfToken);

        // Define o papel (role) retornado pela base de dados
        const roleDoBanco = resultado.user?.role || 'comprador';
        const perfilRetornado = roleDoBanco === 'participante' ? 'comprador' : roleDoBanco;
        chooseRole(perfilRetornado);

        // Busca dados adicionais do usuário pelo ID retornado se disponível
        let dadosExtras = null;
        if (resultado.user?.id) {
          try {
            dadosExtras = await buscarUsuario(resultado.user.id);
          } catch (e) {
            console.warn('Não foi possível obter dados extras do usuário:', e);
          }
        }

        const usuarioFinal = {
          id: resultado.user?.id,
          name: resultado.user?.nome || dadosExtras?.nome || 'Usuário',
          email: resultado.user?.email || dadosExtras?.email || data.email,
          photo: resultado.user?.foto || dadosExtras?.url_foto_perfil || '',
          role: perfilRetornado,
          tipo_perfil: resultado.user?.tipo_perfil || dadosExtras?.tipo_perfil || 1,
          // Situação na aprovação da administração (etapa 6): A, P ou R.
          aprovacao: resultado.user?.aprovacao || '',
        };

        activateUser(usuarioFinal);

        // Armazena os dados na sessionStorage
        try {
          sessionStorage.setItem('trocaticket-user', JSON.stringify(usuarioFinal));
          sessionStorage.setItem('trocaticket-role', perfilRetornado);
        } catch {}

        notify(`Bem-vindo de volta, ${usuarioFinal.name}!`);
        navigate('/');

      } else {
        // Fluxo de Cadastro
        const mapPerfil = {
          comprador: 1,
          organizador: 2,
          fornecedor: 3
        };

        const payload = {
          nome: data.name,
          email: data.email,
          senha: data.password,
          tipo_perfil: mapPerfil[profile] || 1,
          documento: data.document ? data.document.replace(/\D/g, '') : null
        };

        const cadResultado = await cadastrarUsuario(payload);
        // O servidor já abre a sessão da conta nova.
        guardarCsrf(cadResultado?.csrfToken);

        chooseRole(profile);

        const novoUsuario = {
          id: cadResultado?.usuarioId,
          name: data.name,
          email: data.email,
          role: profile,
          tipo_perfil: mapPerfil[profile] || 1,
          document: data.document || '',
          aprovacao: cadResultado?.user?.aprovacao || (profile === 'comprador' ? 'A' : 'P'),
        };

        activateUser(novoUsuario);

        try {
          sessionStorage.setItem('trocaticket-user', JSON.stringify(novoUsuario));
          sessionStorage.setItem('trocaticket-role', profile);
        } catch {}

        notify(
          novoUsuario.aprovacao === 'P'
            ? 'Cadastro gravado! Sua conta aguarda a aprovação da administração.'
            : 'Cadastro gravado na base de dados com sucesso!',
        );
        navigate('/');
      }

    } catch (error) {
      setSubmitError(error.message || 'Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  function handleProfileChange(value) {
    const selectedProfile = Object.keys(roleNames).find(
      key => roleNames[key] === value
    );

    if (selectedProfile) {
      setProfile(selectedProfile);
      setErrors({});
    }
  }

  function togglePassword() {
    setShowPassword(previous => !previous);
  }

  function handleEmailBlur(event) {
    event.currentTarget.value = normalizeEmail(event.currentTarget.value);
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="auth-symbol">♙</span>

        <h1>
          {login ? t('Acesse sua Conta') : t('Crie sua Conta')}
        </h1>

        <AccountNavigation login={login} />

        {!login && (
          <Tabs
            options={[
              roleNames.comprador,
              roleNames.organizador,
              roleNames.fornecedor
            ]}
            value={roleNames[profile]}
            onChange={handleProfileChange}
          />
        )}

        {!login && profile !== 'comprador' && (
          <p className="auth-note approval-note">
            {profile === 'organizador'
              ? t('Contas de organizador passam pela aprovação da administração. Até lá, você pode completar o perfil e preparar eventos como rascunho.')
              : t('Contas de fornecedor passam pela aprovação da administração. Até lá, você pode completar o perfil.')}
          </p>
        )}

        <form noValidate onSubmit={handleSubmit}>

          {!login && (
            <>
              <Field
                label={t('Nome completo')}
                name="name"
                id="name"
                autoComplete="name"
                placeholder={t('João da Silva')}
                error={errors.name}
                disabled={busy}
              />

              <Field
                label={
                  profile === 'comprador'
                    ? t('CPF')
                    : t('CPF / CNPJ')
                }
                name="document"
                id="document"
                placeholder="000.000.000-00"
                mask={maskDocument}
                inputMode="numeric"
                autoComplete="off"
                error={errors.document}
                disabled={busy}
              />
            </>
          )}

          <Field
            label={t('E-mail')}
            name="email"
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('exemplo@email.com')}
            onBlur={handleEmailBlur}
            error={errors.email}
            disabled={busy}
          />

          <Field
            label={t('Senha')}
            name="password"
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder={t('Mínimo de 8 caracteres')}
            error={errors.password}
            disabled={busy}
          />

          {!login && (
            <Field
              label={t('Confirme sua senha')}
              name="confirm"
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={errors.confirm}
              disabled={busy}
            />
          )}


          <AccountOptions
            login={login}
            showPassword={showPassword}
            onTogglePassword={togglePassword}
          />

          {submitError && (
            <p className="form-error" role="alert">
              {t(submitError)}
            </p>
          )}

          <button
            type="submit"
            className={`button ${login ? 'blue-button' : 'dark'}`}
            disabled={busy}
          >
            {busy
              ? t('A processar…')
              : login
                ? t('Entrar na plataforma')
                : t('Cadastrar')}
          </button>

        </form>

        {!isAuthenticated && (
          <>
            <p className="auth-note">
              {t('Acesse com sua conta ou cadastre-se para usar os dados vinculados ao banco.')}
            </p>
            <div className="divider">{t('OU EXPLORE SEM CADASTRO')}</div>
            <Link className="button outline full" to="/perfis">
              {t('Escolher perfil de demonstração →')}
            </Link>
          </>
        )}

      </div>

    </section>
  );
}

function AccountNavigation({ login }) {
  return (
    <div className="tabs auth-tabs">

      <Link
        className={login ? 'active' : ''}
        to="/entrar"
      >
        {t('Entrar')}
      </Link>

      <Link
        className={!login ? 'active' : ''}
        to="/cadastro"
      >
        {t('Criar Conta')}
      </Link>

    </div>
  );
}

function AccountOptions({login, showPassword, onTogglePassword}) {
  return (
    <div className="form-options">

      <label>
        <input type="checkbox" checked={showPassword} onChange={onTogglePassword}/>
        {t('Mostrar palavra-passe')}
      </label>

      {login && (
        <Link to="/recuperar">
          {t('Esqueceu-se da sua palavra-passe?')}
        </Link>
      )}

    </div>
  );
}

// Cards da seleção de perfis (referência 03). O identificador é o interno do site.
const PERFIS_DEMO = [
  {
    id: 'comprador',
    tag: 'Usuário',
    title: 'Usuário',
    description: 'Descubra eventos, salve favoritos e reserve ingressos.',
    items: ['Busca por nome e cidade', 'Favoritos e reservas', 'Comunidade de fãs'],
    cta: 'Entrar como usuário',
    icon: (
      <>
        <path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3Z" />
        <path d="M14 6v12" strokeDasharray="2 3" />
      </>
    ),
  },
  {
    id: 'organizador',
    tag: 'Eventos',
    title: 'Organizador',
    description: 'Crie, publique e acompanhe seus eventos do início ao fim.',
    items: ['Cadastro e publicação', 'Orçamento de fornecedores', 'Painel de pendências'],
    cta: 'Entrar como organizador',
    icon: (
      <>
        <path d="M3 11v3a1 1 0 0 0 1 1h3l7 4V6L7 10H4a1 1 0 0 0-1 1Z" />
        <path d="M18 9a4 4 0 0 1 0 6" />
      </>
    ),
  },
  {
    id: 'fornecedor',
    tag: 'Serviços',
    title: 'Fornecedor',
    description: 'Encontre oportunidades e envie cotações para eventos.',
    items: ['Oportunidades abertas', 'Cotações em tempo real', 'Gestão de inventário'],
    cta: 'Entrar como fornecedor',
    icon: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
  },
  {
    id: 'admin',
    tag: 'Plataforma',
    title: 'Admin',
    description: 'Modere cadastros, consulte relatórios e exporte dados.',
    items: ['Moderação de lotes', 'Relatórios por setor', 'Exportação em CSV'],
    cta: 'Entrar como admin',
    icon: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export function Profiles() {
  const { trocarPerfilDemo, isAuthenticated } = useStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Só entra no perfil se a troca for permitida (sem conta autenticada).
  function handleRoleSelection(id) {
    if (trocarPerfilDemo(id)) navigate(inicioDoPerfil(id));
  }

  return (
    <section className="pf-picker" aria-labelledby="pf-title">
      <div className="pf-intro">
        <h1 id="pf-title">{t('Selecione o tipo de perfil')}</h1>
        <p className="pf-note">{t('Apenas disponível no Modo demonstração')}</p>
      </div>

      <div className="pf-grid" role="group" aria-label={t('Tipo de perfil')}>
        {PERFIS_DEMO.map((perfil) => (
          <button
            key={perfil.id}
            type="button"
            className={`pf-card pf-${perfil.id}`}
            onClick={() => handleRoleSelection(perfil.id)}
          >
            <span className="pf-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {perfil.icon}
              </svg>
            </span>
            <span className="pf-tag">{t(perfil.tag)}</span>
            <h2>{t(perfil.title)}</h2>
            <span className="pf-desc">{t(perfil.description)}</span>
            <ul>
              {perfil.items.map((item) => (
                <li key={item}>{t(item)}</li>
              ))}
            </ul>
            <span className="pf-cta">
              {t(perfil.cta)}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h16m-6-6 6 6-6 6" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Recover() {
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});

  function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const data = Object.fromEntries(
      new FormData(form)
    );

    data.email = normalizeEmail(data['recover-email']);

    const validationErrors = validateRecovery(data);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      form.elements['recover-email']?.focus();
      return;
    }

    setDone(true);
  }

  return (
    <section className="auth-page">

      <div className="auth-card">

        <h1>{t('Recuperar acesso')}</h1>

        {done ? (

          <p role="status">
            {t('Solicitação simulada. Nenhum e-mail foi enviado.')}
          </p>

        ) : (

          <form noValidate onSubmit={handleSubmit}>

            <Field
              label={t('E-mail da conta')}
              name="recover-email"
              id="recover-email"
              type="email"
              autoComplete="email"
              placeholder={t('exemplo@email.com')}
              onBlur={(event) => {
                  event.currentTarget.value = normalizeEmail(
                  event.currentTarget.value
                );
              }}
              error={errors.email}
            />

            <button
              type="submit"
              className="button blue-button"
            >
              {t('Simular recuperação')}
            </button>

          </form>

        )}


        <Link className="text-link" to="/entrar">
          {t('Voltar para entrar')}
        </Link>

      </div>

    </section>
  );
}