export const STORAGE_KEY = 'trocaticket-ui-preferences-v1';
export const languages = [
  { code: 'pt-BR', name: 'Português (Brasil)', short: 'PT', flag: '🇧🇷' },
  { code: 'en', name: 'English', short: 'EN', flag: '🇺🇸' },
  { code: 'es', name: 'Español', short: 'ES', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', short: 'FR', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', short: 'DE', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', short: 'IT', flag: '🇮🇹' },
];
export const defaults = Object.freeze({
  language: 'pt-BR',
  theme: 'light',
  fontSize: 100,
  highContrast: false,
  letterSpacing: 0,
  readableFont: false,
  lineSpacing: 0,
  highlightLinks: false,
});
export function sanitizePreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = { ...defaults };
  if (languages.some((item) => item.code === source.language)) result.language = source.language;
  if (['light', 'dark', 'system'].includes(source.theme)) result.theme = source.theme;
  if ([100, 125, 150, 175, 200].includes(source.fontSize)) result.fontSize = source.fontSize;
  for (const key of ['letterSpacing', 'lineSpacing'])
    if ([0, 1, 2, 3].includes(source[key])) result[key] = source[key];
  for (const key of ['highContrast', 'readableFont', 'highlightLinks'])
    if (typeof source[key] === 'boolean') result[key] = source[key];
  return result;
}
export function readPreferences(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY));
    return saved?.version === 1 ? sanitizePreferences(saved.preferences) : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
export function writePreferences(storage, preferences) {
  try {
    if (!storage) return false;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, preferences: sanitizePreferences(preferences) }),
    );
    return true;
  } catch {
    return false;
  }
}
export function resolveTheme(theme, systemDark) {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}
export function applyPreferences(preferences, root, systemDark) {
  root.lang = preferences.language;
  root.dataset.theme = resolveTheme(preferences.theme, systemDark);
  root.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
  root.dataset.readable = String(preferences.readableFont);
  root.dataset.links = String(preferences.highlightLinks);
  root.dataset.fontSize = String(preferences.fontSize);
  root.dataset.letterSpacing = String(preferences.letterSpacing);
  root.dataset.lineSpacing = String(preferences.lineSpacing);
  root.style.fontSize = `${preferences.fontSize}%`;
  root.style.setProperty(
    '--reading-letter-spacing',
    ['0', '.04em', '.08em', '.12em'][preferences.letterSpacing],
  );
  root.style.setProperty(
    '--reading-line-height',
    ['normal', '1.5', '1.75', '2'][preferences.lineSpacing],
  );
}
