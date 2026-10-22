import React, { createContext, useContext, useEffect, useState } from 'react';
import { initialEvents, initialInventory, initialProposals, initialPeople } from '../data/demo';
const Context = createContext(null);
const defaults = {
  events: initialEvents,
  inventory: initialInventory,
  proposals: initialProposals,
  people: initialPeople,
  favorites: [],
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
  // Perfil do administrador. Campos pensados para mapear colunas de uma tabela de usuários.
  adminProfile: {
    name: 'Carlos Eduardo Mendes',
    role: 'admin',
    email: 'carlos.mendes@organizadoreventos.com.br',
    emailVerified: true,
    phone: '(11) 98452-1100',
    cpf: '123.456.789-00',
    timezone: 'America/Sao_Paulo',
    twoFactor: true,
    photo: '',
    passwordChangedAt: Date.now() - 45 * 86400000,
    syncedAt: Date.now(),
  },
};
function read() {
  try {
    const saved = JSON.parse(localStorage.getItem('trocaticket-v2'));
    if (saved?.version !== 2) return defaults;
    const merged = { ...defaults, ...saved.data };
    // Cadastros salvos no formato antigo (sem username) são substituídos pela nova fila de demonstração.
    if (!merged.people.every((p) => p.username)) merged.people = initialPeople;
    // Eventos de demonstração novos entram sem apagar os que a pessoa já criou ou editou.
    const known = new Set(merged.events.map((e) => e.id));
    merged.events = [...merged.events, ...initialEvents.filter((e) => !known.has(e.id))];
    return merged;
  } catch {
    return defaults;
  }
}
export function StoreProvider({ children }) {
  const [data, setData] = useState(read);
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
      localStorage.setItem('trocaticket-v2', JSON.stringify({ version: 2, data }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  function chooseRole(value) {
    setRole(value);
    try {
      sessionStorage.setItem('trocaticket-role', value);
    } catch {}
  }
  function update(key, value) {
    setData((old) => ({ ...old, [key]: typeof value === 'function' ? value(old[key]) : value }));
  }
  function toggleFavorite(id) {
    update('favorites', (old) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
  }
  return (
    <Context.Provider value={{ data, update, role, chooseRole, notify: setToast, toggleFavorite }}>
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
