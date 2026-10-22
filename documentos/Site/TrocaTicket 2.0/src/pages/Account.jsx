import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../context/StoreContext';
import { destinations, roleNames } from '../data/demo';
import { Field, Tabs } from '../components/UI';
import { buscarContaDemo, senhaInicialDemo } from '../mvp/contasDemo';
import { useI18n } from '../i18n';

// Só a demonstração local usa estes atalhos. A sessão real da API continua separada.
const perfisDasContasDemo = {
  ana: 'comprador',
  bruna: 'comprador',
  caio: 'comprador',
  organizador: 'organizador',
  fornecedor: 'fornecedor',
  admin: 'admin',
};

export default function Account({ login = false }) {
  const [params] = useSearchParams();
  const { t } = useI18n();
  const contaDemo = login ? buscarContaDemo(params.get('demo')) : null;
  const navigate = useNavigate();
  const { chooseRole, notify } = useStore();
  const [profile, setProfile] = useState(
    contaDemo
      ? perfisDasContasDemo[contaDemo.id]
      : ['comprador', 'organizador', 'fornecedor'].includes(params.get('perfil'))
        ? params.get('perfil')
        : 'comprador',
  );
  const [email, setEmail] = useState(contaDemo?.email || '');
  const [password, setPassword] = useState(contaDemo ? senhaInicialDemo : '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    if (!login) return;
    setEmail(contaDemo?.email || '');
    setPassword(contaDemo ? senhaInicialDemo : '');
    setProfile(contaDemo ? perfisDasContasDemo[contaDemo.id] : 'comprador');
  }, [login, contaDemo]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
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
    if (!mounted.current) return;
    chooseRole(profile);
    notify(
      t(
        login ? 'Acesso de demonstração iniciado.' : 'Cadastro validado. Bem-vindo à demonstração!',
      ),
    );
    navigate(destinations[profile]);
  }
  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="auth-symbol">♙</span>
        <h1>{t(login ? 'Acesse sua Conta' : 'Crie sua Conta')}</h1>
        <p className="auth-note">
          {t('Demonstração acadêmica no navegador, sem autenticação ou pagamentos reais.')}
        </p>
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
        {login && contaDemo && (
          <p className="demo-selected-account" role="status">
            {t('Perfil de demonstração')}: <strong>{t(contaDemo.perfil)}</strong>
          </p>
        )}
        <form noValidate onSubmit={submit}>
          {!login && (
            <>
              <Field
                label={t('Nome completo')}
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
            label={t('E-mail')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('exemplo@email.com')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
          <Field
            label={t('Senha')}
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder={t('Mínimo de 8 caracteres')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          {!login && (
            <Field
              label={t('Confirme sua senha')}
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
            {t(busy ? 'Validando…' : login ? 'Entrar na demonstração' : 'Cadastrar')}
          </button>
        </form>
        <p className="auth-note">
          {t(
            'Use somente dados fictícios. Senhas e documentos deste formulário não são armazenados nem enviados. As alterações das telas ficam neste navegador.',
          )}
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
        <p>
          {t(
            'Escolha um perfil para conhecer os fluxos simulados. Esta seleção não concede acesso a contas reais; os dados fictícios ficam neste navegador.',
          )}
        </p>
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
            <Field label={t('E-mail da conta')} name="recover-email" type="email" required />
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
