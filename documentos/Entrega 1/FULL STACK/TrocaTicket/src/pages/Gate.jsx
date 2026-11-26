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
  if (!eventos) return <p role="status">Carregando seus eventos…</p>;
  if (!eventos.length) {
    return (
      <Empty title="Você ainda não tem eventos" heading="h2">
        Crie e publique um evento para abrir a portaria.{' '}
        <Link to="/organizador/novo">Novo evento</Link>
      </Empty>
    );
  }
  const evento = eventos.find((item) => String(item.id) === eventoId);

  return (
    <div className="gate-layout">
      <Panel title="Validar entrada">
        <form className="gate-form" onSubmit={validar}>
          <label htmlFor="gate-evento">Evento</label>
          <select
            id="gate-evento"
            value={eventoId}
            required
            onChange={(e) => {
              setEventoId(e.target.value);
              setResultado(null);
            }}
          >
            <option value="">Selecione um evento</option>
            {eventos.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.open}>
                {item.title} · {item.startDate}
                {item.open ? '' : ' (portaria fechada)'}
              </option>
            ))}
          </select>
          <label htmlFor="gate-codigo">Código do ingresso</label>
          <input
            id="gate-codigo"
            ref={campoCodigo}
            value={codigo}
            required
            maxLength={100}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="TT-…"
            onChange={(e) => {
              setCodigo(e.target.value);
              setResultado(null);
            }}
          />
          <p className="muted">
            O código está em Meus ingressos, na conta de quem vai entrar. Ele muda a cada revenda,
            transferência ou troca. Simulação acadêmica: sem câmera e sem leitura offline.
          </p>
          <button
            type="submit"
            className="button primary"
            disabled={ocupado || !eventoId || !evento?.open}
          >
            {ocupado ? 'Validando…' : 'Validar entrada'}
          </button>
        </form>
        {resultado?.ok && (
          <div className="gate-result ok" role="status">
            <strong>Entrada liberada</strong>
            <p>
              {resultado.holderName} · {resultado.type} · ingresso nº {resultado.ticketId}
            </p>
            <small>
              Registrada às {horaBrasilia(resultado.enteredAt)}. Uma segunda leitura será recusada.
            </small>
          </div>
        )}
        {resultado && !resultado.ok && (
          <div className="gate-result erro" role="alert">
            <strong>Entrada recusada</strong>
            <p>{resultado.message}</p>
          </div>
        )}
      </Panel>
      <Panel title="Entradas do evento">
        {!evento ? (
          <p>Selecione um evento para ver as entradas.</p>
        ) : !resumo ? (
          <p role="status">Carregando entradas…</p>
        ) : (
          <>
            <p className="gate-count">
              <strong>{resumo.entered}</strong> {resumo.entered === 1 ? 'entrada' : 'entradas'} ·{' '}
              {resumo.waiting}{' '}
              {resumo.waiting === 1
                ? 'ingresso ainda não utilizado'
                : 'ingressos ainda não utilizados'}
            </p>
            {resumo.lastEntries.length ? (
              <ul className="resale-list" aria-label="Últimas entradas">
                {resumo.lastEntries.map((entrada) => (
                  <li key={entrada.ticketId} className="resale-item">
                    <span className="resale-item-text">
                      <strong>{entrada.holderName}</strong>
                      <small>
                        {entrada.type} · ingresso nº {entrada.ticketId} ·{' '}
                        {horaBrasilia(entrada.enteredAt)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma entrada registrada ainda.</p>
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
        title="Portaria"
        subtitle="Valide o código do ingresso na entrada do evento. Cada ingresso entra uma vez só."
      >
        <Link className="button outline" to="/organizador/atendimentos">
          Atendimentos
        </Link>
      </PageTitle>
      {isAuthenticated && role === 'organizador' ? (
        <Portaria />
      ) : (
        <Empty title="Entre com uma conta de organizador para usar a portaria." heading="h2">
          A portaria valida ingressos do banco de dados; o modo demonstração não tem ingressos
          reais.
        </Empty>
      )}
    </div>
  );
}
