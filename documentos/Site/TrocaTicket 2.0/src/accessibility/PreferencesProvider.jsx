import { useEffect, useLayoutEffect, useState } from 'react';
import { PreferencesContext } from './PreferencesContext';
import {
  applyPreferences,
  defaults,
  readPreferences,
  sanitizePreferences,
  STORAGE_KEY,
  writePreferences,
} from './preferences';
import { setLocale } from '../i18n';
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export default function PreferencesProvider({ children }) {
  const [saved, setSaved] = useState(() => readPreferences(storage()));
  const [draft, setDraft] = useState(null);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [storageError, setStorageError] = useState(false);
  const preferences = draft || saved;
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const change = (event) => setSystemDark(event.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useLayoutEffect(() => {
    applyPreferences(preferences, document.documentElement, systemDark);
    setLocale(preferences.language);
  }, [preferences, systemDark]);
  useEffect(() => {
    const changed = (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (event.storageArea && event.storageArea !== storage()) return;
      setSaved(readPreferences({ getItem: () => (event.key === null ? null : event.newValue) }));
      // Uma alteração de outra aba atualiza o salvo sem descartar a prévia em edição.
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  function beginPreview() {
    setDraft({ ...saved });
  }
  function preview(key, value) {
    setDraft((current) => sanitizePreferences({ ...(current || saved), [key]: value }));
  }
  function cancelPreview() {
    setDraft(null);
  }
  function save() {
    const next = sanitizePreferences(draft || saved);
    const ok = writePreferences(storage(), next);
    setStorageError(!ok);
    setSaved(next);
    setDraft(null);
    return ok;
  }
  function changeLanguage(language) {
    const next = sanitizePreferences({ ...saved, language });
    const ok = writePreferences(storage(), next);
    // Even if storage is blocked, language remains usable during this session.
    setSaved(next);
    setStorageError(!ok);
    return ok;
  }
  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        storageError,
        beginPreview,
        preview,
        cancelPreview,
        save,
        changeLanguage,
        reset: () => setDraft({ ...defaults }),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
