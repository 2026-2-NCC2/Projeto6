import { useSyncExternalStore } from 'react';
import publicMessages from './publicMessages.js';
import workspaceMessages from './workspaceMessages.js';
import settingsMessages from './settingsMessages.js';
import integrationMessages from './integrationMessages.js';
import legacyFlowMessages from './legacyFlowMessages.js';
import mvpMessages from '../mvp/texts.js';
import personalizationMessages from './personalizationMessages.js';
import { readPreferences } from '../accessibility/preferences.js';

const resources = {};
for (const language of ['en', 'es', 'fr', 'de', 'it'])
  resources[language] = {
    ...publicMessages[language],
    ...workspaceMessages[language],
    ...settingsMessages[language],
    ...integrationMessages[language],
    ...legacyFlowMessages[language],
    ...mvpMessages[language],
    ...personalizationMessages[language],
  };
let locale = 'pt-BR';
try {
  if (typeof window !== 'undefined') locale = readPreferences(window.localStorage).language;
} catch {}
const listeners = new Set();
export const getLocale = () => locale;
export function setLocale(next) {
  if (next === locale) return;
  locale = next;
  listeners.forEach((listener) => listener());
}
export function translate(source, values = {}) {
  if (typeof source !== 'string') return source;
  const message = locale === 'pt-BR' ? source : (resources[locale]?.[source] ?? source);
  return message.replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLocale, () => 'pt-BR');
  return { t: translate, locale: language };
}
export { resources };
