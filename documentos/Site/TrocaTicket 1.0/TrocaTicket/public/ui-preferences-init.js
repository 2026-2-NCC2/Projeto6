// Apply only saved settings before React/CSS to prevent a flash of the wrong theme.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('trocaticket-ui-preferences-v1'));
    if (!saved || saved.version !== 1) return;
    var p = saved.preferences || {};
    var root = document.documentElement;
    var theme = ['light', 'dark', 'system'].includes(p.theme) ? p.theme : 'light';
    root.dataset.theme =
      theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    root.dataset.contrast = p.highContrast === true ? 'high' : 'normal';
    if (['pt-BR', 'en', 'es', 'fr', 'de', 'it'].includes(p.language)) root.lang = p.language;
  } catch (_) {}
})();
