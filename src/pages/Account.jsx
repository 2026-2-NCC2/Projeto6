import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useStore } from '../context/Store';
import { roleNames } from '../data/demo';
import { Field, Tabs } from '../components/UI';

export default function Account({ login = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { chooseRole, updateProfile, notify } = useStore();
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

    // 1. Descobre o nome real digitado ou extrai do e-mail (ex: felipe@email.com -> Felipe)
    let finalName = 'Felipe';
    if (!login && data.name && data.name.trim()) {
      finalName = data.name.trim();
    } else if (data.email) {
      const emailUser = data.email.split('@')[0];
      finalName = emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
    }

    // 2. Grava no localStorage para persistir de verdade mesmo se der F5
    localStorage.setItem('userName', finalName);

    // 3. Atualiza o estado da Store
    if (updateProfile) {
      updateProfile({
        name: finalName,
        email: data.email,
      });
    }

    // 4. Atribui o perfil escolhido
    chooseRole(profile);

    notify(
      login
        ? `Bem-vindo de volta, ${finalName}!`
        : `Conta criada com sucesso! Bem-vindo, ${finalName}!`,
    );

    navigate('/');
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="auth-symbol">♙</span>
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
                placeholder="Ex: Felipe Alves"
                error={errors.name}
              />
              <Field
                label={profile === 'comprador' ? 'CPF' : 'CPF / CNPJ'}
                name="document"
                placeholder="Documento fictício"
                error={errors.document}
              />
            </>
          )}
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            error={errors.email}
          />
          <Field
            label="Senha"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder="Mínimo de 8 caracteres"
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
              Mostrar senha
            </label>
            {login && <Link to="/recuperar">Esqueceu sua senha?</Link>}
          </div>
          <button className={`button ${login ? 'blue-button' : 'dark'}`} disabled={busy}>
            {busy ? 'Validando…' : login ? 'Entrar na plataforma' : 'Cadastrar'}
          </button>
        </form>
        <p className="auth-note">
          Demonstração: use dados fictícios. Senhas e documentos não são armazenados.
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
              navigate('/');
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
