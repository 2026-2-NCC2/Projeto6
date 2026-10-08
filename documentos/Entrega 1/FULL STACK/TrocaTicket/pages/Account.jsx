import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../context/Store';
import { destinations, roleNames } from '../data/demo';
import { Field } from '../components/UI';
function AuthIcon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: 'false',
  };
  const paths = {
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
    eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-4.1 4.4" /><path d="M6.2 6.3C3.5 8 2 12 2 12s3.5 6 10 6a10.8 10.8 0 0 0 3.1-.5" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
    badge: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4M14 14h4" /></>,
    key: <><circle cx="8" cy="15" r="5" /><path d="m11.5 11.5 8-8 2 2-2 2 2 2-3 3-2-2-3.5 3.5" /></>,
  };
  return <svg {...common}>{paths[name] || paths.user}</svg>;
}

function AuthField({ id, label, icon, error, type = 'text', trailing, ...props }) {
  return (
    <div className={`auth-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <span className="auth-input-icon"><AuthIcon name={icon} /></span>
        <input
          id={id}
          name={id}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {trailing}
      </div>
      {error && <small className="auth-field-error" id={`${id}-error`}>{error}</small>}
    </div>
  );
}

export default function Account({ login = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { chooseRole, notify } = useStore();
  const [profile, setProfile] = useState(
    ['comprador', 'organizador', 'fornecedor'].includes(params.get('perfil'))
      ? params.get('perfil')
      : 'comprador',
  );
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const roleOptions = [
    { id: 'comprador', label: 'Usuário' },
    { id: 'organizador', label: 'Organizador' },
    { id: 'fornecedor', label: 'Fornecedor' },
  ];

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = {};
    const digits = (data.document || '').replace(/\D/g, '');

    if (!login && data.name.trim().length < 2) next.name = 'Informe seu nome completo.';
    if (!login && ![11, 14].includes(digits.length)) {
      next.document = profile === 'comprador'
        ? 'Informe um CPF com 11 dígitos.'
        : 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((data.email || '').trim())) {
      next.email = 'Informe um e-mail válido.';
    }
    if ((data.password || '').length < 8) next.password = 'Use pelo menos 8 caracteres.';
    if (!login && data.confirm !== data.password) next.confirm = 'As senhas não conferem.';

    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }

    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    chooseRole(profile);
    notify(
      login
        ? 'Acesso de demonstração iniciado. Nenhuma autenticação real foi realizada.'
        : 'Cadastro validado na demonstração. Nenhum dado foi enviado a um servidor.',
    );
    navigate(login ? '/perfis' : destinations[profile]);
    setBusy(false);
  }

  function socialDemo(provider) {
    notify(`Login com ${provider} ainda não está conectado nesta demonstração.`);
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-symbol" aria-hidden="true"><AuthIcon name="key" size={25} /></div>
        <h1>{login ? 'Acesse sua Conta' : 'Crie sua Conta'}</h1>

        <div className="tabs auth-tabs" role="group" aria-label="Escolha entrar ou criar conta">
          <Link className={login ? 'active' : ''} to="/entrar">Entrar</Link>
          <Link className={!login ? 'active' : ''} to="/cadastro">Criar Conta</Link>
        </div>

        {!login && (
          <div className="tabs auth-role-tabs" role="group" aria-label="Tipo de conta">
            {roleOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={profile === option.id ? 'active' : ''}
                aria-pressed={profile === option.id}
                onClick={() => {
                  setProfile(option.id);
                  setErrors((current) => ({ ...current, document: undefined }));
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <form noValidate onSubmit={submit}>
          {!login && (
            <>
              <AuthField
                id="name"
                label="Nome completo"
                icon="user"
                autoComplete="name"
                placeholder="João da Silva"
                error={errors.name}
              />
              <AuthField
                id="document"
                label={profile === 'comprador' ? 'CPF' : 'CPF ou CNPJ'}
                icon="badge"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                maxLength={18}
                error={errors.document}
              />
            </>
          )}
          <AuthField
            id="email"
            label="E-mail"
            icon="mail"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            error={errors.email}
          />
          <AuthField
            id="password"
            label="Senha"
            icon="lock"
            type={showPassword ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder="Mínimo de 8 caracteres"
            error={errors.password}
            trailing={(
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <AuthIcon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            )}
          />
          {!login && (
            <AuthField
              id="confirm"
              label="Confirme sua senha"
              icon="lock"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Digite a senha novamente"
              error={errors.confirm}
              trailing={(
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  <AuthIcon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              )}
            />
          )}

          {login && (
            <div className="form-options auth-form-options">
              <label className="remember-option">
                <input type="checkbox" name="remember" />
                Manter conectado
              </label>
              <Link to="/recuperar">Esqueceu sua senha?</Link>
            </div>
          )}

          <button className="button dark auth-submit" disabled={busy}>
            {busy ? 'Validando…' : login ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="divider auth-divider">OU CONTINUE COM</div>
        <div className="social-buttons">
          <button type="button" className="social-button" onClick={() => socialDemo('Google')}>
            <span className="google-mark" aria-hidden="true">G</span> Google
          </button>
          <button type="button" className="social-button" onClick={() => socialDemo('Apple')}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M16.7 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.5.8-3.2.8s-1.7-.8-2.8-.8c-1.5 0-2.8.9-3.6 2.2-1.5 2.7-.4 6.8 1.1 9 .7 1.1 1.5 2.2 2.6 2.2 1 0 1.4-.7 2.7-.7s1.7.7 2.8.7c1.2 0 1.9-1.1 2.6-2.2.8-1.2 1.1-2.3 1.1-2.4-.1 0-2-.8-2-3.9ZM14.6 6.5c.6-.7 1.1-1.7 1-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-1 2.6 1 0 2-.5 2.6-1.2Z" /></svg>
            Apple
          </button>
        </div>
        <p className="auth-note">
          Demonstração de front-end. Seus dados não são enviados nem salvos como credenciais.
        </p>
      </div>
    </section>
  );
}
export function Profiles() {
  const { chooseRole } = useStore();
  const navigate = useNavigate();
  return (
    <section className="auth-page profile-selection">
      <div className="section-heading">
        <p className="eyebrow purple">Uma plataforma, muitas possibilidades</p>
        <h1>Como você quer explorar?</h1>
        <p>Escolha um perfil para conhecer os fluxos da plataforma.</p>
      </div>
      <div className="role-grid">
        {Object.entries(roleNames).map(([id, name], i) => (
          <button
            className="role-card"
            key={id}
            onClick={() => {
              chooseRole(id);
              navigate(destinations[id]);
            }}
          >
            <span className="role-symbol">{['♧', '⚑', '▣', '◇'][i]}</span>
            <h2>{name}</h2>
            <p>
              {
                [
                  'Descubra eventos, salve favoritos e simule seus ingressos.',
                  'Crie eventos, conecte fornecedores e consolide custos.',
                  'Gerencie seu catálogo e envie propostas comerciais.',
                  'Acompanhe relatórios e faça a moderação de cadastros.',
                ][i]
              }
            </p>
            <strong>Acessar área →</strong>
          </button>
        ))}
      </div>
      <Link className="text-link" to="/">
        ← Voltar ao início
      </Link>
    </section>
  );
}
export function Recover() {
  const [done, setDone] = useState(false);
  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Recuperar acesso</h1>
        {done ? (
          <p role="status">
            Solicitação simulada. Nenhum e-mail foi enviado; você pode entrar com qualquer e-mail
            válido e senha de 8 caracteres na demonstração.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <Field label="E-mail da conta" name="recover-email" type="email" required />
            <button className="button blue-button">Simular recuperação</button>
          </form>
        )}
        <Link className="text-link" to="/entrar">
          Voltar para entrar
        </Link>
      </div>
    </section>
  );
}
