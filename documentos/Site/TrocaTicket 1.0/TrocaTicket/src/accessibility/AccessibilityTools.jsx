import { useState } from 'react';
import { useI18n } from '../i18n';
import { usePreferences } from './PreferencesContext';
import { languages } from './preferences';
import PreferenceDialog from './PreferenceDialog';
import { loadVLibras } from './vlibras';

export default function AccessibilityTools() {
  const { t } = useI18n();
  const {
    preferences: p,
    beginPreview,
    preview: updatePreview,
    cancelPreview,
    reset,
    save,
    changeLanguage,
    storageError,
  } = usePreferences();
  const [open, setOpen] = useState('');
  const [savedMessage, setSavedMessage] = useState(false);
  const [libras, setLibras] = useState('idle');
  function preview(key, value) {
    setSavedMessage(false);
    updatePreview(key, value);
  }
  const current = languages.find((item) => item.code === p.language);
  function close() {
    if (open === 'accessibility') cancelPreview();
    setOpen('');
  }
  function accessibility() {
    beginPreview();
    setSavedMessage(false);
    setOpen('accessibility');
  }
  async function activateLibras() {
    setLibras('loading');
    try {
      await loadVLibras();
      setLibras('ready');
    } catch {
      setLibras('error');
    }
  }
  function useLibras() {
    changeLanguage('pt-BR');
    close();
  }
  function cycle(key) {
    preview(key, (p[key] + 1) % 4);
    setSavedMessage(false);
  }
  return (
    <>
      <div className="ui-tools">
        <button
          type="button"
          className="language-trigger"
          aria-haspopup="dialog"
          onClick={() => setOpen('language')}
          aria-label={t('Idioma do site')}
        >
          {current.short}
          <span aria-hidden="true">⌄</span>
        </button>
        <button
          type="button"
          className="accessibility-trigger"
          aria-haspopup="dialog"
          onClick={accessibility}
          aria-label={t('Abrir painel de acessibilidade')}
        >
          ✳
        </button>
      </div>
      <button
        type="button"
        className="accessibility-launcher"
        onClick={accessibility}
        aria-haspopup="dialog"
        aria-label={t('Abrir painel de acessibilidade')}
      >
        ✳
      </button>
      {open === 'language' && (
        <PreferenceDialog title={t('Idioma do site')} className="language-dialog" onClose={close}>
          <div className="preferences-heading">
            <div>
              <h2>{t('Idioma do site')}</h2>
              <p>{t('Escolha como prefere navegar')}</p>
            </div>
            <button
              type="button"
              className="preferences-close"
              aria-label={t('Fechar janela')}
              onClick={close}
            >
              ×
            </button>
          </div>
          <div className="language-options" role="group" aria-label={t('Idioma do site')}>
            {languages.map((item) => (
              <button
                type="button"
                key={item.code}
                lang={item.code}
                aria-pressed={p.language === item.code}
                onClick={() => {
                  changeLanguage(item.code);
                  setOpen('');
                }}
              >
                <span aria-hidden="true">{item.flag}</span>
                {item.name}
                <span aria-hidden="true">{p.language === item.code ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <p className="preferences-hint">{t('O idioma é salvo neste navegador.')}</p>
        </PreferenceDialog>
      )}
      {open === 'accessibility' && (
        <PreferenceDialog
          title={t('Acessibilidade')}
          className="accessibility-dialog"
          onClose={close}
        >
          <header className="accessibility-heading">
            <span className="accessibility-symbol" aria-hidden="true">
              ✳
            </span>
            <div>
              <h2>{t('Acessibilidade')}</h2>
              <p>{t('Ajuste o site ao seu jeito.')}</p>
            </div>
            <button
              className="preferences-close"
              type="button"
              aria-label={t('Fechar janela')}
              onClick={close}
            >
              ×
            </button>
            <span className="personalization-tag">{t('PERSONALIZAÇÃO')}</span>
          </header>
          <div className="accessibility-body">
            <section className="reading-options" aria-labelledby="reading-title">
              <h3 id="reading-title">{t('Leitura e visualização')}</h3>
              <div className="accessibility-grid">
                <div className="accessibility-option font-option">
                  <span className="option-symbol" aria-hidden="true">
                    A+
                  </span>
                  <label htmlFor="ui-font-size">{t('Tamanho da fonte')}</label>
                  <div className="font-stepper">
                    <button
                      type="button"
                      aria-label={t('Diminuir fonte')}
                      disabled={p.fontSize === 100}
                      onClick={() => preview('fontSize', p.fontSize - 25)}
                    >
                      −
                    </button>
                    <output id="ui-font-size" aria-live="polite">
                      {p.fontSize}%
                    </output>
                    <button
                      type="button"
                      aria-label={t('Aumentar fonte')}
                      disabled={p.fontSize === 200}
                      onClick={() => preview('fontSize', p.fontSize + 25)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="accessibility-option"
                  aria-pressed={p.highContrast}
                  onClick={() => preview('highContrast', !p.highContrast)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ◐
                  </span>
                  <span>{t('Alto contraste')}</span>
                  <small>{t(p.highContrast ? 'Ativado' : 'Desativado')}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  onClick={() => cycle('letterSpacing')}
                  aria-label={t('Espaço entre letras: nível {level}', { level: p.letterSpacing })}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ↔
                  </span>
                  <span>{t('Espaço entre letras')}</span>
                  <small>{t('Nível {level}', { level: p.letterSpacing })}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  aria-pressed={p.readableFont}
                  onClick={() => preview('readableFont', !p.readableFont)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    Aa
                  </span>
                  <span>{t('Fonte legível')}</span>
                  <small>{t(p.readableFont ? 'Ativado' : 'Desativado')}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  onClick={() => cycle('lineSpacing')}
                  aria-label={t('Espaço entre linhas: nível {level}', { level: p.lineSpacing })}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ▤
                  </span>
                  <span>{t('Espaço entre linhas')}</span>
                  <small>{t('Nível {level}', { level: p.lineSpacing })}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  aria-pressed={p.highlightLinks}
                  onClick={() => preview('highlightLinks', !p.highlightLinks)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ⌁
                  </span>
                  <span>{t('Destacar links')}</span>
                  <small>{t(p.highlightLinks ? 'Ativado' : 'Desativado')}</small>
                </button>
              </div>
            </section>
            <section className="appearance-options" aria-labelledby="appearance-title">
              <h3 id="appearance-title">{t('Aparência')}</h3>
              <p>{t('Escolha como prefere visualizar o site')}</p>
              <div className="theme-options" role="group" aria-label={t('Aparência')}>
                {[
                  ['light', '☀', 'Claro'],
                  ['dark', '☾', 'Escuro'],
                  ['system', '▣', 'Sistema'],
                ].map(([value, icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={p.theme === value}
                    onClick={() => preview('theme', value)}
                  >
                    <span aria-hidden="true">{icon}</span>
                    {t(label)}
                    <small aria-hidden="true">{p.theme === value ? '✓' : ''}</small>
                  </button>
                ))}
              </div>
              <p className="preferences-hint">
                {t('Tema e alto contraste são ajustes independentes.')}
              </p>
            </section>
            <section className="assistive-options" aria-labelledby="assistive-title">
              <h3 id="assistive-title">{t('Ferramentas assistivas')}</h3>
              <div className="libras-row">
                <span aria-hidden="true">✋</span>
                <div>
                  <strong>{t('Tradutor para Libras')}</strong>
                  <p>{t('Tradução de português para Libras pelo VLibras.')}</p>
                </div>
              </div>
              {p.language !== 'pt-BR' ? (
                <button
                  type="button"
                  className="button outline"
                  onClick={() => {
                    preview('language', 'pt-BR');
                  }}
                >
                  {t('Usar português para Libras')}
                </button>
              ) : (
                <button
                  type="button"
                  className="button outline"
                  disabled={libras === 'loading'}
                  onClick={libras === 'ready' ? useLibras : activateLibras}
                >
                  {t(
                    libras === 'loading'
                      ? 'Carregando VLibras…'
                      : libras === 'ready'
                        ? 'Fechar painel e usar VLibras'
                        : libras === 'error'
                          ? 'Tentar carregar VLibras novamente'
                          : 'Ativar VLibras',
                  )}
                </button>
              )}
              {libras === 'loading' && <p role="status">{t('Carregando ferramenta externa…')}</p>}
              {libras === 'error' && (
                <p role="alert" className="field-error">
                  {t('Não foi possível carregar o VLibras. Verifique a conexão e tente novamente.')}
                </p>
              )}
              <p className="preferences-hint">
                {t('O tradutor externo precisa de internet e não substitui interpretação humana.')}
              </p>
            </section>
            {storageError && (
              <p role="alert" className="field-error">
                {t(
                  'O navegador não permitiu salvar. As mudanças continuam disponíveis nesta sessão.',
                )}
              </p>
            )}
            <div className="preferences-actions">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setSavedMessage(false);
                }}
              >
                {t('Restaurar padrão')}
              </button>
              <button
                type="button"
                className="save-preferences"
                onClick={() => {
                  setSavedMessage(save());
                }}
              >
                {t('Salvar preferências')}
              </button>
            </div>
            <p className="preferences-hint" role="status">
              {t(
                savedMessage
                  ? 'Preferências salvas neste navegador.'
                  : 'Confira a prévia e salve para manter as preferências.',
              )}
            </p>
          </div>
        </PreferenceDialog>
      )}
      {storageError && open !== 'accessibility' && (
        <p className="ui-storage-warning" role="alert">
          {t('O navegador não permitiu salvar. As mudanças continuam disponíveis nesta sessão.')}
        </p>
      )}
    </>
  );
}
