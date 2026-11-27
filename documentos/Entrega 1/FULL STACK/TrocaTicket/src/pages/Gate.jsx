import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Empty, PageTitle, Panel } from '../components/UI';
import { useStore } from '../context/Store';
import { criarChave } from '../services/orders';
import {
  horaBrasilia,
  listarEventosPortaria,
  resumoPortaria,
  validarEntrada,
} from '../services/portaria';
import { t } from '../i18n';

// Portaria simulada do organizador (etapa 5): valida o código mostrado em Meus ingressos.
// Cada ingresso entra uma vez só; o resultado e as últimas entradas aparecem na hora.
function Portaria() {
  const [eventos, setEventos] = useState(null);
  const [erroEventos, setErroEventos] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const chave = useRef(null);
  const campoCodigo = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    listarEventosPortaria(controller.signal)
      .then((lista) => {
        setEventos(lista);
        const aberto = lista.find((evento) => evento.open);
        if (aberto) setEventoId(String(aberto.id));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErroEventos(error.message);
      });
    return () => controller.abort();
  }, []);

  const carregarResumo = useCallback((id, signal) => {
    if (!id) {
      setResumo(null);
      return;
    }
    resumoPortaria(id, signal)
      .then(setResumo)
      .catch(() => {
        if (!signal?.aborted) setResumo(null);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    carregarResumo(eventoId, controller.signal);
    return () => controller.abort();
  }, [eventoId, carregarResumo]);

  async function validar(event) {
    event.preventDefault();
    if (ocupado) return;
    if (!chave.current) chave.current = criarChave();
    setOcupado(true);
    setResultado(null);
    try {
      const entrada = await validarEntrada(Number(eventoId), codigo.trim(), chave.current);
      chave.current = null;
      setResultado({ ok: true, ...entrada });
      setCodigo('');
      carregarResumo(eventoId);
    } catch (error) {
      // Sem resposta da API, a leitura pode ter sido registrada: repetir usa a mesma chave.
      if (!error.semResposta) chave.current = null;
      setResultado({ ok: false, message: error.message });
    } finally {
      setOcupado(false);
      campoCodigo.current?.focus();
    }
  }

  if (erroEventos) {
    return (
      <p role="alert" className="api-error">
        {erroEventos}
      </p>
    );
  }
  if (!eventos) return <p role="status">{t('Carregando seus eventos…')}</p>;
  if (!eventos.length) {
    return (
      <Empty title={t('Você ainda não tem eventos')} heading="h2">
        {t('Crie e publique um evento para abrir a portaria.')}{' '}
        <Link to="/organizador/novo">{t('Novo evento')}</Link>
      </Empty>
    );
  }
  const evento = eventos.find((item) => String(item.id) === eventoId);

  return (
    <div className="gate-layout">
      <Panel title={t('Validar entrada')}>
        <form className="gate-form" onSubmit={validar}>
          <label htmlFor="gate-evento">{t('Evento')}</label>
          <select
            id="gate-evento"
            value={eventoId}
            required
            onChange={(e) => {
              setEventoId(e.target.value);
              setResultado(null);
            }}
          >
            <option value="">{t('Selecione um evento')}</option>
            {eventos.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.open}>
                {item.title} · {item.startDate}
                {item.open ? '' : t(' (portaria fechada)')}
              </option>
            ))}
          </select>
          <label htmlFor="gate-codigo">{t('Código do ingresso')}</label>
          <input
            id="gate-codigo"
            ref={campoCodigo}
            value={codigo}
            required
            maxLength={100}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={t('TT-…')}
            onChange={(e) => {
              setCodigo(e.target.value);
              setResultado(null);
            }}
          />
          <p className="muted">
            {t(
              'O código está em Meus ingressos, na conta de quem vai entrar. Ele muda a cada revenda, transferência ou troca. Simulação acadêmica: sem câmera e sem leitura offline.',
            )}
          </p>
          <button
            type="submit"
            className="button primary"
            disabled={ocupado || !eventoId || !evento?.open}
          >
            {ocupado ? t('Validando…') : t('Validar entrada')}
          </button>
        </form>
        {resultado?.ok && (
          <div className="gate-result ok" role="status">
            <strong>{t('Entrada liberada')}</strong>
            <p>
              {resultado.holderName} · {resultado.type} {t('· ingresso nº')} {resultado.ticketId}
            </p>
            <small>
              {t('Registrada às')} {horaBrasilia(resultado.enteredAt)}
              {t('. Uma segunda leitura será recusada.')}
            </small>
          </div>
        )}
        {resultado && !resultado.ok && (
          <div className="gate-result erro" role="alert">
            <strong>{t('Entrada recusada')}</strong>
            <p>{resultado.message}</p>
          </div>
        )}
      </Panel>
      <Panel title={t('Entradas do evento')}>
        {!evento ? (
          <p>{t('Selecione um evento para ver as entradas.')}</p>
        ) : !resumo ? (
          <p role="status">{t('Carregando entradas…')}</p>
        ) : (
          <>
            <p className="gate-count">
              <strong>{resumo.entered}</strong> {resumo.entered === 1 ? 'entrada' : 'entradas'} ·{' '}
              {resumo.waiting}{' '}
              {resumo.waiting === 1
                ? t('ingresso ainda não utilizado')
                : t('ingressos ainda não utilizados')}
            </p>
            {resumo.lastEntries.length ? (
              <ul className="resale-list" aria-label={t('Últimas entradas')}>
                {resumo.lastEntries.map((entrada) => (
                  <li key={entrada.ticketId} className="resale-item">
                    <span className="resale-item-text">
                      <strong>{entrada.holderName}</strong>
                      <small>
                        {entrada.type} {t('· ingresso nº')} {entrada.ticketId} ·{' '}
                        {horaBrasilia(entrada.enteredAt)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('Nenhuma entrada registrada ainda.')}</p>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

export default function Gate() {
  const { role, isAuthenticated } = useStore();
  return (
    <div className="workspace">
      <PageTitle
        title={t('Portaria')}
        subtitle={t(
          'Valide o código do ingresso na entrada do evento. Cada ingresso entra uma vez só.',
        )}
      >
        <Link className="button outline" to="/organizador/atendimentos">
          {t('Atendimentos')}
        </Link>
      </PageTitle>
      {isAuthenticated && role === 'organizador' ? (
        <Portaria />
      ) : (
        <Empty title={t('Entre com uma conta de organizador para usar a portaria.')} heading="h2">
          {t(
            'A portaria valida ingressos do banco de dados; o modo demonstração não tem ingressos reais.',
          )}
        </Empty>
      )}
    </div>
  );
}
