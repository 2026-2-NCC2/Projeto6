import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useStore } from '../context/Store';
import { PERFIS, inicioDoPerfil, nomeDoPerfil, roleNames } from '../data/perfis';
import { t } from '../i18n';

const ICONES = {
  comprador: '♧',
  organizador: '⚑',
  fornecedor: '▣',
  admin: '◇',
};

/**
 * Troca rápida de perfil do modo demonstração. Aparece só quando não há conta
 * autenticada; a troca passa por trocarPerfilDemo, que recusa contas reais e perfis
 * desconhecidos. Funciona sem banco: usa apenas os dados de demonstração do navegador.
 */
export default function DemoSwitcher({ perfilAtual }) {
  const { trocarPerfilDemo, chooseRole } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const botao = useRef(null);
  const idPainel = useId();

  useEffect(() => setAberto(false), [pathname]);

  useEffect(() => {
    if (!aberto) return undefined;
    function foraDaCaixa(event) {
      if (!caixa.current?.contains(event.target)) setAberto(false);
    }
    function teclado(event) {
      if (event.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    }
    document.addEventListener('pointerdown', foraDaCaixa);
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('pointerdown', foraDaCaixa);
      document.removeEventListener('keydown', teclado);
    };
  }, [aberto]);

  function escolher(perfil) {
    setAberto(false);
    if (perfil === perfilAtual) {
      navigate(inicioDoPerfil(perfil));
      return;
    }
    if (trocarPerfilDemo(perfil)) navigate(inicioDoPerfil(perfil));
  }

  function sairDaDemonstracao() {
    setAberto(false);
    chooseRole('');
    navigate('/');
  }

  const nomeAtual = t(nomeDoPerfil(perfilAtual));

  return (
    <div className="demo-switcher" ref={caixa}>
      <button
        ref={botao}
        type="button"
        className="demo-switcher-toggle"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={t('Demo {nomeAtual}, trocar perfil da demonstração', { nomeAtual: nomeAtual })}
        title={t('Trocar perfil da demonstração')}
        onClick={() => setAberto((valor) => !valor)}
      >
        <i className="demo-dot" aria-hidden="true" />
        <span className="demo-switcher-text" aria-hidden="true">
          {t('Demo')}
          <b>{nomeAtual}</b>
        </span>
        <span className="demo-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {aberto && (
        <div className="demo-switcher-panel" id={idPainel}>
          <p className="demo-switcher-title">
            {t('Modo demonstração')}
            <small>{t('Dados fictícios, salvos só neste navegador.')}</small>
          </p>
          <ul aria-label={t('Perfis da demonstração')}>
            {PERFIS.map((perfil) => {
              const atual = perfil === perfilAtual;
              return (
                <li key={perfil}>
                  <button
                    type="button"
                    className={`demo-option ${perfil}`}
                    aria-current={atual ? 'true' : undefined}
                    onClick={() => escolher(perfil)}
                  >
                    <span className="demo-option-icon" aria-hidden="true">
                      {ICONES[perfil]}
                    </span>
                    <span>{t(roleNames[perfil])}</span>
                    {atual && <small>{t('atual')}</small>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="demo-switcher-foot">
            <Link to="/perfis" onClick={() => setAberto(false)}>
              {t('Ver perfis')}
            </Link>
            <button type="button" onClick={sairDaDemonstracao}>
              {t('Sair da demonstração')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
