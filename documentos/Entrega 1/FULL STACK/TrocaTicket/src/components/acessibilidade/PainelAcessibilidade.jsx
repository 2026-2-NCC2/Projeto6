import React, { useState } from 'react';
import { definirIdioma, t, useIdioma } from '../../i18n';
import {
  alterarPrevia,
  cancelarPrevia,
  iniciarPrevia,
  restaurarPadrao,
  salvarPreferencias,
  usePreferencias,
} from '../../acessibilidade';
import { carregarVLibras, vlibrasPronto } from '../../acessibilidade/vlibras';
import JanelaPreferencias from './JanelaPreferencias';

// Painel de acessibilidade (etapa 8, adaptado de AccessibilityTools.jsx da TrocaTicket 2.0).
// O botão flutuante abre o painel em qualquer página. As escolhas aparecem na hora (prévia) e
// só ficam salvas no navegador com "Salvar preferências"; fechar o painel descarta a prévia.
// O idioma continua no botão de idioma do header (etapa 7).

function SimboloAcessibilidade() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="6.4" r="1.7" fill="currentColor" />
      <path
        d="M6.2 9.3c3.9 1 7.7 1 11.6 0M12 10.4v4.1m0 0-2.6 4.6m2.6-4.6 2.6 4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TEMAS = [
  ['light', '☀', 'Claro'],
  ['dark', '☾', 'Escuro'],
  ['system', '▣', 'Sistema'],
];

