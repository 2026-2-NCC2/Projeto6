import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { useStore } from '../context/Store';
import { destinations, roleNames } from '../data/demo';
import { Field, Tabs } from '../components/UI';

import { validateAccount, validateRecovery, maskDocument, normalizeEmail } from '../utils/validation';
import { buscarUsuario, cadastrarUsuario, fazerLogin } from '../services/api';

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

  const { update, chooseRole, notify } = useStore();


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
        };

        // Atualiza as informações do perfil na Store global (que sincroniza com o localStorage)
        update?.('profile', (prev) => ({
          ...prev,
          ...usuarioFinal,
        }));

        if (perfilRetornado === 'fornecedor') {
          update?.('supplierProfile', (prev) => ({
            ...prev,
            id: usuarioFinal.id,
            name: usuarioFinal.name,
            tradeName: usuarioFinal.name,
            photo: usuarioFinal.photo || prev?.photo,
          }));
        }

        // Armazena os dados na sessionStorage
        try {
          sessionStorage.setItem('trocaticket-user', JSON.stringify(usuarioFinal));
          sessionStorage.setItem('trocaticket-role', perfilRetornado);
        } catch {}

        notify(`Bem-vindo de volta, ${usuarioFinal.name}!`);
        navigate(destinations[perfilRetornado] || '/eventos');

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

        chooseRole(profile);

        const novoUsuario = {
          id: cadResultado?.usuarioId,
          name: data.name,
          email: data.email,
          role: profile,
          tipo_perfil: mapPerfil[profile] || 1,
          document: data.document || '',
        };

        update?.('profile', (prev) => ({
          ...prev,
          ...novoUsuario,
        }));

        try {
          sessionStorage.setItem('trocaticket-user', JSON.stringify(novoUsuario));
          sessionStorage.setItem('trocaticket-role', profile);
        } catch {}

        notify('Cadastro gravado na base de dados com sucesso!');
        navigate(destinations[profile] || '/eventos');
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
          {login ? 'Acesse sua Conta' : 'Crie sua Conta'}
        </h1>

        <AccountNavigation login={login} />

        {!login && (
          <Tabs
            options={[
              'Participante',
              'Organizador',
              'Fornecedor'
            ]}
            value={roleNames[profile]}
            onChange={handleProfileChange}
          />
        )}

        <form noValidate onSubmit={handleSubmit}>

          {!login && (
            <>
              <Field
                label="Nome completo"
                name="name"
                id="name"
                autoComplete="name"
                placeholder="João da Silva"
                error={errors.name}
                disabled={busy}
              />

              <Field
                label={
                  profile === 'comprador'
                    ? 'CPF'
                    : 'CPF / CNPJ'
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
            label="E-mail"
            name="email"
            id="email"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            onBlur={handleEmailBlur}
            error={errors.email}
            disabled={busy}
          />

          <Field
            label="Senha"
            name="password"
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={login ? 'current-password' : 'new-password'}
            placeholder="Mínimo de 8 caracteres"
            error={errors.password}
            disabled={busy}
          />

          {!login && (
            <Field
              label="Confirme sua senha"
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
              {submitError}
            </p>
          )}

          <button
            type="submit"
            className={`button ${login ? 'blue-button' : 'dark'}`}
            disabled={busy}
          >
            {busy
              ? 'A processar…'
              : login
                ? 'Entrar na plataforma'
                : 'Cadastrar'}
          </button>

        </form>

        <p className="auth-note">
          Demonstração: utilize dados válidos para testar a gravação na base de dados.
        </p>

        <div className="divider">
          OU EXPLORE SEM CADASTRO
        </div>

        <Link className="button outline full" to="/perfis">
          Escolher perfil de demonstração →
        </Link>

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
        Entrar
      </Link>

      <Link
        className={!login ? 'active' : ''}
        to="/cadastro"
      >
        Criar Conta
      </Link>

    </div>
  );
}

function AccountOptions({login, showPassword, onTogglePassword}) {
  return (
    <div className="form-options">

      <label>
        <input type="checkbox" checked={showPassword} onChange={onTogglePassword}/>
        Mostrar palavra-passe
      </label>

      {login && (
        <Link to="/recuperar">
          Esqueceu-se da sua palavra-passe?
        </Link>
      )}

    </div>
  );
}

export function Profiles() {
  const { chooseRole } = useStore();
  const navigate = useNavigate();

  const descriptions = [
    'Descubra eventos, salve favoritos e simule os seus ingressos.',
    'Crie eventos, conecte fornecedores e consolide custos.',
    'Gerencie o seu catálogo e envie propostas comerciais.',
    'Acompanhe relatórios e faça a moderação de cadastros.'
  ];

  const symbols = ['♧', '⚑', '▣', '◇'];

  function handleRoleSelection(id) {
    chooseRole(id);
    navigate(destinations[id]);
  }

  return (
    <section className="auth-page profile-selection">

      <div className="section-heading">

        <p className="eyebrow purple">
          Uma plataforma, muitas possibilidades
        </p>

        <h1>Como deseja explorar?</h1>

        <p>
          Escolha um perfil para conhecer os fluxos da plataforma.
        </p>

      </div>

      <div className="role-grid">

        {Object.entries(roleNames).map(([id, name], index) => (

          <button
            className="role-card"
            key={id}
            type="button"
            onClick={() => handleRoleSelection(id)}
          >

            <span className="role-symbol">
              {symbols[index] || '◇'}
            </span>

            <h2>{name}</h2>

            <p>
              {descriptions[index] || 'Explore esta área da plataforma.'}
            </p>

            <strong>Aceder à área →</strong>

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

        <h1>Recuperar acesso</h1>

        {done ? (

          <p role="status">
            Solicitação simulada. Nenhum e-mail foi enviado.
          </p>

        ) : (

          <form noValidate onSubmit={handleSubmit}>

            <Field
              label="E-mail da conta"
              name="recover-email"
              id="recover-email"
              type="email"
              autoComplete="email"
              placeholder="exemplo@email.com"
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
              Simular recuperação
            </button>

          </form>

        )}


        <Link className="text-link" to="/entrar">
          Voltar para entrar
        </Link>

      </div>

    </section>
  );
}