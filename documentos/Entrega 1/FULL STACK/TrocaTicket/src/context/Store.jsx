import React, {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { initialEvents, initialPeople } from '../data/demo';
import { normalizarPerfil, podeTrocarPerfilDemo } from '../data/perfis';
import { initialSupplierProfile, supplierInventory, supplierProposals } from '../data/supplier';
import { getFavoriteEvents, setFavoriteEvent } from '../services/events';
import {
  EVENTO_SESSAO_EXPIRADA,
  buscarSessao,
  guardarCsrf,
  esquecerMarcaDeSessao,
  limparSessaoLocal,
  podeTerSessao,
} from '../services/api';
import { t, useIdioma } from '../i18n';
const Context = createContext(null);
const STORAGE_KEY = 'trocaticket-v2';
const defaults = {
  events: initialEvents,
  inventory: supplierInventory,
  proposals: supplierProposals,
  people: initialPeople,
  favorites: [],
  reviews: {},
  tickets: [],
  messages: [],
  profile: {
    name: 'Carlos Eduardo Mendes',
    email: 'carlos@example.com',
    phone: '(11) 98452-1100',
    organizationName: '',
    cnpj: '',
    preferences: [true, true, true, false],
  },
  supplierProfile: initialSupplierProfile,
};
const accountDefaults = {
  ...defaults,
  events: [],
  inventory: [],
  proposals: [],
  people: [],
  favorites: [],
  reviews: {},
  tickets: [],
  messages: [],
  profile: {
    name: '',
    email: '',
    phone: '',
    organizationName: '',
    cnpj: '',
    preferences: [],
  },
  supplierProfile: {
    ...initialSupplierProfile,
    name: '',
    email: '',
    phone: '',
    legalName: '',
    tradeName: '',
    document: '',
    category: '',
    website: '',
    description: '',
    address: { zip: '', street: '', number: '', complement: '', district: '', city: '', state: '' },
    twoFactor: false,
    notifications: { email: false, whatsapp: false, quotes: false, contracts: false },
  },
};
function readStorage(key, fallback = defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved?.version === 2 ? { ...fallback, ...saved.data } : fallback;
  } catch {
    return fallback;
  }
}
function sessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem('trocaticket-user') || 'null');
  } catch {
    return null;
  }
}
function accountStorageKey(userId) {
  return `${STORAGE_KEY}:user:${userId}`;
}
function read() {
  const user = sessionUser();
  if (!user?.id) return readStorage(STORAGE_KEY);
  const saved = readStorage(accountStorageKey(user.id), accountDefaults);
  return accountData(saved, user);
}
function accountData(saved, user) {
  return {
    ...accountDefaults,
    ...saved,
    events: (saved.events || []).filter((event) => /^\d+$/.test(String(event.id))),
    inventory: (saved.inventory || []).filter((item) => /^\d+$/.test(String(item.id))),
    proposals: (saved.proposals || []).filter((proposal) =>
      /^\d+$/.test(String(proposal.id)) && /^\d+$/.test(String(proposal.eventId)),
    ),
    favorites: (saved.favorites || []).filter((id) => /^\d+$/.test(String(id))),
    reviews: Object.fromEntries(
      Object.entries(saved.reviews || {}).filter(([eventId]) => /^\d+$/.test(eventId)),
    ),
    people: [],
    tickets: [],
    messages: [],
    profile: { ...accountDefaults.profile, ...user, photo: user.photo || '' },
    supplierProfile: user.role === 'fornecedor'
      ? {
          ...accountDefaults.supplierProfile,
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          tradeName: user.name || '',
          photo: user.photo || '',
        }
      : accountDefaults.supplierProfile,
  };
}
export function StoreProvider({ children }) {
  useIdioma(); // o aviso e a faixa de armazenamento acompanham o idioma
  const [data, setData] = useState(() => {
    return read();
  });
  const [accountId, setAccountId] = useState(() => sessionUser()?.id || null);
  const isAuthenticated = Number.isSafeInteger(Number(accountId)) && Number(accountId) > 0;
  const [role, setRole] = useState(() => {
    try {
      return sessionStorage.getItem('trocaticket-role') || '';
    } catch {
      return '';
    }
  });
  // Situação da conta na aprovação da administração (etapa 6): A, P ou R. Vazio sem conta.
  const [aprovacao, setAprovacao] = useState(() => sessionUser()?.aprovacao || '');
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const key = accountId ? accountStorageKey(accountId) : STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify({ version: 2, data }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [accountId, data]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  function chooseRole(value) {
    setRole(value);
    try {
      sessionStorage.setItem('trocaticket-role', value);
      if (!value) {
        sessionStorage.removeItem('trocaticket-user');
      }
    } catch {}
    if (!sessionUser()?.id) {
      setAccountId(null);
      setAprovacao('');
      setData(readStorage(STORAGE_KEY));
    }
  }
  // Troca de perfil do modo demonstração. Só vale sem conta autenticada e só para os
  // perfis conhecidos; não mexe em permissões reais (quem decide é o servidor).
  function trocarPerfilDemo(perfil) {
    const destino = normalizarPerfil(perfil);
    const autenticado = isAuthenticated || Boolean(sessionUser()?.id);
    if (!podeTrocarPerfilDemo({ autenticado, destino })) return false;
    chooseRole(destino);
    return true;
  }
  function activateUser(user) {
    setRole(user.role || '');
    setAccountId(user.id || null);
    setAprovacao(user.aprovacao || '');
    if (!user.id) {
      setData(readStorage(STORAGE_KEY));
      return;
    }
    const saved = readStorage(accountStorageKey(user.id), accountDefaults);
    setData(accountData(saved, user));
  }
  // O servidor é quem sabe se a sessão vale. Ao abrir o site, confere o cookie de sessão:
  // restaura a conta numa aba nova, troca para a conta certa ou encerra a sessão local vencida.
  const navigate = useNavigate();
  // Guarda a nova situação da conta também na aba (sessionStorage), para sobreviver ao recarregar.
  const atualizarAprovacao = useCallback((valor) => {
    setAprovacao(valor || '');
    try {
      const usuario = JSON.parse(sessionStorage.getItem('trocaticket-user') || 'null');
      if (usuario?.id) {
        sessionStorage.setItem('trocaticket-user', JSON.stringify({ ...usuario, aprovacao: valor }));
      }
    } catch {}
  }, []);
  const encerrarLocalmente = useCallback((mensagem) => {
    limparSessaoLocal();
    setRole('');
    setAccountId(null);
    setAprovacao('');
    setData(readStorage(STORAGE_KEY));
    if (mensagem) setToast(mensagem);
  }, []);
  useEffect(() => {
    // Visitante e modo demonstração não dependem do servidor: só consulta a sessão
    // quando este navegador já fez login.
    if (!podeTerSessao()) return undefined;
    const controller = new AbortController();
    buscarSessao(controller.signal)
      .then(({ user, csrfToken }) => {
        const local = sessionUser();
        if (!user) {
          if (local?.id) encerrarLocalmente('Sua sessão terminou. Entre novamente.');
          else esquecerMarcaDeSessao();
          return;
        }
        guardarCsrf(csrfToken);
        let papelAtual = '';
        try {
          papelAtual = sessionStorage.getItem('trocaticket-role') || '';
        } catch {}
        const abaNova = !local?.id && !papelAtual;
        if (Number(local?.id) === Number(user.id)) {
          // Mesma conta: só atualiza a situação da aprovação, que a administração pode ter mudado.
          if (user.aprovacao && local.aprovacao !== user.aprovacao) atualizarAprovacao(user.aprovacao);
          return;
        }
        if (!abaNova && !local?.id) return;
        const usuario = {
          id: user.id,
          name: user.nome || 'Usuário',
          email: user.email,
          photo: user.foto || '',
          role: user.role,
          tipo_perfil: user.tipo_perfil,
          aprovacao: user.aprovacao || '',
        };
        try {
          sessionStorage.setItem('trocaticket-user', JSON.stringify(usuario));
          sessionStorage.setItem('trocaticket-role', usuario.role);
        } catch {}
        activateUser(usuario);
      })
      .catch(() => {});
    return () => controller.abort();
    // Só na abertura do site; as mudanças seguintes passam por login/logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    function aoExpirar() {
      // Limpeza e navegação na mesma transição: assim o Layout já vê /entrar com a conta
      // encerrada e não redireciona a página interna antiga para a escolha de perfil.
      startTransition(() => {
        encerrarLocalmente('Sua sessão terminou. Entre novamente.');
        navigate('/entrar', { replace: true });
      });
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, [encerrarLocalmente, navigate]);
  const update = useCallback((key, value) => {
    setData((old) => ({ ...old, [key]: typeof value === 'function' ? value(old[key]) : value }));
  }, []);
  useEffect(() => {
    if (role !== 'comprador' || !accountId) return undefined;
    const controller = new AbortController();
    getFavoriteEvents(accountId, controller.signal)
      .then((ids) => {
        update('favorites', (current) => [
          ...current.filter((id) => !/^\d+$/.test(String(id))),
          ...ids,
        ]);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setToast(error.message);
      });
    return () => controller.abort();
  }, [accountId, role, update]);
  function toggleFavorite(id) {
    const wasSaved = data.favorites.some((favoriteId) => String(favoriteId) === String(id));
    const saved = !wasSaved;
    update('favorites', (old) =>
      saved
        ? [...old.filter((favoriteId) => String(favoriteId) !== String(id)), id]
        : old.filter((favoriteId) => String(favoriteId) !== String(id)),
    );
    const userId = Number(data.profile?.id);
    if (role === 'comprador' && Number.isSafeInteger(userId) && userId > 0 && /^\d+$/.test(String(id))) {
      setFavoriteEvent(userId, id, saved).catch((error) => {
        update('favorites', (old) =>
          saved
            ? old.filter((favoriteId) => String(favoriteId) !== String(id))
            : [...old, id],
        );
        setToast(error.message);
      });
    }
  }
  return (
    <Context.Provider value={{
        data,
        update,
        role,
        isAuthenticated,
        aprovacao: isAuthenticated ? aprovacao : '',
        atualizarAprovacao,
        chooseRole,
        trocarPerfilDemo,
        activateUser,
        notify: setToast,
        toggleFavorite,
      }}>
      {children}
      {storageError && (
        <div className="storage-warning" role="alert">
          {t('Não foi possível salvar no navegador. As alterações desta sessão podem se perder ao recarregar.')}
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {t(toast)}
          <button aria-label={t('Fechar aviso')} onClick={() => setToast('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
