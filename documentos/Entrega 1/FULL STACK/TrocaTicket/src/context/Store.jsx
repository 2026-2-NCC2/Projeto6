import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initialEvents, initialPeople } from '../data/demo';
import { initialSupplierProfile, supplierInventory, supplierProposals } from '../data/supplier';
import { getFavoriteEvents, setFavoriteEvent } from '../services/events';
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
      setData(readStorage(STORAGE_KEY));
    }
  }
  function activateUser(user) {
    setRole(user.role || '');
    setAccountId(user.id || null);
    if (!user.id) {
      setData(readStorage(STORAGE_KEY));
      return;
    }
    const saved = readStorage(accountStorageKey(user.id), accountDefaults);
    setData(accountData(saved, user));
  }
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
    <Context.Provider value={{ data, update, role, isAuthenticated, chooseRole, activateUser, notify: setToast, toggleFavorite }}>
      {children}
      {storageError && (
        <div className="storage-warning" role="alert">
          Não foi possível salvar no navegador. As alterações desta sessão podem se perder ao
          recarregar.
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