export default function PainelAcessibilidade() {
  const { idioma } = useIdioma();
  const { preferencias: p, erroGravacao } = usePreferencias();
  const [aberto, setAberto] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [libras, setLibras] = useState(() => (vlibrasPronto() ? 'pronto' : 'parado'));

  function abrir() {
    iniciarPrevia();
    setSalvo(false);
    setAberto(true);
  }

  function fechar() {
    cancelarPrevia();
    setAberto(false);
  }

  function prever(chave, valor) {
    setSalvo(false);
    alterarPrevia(chave, valor);
  }

  async function ativarLibras() {
    setLibras('carregando');
    try {
      await carregarVLibras();
      setLibras('pronto');
    } catch {
      setLibras('erro');
    }
  }

  const textoLibras = {
    carregando: 'Carregando VLibras…',
    pronto: 'Fechar painel e usar VLibras',
    erro: 'Tentar carregar VLibras novamente',
    parado: 'Ativar VLibras',
  }[libras];

  return (
    <>
      <button
        type="button"
        className="accessibility-launcher"
        aria-haspopup="dialog"
        aria-label={t('Abrir painel de acessibilidade')}
        title={t('Acessibilidade')}
        onClick={abrir}
      >
        <SimboloAcessibilidade />
      </button>
      {aberto && (
        <JanelaPreferencias
          titulo={t('Acessibilidade')}
          className="accessibility-dialog"
          aoFechar={fechar}
        >
          <header className="accessibility-heading">
            <span className="accessibility-symbol" aria-hidden="true">
              <SimboloAcessibilidade />
            </span>
            <div>
              <h2>{t('Acessibilidade')}</h2>
              <p>{t('Ajuste o site ao seu jeito.')}</p>
            </div>
            <button
              type="button"
              className="preferences-close"
              aria-label={t('Fechar janela')}
              onClick={fechar}
            >
              ×
            </button>
            <span className="personalization-tag">{t('PERSONALIZAÇÃO')}</span>
          </header>
          <div className="accessibility-body">
            <section className="reading-options" aria-labelledby="leitura-titulo">
              <h3 id="leitura-titulo">{t('Leitura e visualização')}</h3>
              <div className="accessibility-grid">
                <div
                  className="accessibility-option font-option"
                  role="group"
                  aria-labelledby="tamanho-fonte-titulo"
                >
                  <span className="option-symbol" aria-hidden="true">
                    A+
                  </span>
                  <span id="tamanho-fonte-titulo">{t('Tamanho da fonte')}</span>
                  <div className="font-stepper">
                    <button
                      type="button"
                      aria-label={t('Diminuir fonte')}
                      disabled={p.tamanhoFonte === 100}
                      onClick={() => prever('tamanhoFonte', p.tamanhoFonte - 25)}
                    >
                      −
                    </button>
                    <output aria-live="polite">{p.tamanhoFonte}%</output>
                    <button
                      type="button"
                      aria-label={t('Aumentar fonte')}
                      disabled={p.tamanhoFonte === 200}
                      onClick={() => prever('tamanhoFonte', p.tamanhoFonte + 25)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="accessibility-option"
                  aria-pressed={p.altoContraste}
                  onClick={() => prever('altoContraste', !p.altoContraste)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ◐
                  </span>
                  <span>{t('Alto contraste')}</span>
                  <small>{t(p.altoContraste ? 'Ativado' : 'Desativado')}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  onClick={() => prever('espacoLetras', (p.espacoLetras + 1) % 4)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ↔
                  </span>
                  <span>{t('Espaço entre letras')}</span>
                  <small>{t('Nível {level}', { level: p.espacoLetras })}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  aria-pressed={p.fonteLegivel}
                  onClick={() => prever('fonteLegivel', !p.fonteLegivel)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    Aa
                  </span>
                  <span>{t('Fonte legível')}</span>
                  <small>{t(p.fonteLegivel ? 'Ativado' : 'Desativado')}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  onClick={() => prever('espacoLinhas', (p.espacoLinhas + 1) % 4)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ▤
                  </span>
                  <span>{t('Espaço entre linhas')}</span>
                  <small>{t('Nível {level}', { level: p.espacoLinhas })}</small>
                </button>
                <button
                  type="button"
                  className="accessibility-option"
                  aria-pressed={p.destacarLinks}
                  onClick={() => prever('destacarLinks', !p.destacarLinks)}
                >
                  <span className="option-symbol" aria-hidden="true">
                    ⌁
                  </span>
                  <span>{t('Destacar links')}</span>
                  <small>{t(p.destacarLinks ? 'Ativado' : 'Desativado')}</small>
                </button>
              </div>
            </section>
            <section className="appearance-options" aria-labelledby="aparencia-titulo">
              <h3 id="aparencia-titulo">{t('Aparência')}</h3>
              <p>{t('Escolha como prefere visualizar o site')}</p>
              <div className="theme-options" role="group" aria-labelledby="aparencia-titulo">
                {TEMAS.map(([valor, simbolo, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={p.tema === valor}
                    onClick={() => prever('tema', valor)}
                  >
                    <span aria-hidden="true">{simbolo}</span>
                    {t(rotulo)}
                    <small aria-hidden="true">{p.tema === valor ? '✓' : ''}</small>
                  </button>
                ))}
              </div>
              <p className="preferences-hint">
                {t('Tema e alto contraste são ajustes independentes.')}
              </p>
            </section>
            <section className="assistive-options" aria-labelledby="assistivas-titulo">
              <h3 id="assistivas-titulo">{t('Ferramentas assistivas')}</h3>
              <div className="libras-row">
                <span aria-hidden="true">✋</span>
                <div>
                  <strong>{t('Tradutor para Libras')}</strong>
                  <p>{t('Tradução de português para Libras pelo VLibras.')}</p>
                </div>
              </div>
              {idioma !== 'pt-BR' ? (
                <button
                  type="button"
                  className="button outline"
                  onClick={() => definirIdioma('pt-BR')}
                >
                  {t('Usar português para Libras')}
                </button>
              ) : (
                <button
                  type="button"
                  className="button outline"
                  disabled={libras === 'carregando'}
                  onClick={libras === 'pronto' ? fechar : ativarLibras}
                >
                  {t(textoLibras)}
                </button>
              )}
              {libras === 'carregando' && (
                <p role="status">{t('Carregando ferramenta externa…')}</p>
              )}
              {libras === 'erro' && (
                <p role="alert" className="field-error">
                  {t('Não foi possível carregar o VLibras. Verifique a conexão e tente novamente.')}
                </p>
              )}
              <p className="preferences-hint">
                {t('O tradutor externo precisa de internet e não substitui interpretação humana.')}
              </p>
            </section>
            {erroGravacao && (
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
                  restaurarPadrao();
                  setSalvo(false);
                }}
              >
                {t('Restaurar padrão')}
              </button>
              <button
                type="button"
                className="save-preferences"
                onClick={() => setSalvo(salvarPreferencias())}
              >
                {t('Salvar preferências')}
              </button>
            </div>
            <p className="preferences-hint" role="status">
              {t(
                salvo
                  ? 'Preferências salvas neste navegador.'
                  : 'Confira a prévia e salve para manter as preferências.',
              )}
            </p>
          </div>
        </JanelaPreferencias>
      )}
    </>
  );
}
