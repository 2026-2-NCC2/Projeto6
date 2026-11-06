import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../context/Store';
import { destinations, roleNames } from '../data/demo';
import { Field, Tabs, Modal } from '../components/UI';
import Icon, { ProviderIcon } from '../components/Icon';

function rememberedEmail() {
  try {
    return localStorage.getItem('trocaticket-demo-email') || '';
  } catch {
    return '';
  }
}

function AccessField({ label, name, error, icon, password, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} name={name} error={error}>
      <div className="access-input">
        <Icon name={icon} />
        <input
          {...props}
          id={name}
          name={name}
          type={password ? (visible ? 'text' : 'password') : props.type || 'text'}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        {password && (
          <button
            type="button"
            className="password-toggle"
            aria-label={
              visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`
            }
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} />
          </button>
        )}
      </div>
    </Field>
  );
}
export default function Account({ login = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { chooseRole, notify, update } = useStore();
  const [profile, setProfile] = useState(
    ['comprador', 'organizador', 'fornecedor'].includes(params.get('perfil'))
      ? params.get('perfil')
      : 'comprador',
  );
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(() => !!rememberedEmail());
  const [provider, setProvider] = useState('');
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const next = {};
    if (!login && data.name.trim().length < 2) next.name = 'Informe seu nome completo.';
    if (!login && ![11, 14].includes(data.document.replace(/\D/g, '').length))
      next.document = 'Use 11 dígitos para CPF ou 14 para CNPJ (fictício).';
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
    const validUsername = login && /^[a-z\d_.-]{3,}$/i.test(data.email);
    if (!validEmail && !validUsername)
      next.email = login ? 'Informe um e-mail ou usuário válido.' : 'Informe um e-mail válido.';
    if (data.password.length < 8) next.password = 'Use pelo menos 8 caracteres.';
    if (!login && data.confirm !== data.password) next.confirm = 'As senhas não conferem.';
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    if (login) {
      try {
        if (remember) localStorage.setItem('trocaticket-demo-email', data.email);
        else localStorage.removeItem('trocaticket-demo-email');
      } catch {
        /* O acesso de demonstração também funciona sem armazenamento. */
      }
    }
    // Perfil principal é a fonte única de identidade também para o fórum integrado.
    update('profile', (old) => ({
      ...old,
      ...(data.name?.trim() ? { name: data.name.trim() } : {}),
      ...(data.email?.includes('@') ? { email: data.email.trim() } : {}),
    }));
    chooseRole(profile);
    notify(
      login ? 'Acesso de demonstração iniciado.' : 'Cadastro validado. Bem-vindo à demonstração!',
    );
    navigate(login ? '/perfis' : destinations[profile]);
  }
  return (
    <section className={`auth-page access-page ${login ? 'login-page' : 'signup-page'}`}>
      <div className="auth-card access-card">
        <span className={`auth-symbol ${login ? 'login-symbol' : ''}`}>
          <Icon name="lock" size={24} />
        </span>
        <h1>{login ? 'Acesse sua Conta' : 'Crie sua Conta'}</h1>
        <div className="tabs auth-tabs">
          <Link className={login ? 'active' : ''} to="/entrar">
            Entrar
          </Link>
          <Link className={!login ? 'active' : ''} to="/cadastro">
            Criar Conta
          </Link>
        </div>
        {!login && (
          <Tabs
            label="Tipo de conta"
            options={['Usuário', 'Organizador', 'Fornecedor']}
            value={profile === 'comprador' ? 'Usuário' : roleNames[profile]}
            onChange={(value) =>
              setProfile(
                value === 'Usuário'
                  ? 'comprador'
                  : Object.keys(roleNames).find((key) => roleNames[key] === value),
              )
            }
          />
        )}
        <form noValidate onSubmit={submit}>
          {!login && (
            <>
              <AccessField
                icon="user"
                label="Nome completo"
                name="name"
                autoComplete="name"
                placeholder="João da Silva"
                error={errors.name}
              />
              <AccessField
                icon="user"
                label={profile === 'comprador' ? 'CPF' : 'CPF / CNPJ'}
                name="document"
                placeholder={profile === 'comprador' ? 'XXX.XXX.XXX-XX' : 'XX.XXX.XXX/XXXX-XX'}
                inputMode="numeric"
                error={errors.document}
              />
            </>
          )}
          <AccessField
            icon="mail"
            label={login ? 'E-mail ou usuário' : 'E-mail'}
            name="email"
            type={login ? 'text' : 'email'}
            autoComplete={login ? 'username' : 'email'}
            placeholder="exemplo@email.com"
            defaultValue={login ? rememberedEmail() : ''}
            error={errors.email}
          />
          <AccessField
            icon="lock"
            password
            label="Senha"
            name="password"
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            error={errors.password}
          />
          {!login && (
            <AccessField
              icon="lock"
              password
              label="Confirme sua senha"
              name="confirm"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirm}
            />
          )}
          {login && (
            <div className="form-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />{' '}
                Lembrar de mim
              </label>
              <Link to="/recuperar">Esqueci minha senha?</Link>
            </div>
          )}
          <button className={`button ${login ? 'blue-button' : 'dark'}`} disabled={busy}>
            {busy ? 'Validando…' : login ? 'Entrar no Sistema' : 'Cadastrar'}
          </button>
        </form>
        <div className="divider">OU CONTINUE COM</div>
        <div className="social-access">
          {['Google', 'Apple'].map((name) => (
            <button key={name} type="button" onClick={() => setProvider(name)}>
              <ProviderIcon provider={name} />
              {name}
            </button>
          ))}
        </div>
      </div>
      {provider && (
        <Modal title={`Entrar com ${provider}`} onClose={() => setProvider('')}>
          <p>
            O acesso com {provider} ainda não está conectado. Você pode explorar as telas com dados
            fictícios.
          </p>
          <Link className="button blue-button" to="/perfis">
            Explorar demonstração
          </Link>
        </Modal>
      )}
    </section>
  );
}
const profileCards = [
  {
    id: 'comprador',
    tag: 'Público',
    title: 'Usuário',
    icon: 'ticket',
    text: 'Descubra eventos, salve favoritos e reserve ingressos.',
    items: ['Busca por nome e cidade', 'Favoritos e reservas', 'Comunidade de fãs'],
    cta: 'Entrar como usuário',
  },
  {
    id: 'organizador',
    tag: 'Eventos',
    title: 'Organizador',
    icon: 'megaphone',
    text: 'Crie, publique e acompanhe seus eventos do início ao fim.',
    items: ['Cadastro e publicação', 'Orçamento de fornecedores', 'Painel de pendências'],
    cta: 'Entrar como organizador',
  },
  {
    id: 'fornecedor',
    tag: 'Serviços',
    title: 'Fornecedor',
    icon: 'box',
    text: 'Encontre oportunidades e envie cotações para eventos.',
    items: ['Oportunidades abertas', 'Cotações em tempo real', 'Gestão de inventário'],
    cta: 'Entrar como fornecedor',
  },
  {
    id: 'admin',
    tag: 'Plataforma',
    title: 'Admin',
    icon: 'shield',
    text: 'Modere cadastros, consulte relatórios e exporte dados.',
    items: ['Moderação de lotes', 'Relatórios por setor', 'Exportação em CSV'],
    cta: 'Entrar como admin',
  },
];
export function Profiles() {
  const { chooseRole } = useStore();
  return (
    <section className="pf-picker">
      <div className="pf-intro">
        <h1>Selecione o tipo de perfil</h1>
        <span className="pf-note">Apenas disponível no Modo demonstração</span>
      </div>
      <div className="pf-grid" role="group" aria-label="Tipo de perfil">
        {profileCards.map((card) => (
          <Link
            key={card.id}
            to={card.id === 'comprador' ? '/inicio' : destinations[card.id]}
            className={`pf-card pf-${card.id}`}
            onClick={() => chooseRole(card.id)}
          >
            <span className="pf-icon">
              <Icon name={card.icon} size={26} />
            </span>
            <span className="pf-tag">{card.tag}</span>
            <h2>{card.title}</h2>
            <span className="pf-desc">{card.text}</span>
            <ul>
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <span className="pf-cta">
              {card.cta} <Icon name="arrow" size={18} />
            </span>
          </Link>
        ))}
      </div>
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
