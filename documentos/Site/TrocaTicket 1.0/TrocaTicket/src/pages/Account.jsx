import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../context/StoreContext';
import { destinations, roleNames } from '../data/demo';
import { Field, Tabs } from '../components/UI';
export default function Account({ login = false }) {
  const { t } = useI18n();
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
  const [show, setShow] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = {};
    if (!login && data.name.trim().length < 2) next.name = 'Informe seu nome completo.';
    if (!login && ![11, 14].includes(data.document.replace(/\D/g, '').length))
      next.document = 'Use 11 dígitos para CPF ou 14 para CNPJ (fictício).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) next.email = 'Informe um e-mail válido.';
    if (data.password.length < 8) next.password = 'Use pelo menos 8 caracteres.';
    if (!login && data.confirm !== data.password) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    chooseRole(profile);
    notify(
      login ? 'Acesso de demonstração iniciado.' : 'Cadastro validado. Bem-vindo à demonstração!',
    );
    navigate(login ? '/perfis' : destinations[profile]);
  }
  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="auth-symbol">♙</span>
        <h1>{login ? t('Acesse sua Conta') : t('Crie sua Conta')}</h1>
        <div className="tabs auth-tabs">
          <Link className={login ? 'active' : ''} to="/entrar">
            {t('Entrar')}
          </Link>
          <Link className={!login ? 'active' : ''} to="/cadastro">
            {t('Criar Conta')}
          </Link>
        </div>
        {!login && (
          <Tabs
            options={['Participante', 'Organizador', 'Fornecedor']}
            value={roleNames[profile]}
            onChange={(value) =>
              setProfile(Object.keys(roleNames).find((key) => roleNames[key] === value))
            }
          />
        )}
        <form noValidate onSubmit={submit}>
          {!login && (
            <>
              <Field
                label="Nome completo"
                name="name"
                autoComplete="name"
                placeholder={t('João da Silva')}
                error={errors.name}
              />
              <Field
                label={profile === 'comprador' ? 'CPF' : 'CPF / CNPJ'}
                name="document"
                placeholder={t('Documento fictício')}
                error={errors.document}
              />
            </>
          )}
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('exemplo@email.com')}
            error={errors.email}
          />
          <Field
            label="Senha"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder={t('Mínimo de 8 caracteres')}
            error={errors.password}
          />
          {!login && (
            <Field
              label="Confirme sua senha"
              name="confirm"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              error={errors.confirm}
            />
          )}
          <div className="form-options">
            <label>
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />{' '}
              {t('Mostrar senha')}
            </label>
            {login && <Link to="/recuperar">{t('Esqueceu sua senha?')}</Link>}
          </div>
          <button className={`button ${login ? 'blue-button' : 'dark'}`} disabled={busy}>
            {busy ? t('Validando…') : login ? t('Entrar na plataforma') : t('Cadastrar')}
          </button>
        </form>
        <p className="auth-note">
          {t('Demonstração: use dados fictícios. Senhas e documentos não são armazenados.')}
        </p>
        <div className="divider">{t('OU EXPLORE SEM CADASTRO')}</div>
        <Link className="button outline full" to="/perfis">
          {t('Escolher perfil de demonstração →')}
        </Link>
      </div>
    </section>
  );
}
export function Profiles() {
  const { t } = useI18n();
  const { chooseRole } = useStore();
  const navigate = useNavigate();
  return (
    <section className="auth-page profile-selection">
      <div className="section-heading">
        <p className="eyebrow purple">{t('Uma plataforma, muitas possibilidades')}</p>
        <h1>{t('Como você quer explorar?')}</h1>
        <p>{t('Escolha um perfil para conhecer os fluxos da plataforma.')}</p>
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
            <h2>{t(name)}</h2>
            <p>
              {t(
                [
                  'Descubra eventos, salve favoritos e simule seus ingressos.',
                  'Crie eventos, conecte fornecedores e consolide custos.',
                  'Gerencie seu catálogo e envie propostas comerciais.',
                  'Acompanhe relatórios e faça a moderação de cadastros.',
                ][i],
              )}
            </p>
            <strong>{t('Acessar área →')}</strong>
          </button>
        ))}
      </div>
      <Link className="text-link" to="/">
        {t('← Voltar ao início')}
      </Link>
    </section>
  );
}
export function Recover() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>{t('Recuperar acesso')}</h1>
        {done ? (
          <p role="status">
            {t(
              'Solicitação simulada. Nenhum e-mail foi enviado; você pode entrar com qualquer e-mail válido e senha de 8 caracteres na demonstração.',
            )}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <Field label="E-mail da conta" name="recover-email" type="email" required />
            <button className="button blue-button">{t('Simular recuperação')}</button>
          </form>
        )}
        <Link className="text-link" to="/entrar">
          {t('Voltar para entrar')}
        </Link>
      </div>
    </section>
  );
}
