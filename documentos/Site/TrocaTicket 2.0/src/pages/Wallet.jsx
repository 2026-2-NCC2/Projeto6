import React, { useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../context/StoreContext';
import { Badge, Empty, Field, Modal, PageTitle, Panel, money } from '../components/UI';
import { normalizeSearch, validAmount } from '../services/rules';

// Estes ingressos são exemplos. As reservas feitas no catálogo também aparecem aqui.
const exemplos = [
  {
    id: 'DEMO-9482',
    eventId: 'rock-in-rio',
    title: 'Rock Festival Brasil 2025',
    image: '/images/rock-in-rio.jpg',
    type: 'Pista Premium',
    quantity: 1,
    total: 650,
    status: 'Reservado (demo)',
    location: 'Interlagos, SP',
    date: '18 Out 2025 · 20:00',
  },
  {
    id: 'DEMO-3312',
    eventId: 'tim-maia',
    title: 'Tim Maia Come Back Musical',
    image: '/images/asset-14.jpg',
    type: 'Plateia A',
    quantity: 1,
    total: 220,
    status: 'Anunciado',
    resalePrice: 220,
    location: 'Teatro Bradesco, SP',
    date: '04 Nov 2025 · 21:00',
  },
  {
    id: 'DEMO-7740',
    eventId: 'sunset',
    title: 'Electronic Sunset Festival',
    image: '/images/asset-5.jpg',
    type: 'Camarote Open Bar',
    quantity: 1,
    total: 480,
    status: 'Em transferência',
    recipient: 'Convidado de exemplo',
    location: 'Marina da Glória, RJ',
    date: '12 Dez 2025 · 16:00',
  },
  {
    id: 'DEMO-5521',
    eventId: 'comedy',
    title: 'Stand-up Comedy Arena',
    image: '/images/asset-6.jpg',
    type: 'Meia-entrada',
    quantity: 1,
    total: 80,
    status: 'Reservado (demo)',
    location: 'Palácio das Artes, BH',
    date: '22 Jan 2026 · 20:30',
  },
  {
    id: 'DEMO-1092',
    eventId: 'final',
    title: 'Final do Campeonato 2024',
    image: '/images/asset-20.jpg',
    type: 'Cadeira inferior',
    quantity: 1,
    total: 190,
    status: 'Utilizado',
    location: 'Allianz Parque, SP',
    date: '10 Dez 2024 · Encerrado',
  },
];

export default function Wallet() {
  const { data, update, notify } = useStore();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('Todos');
  const [selecionadoId, setSelecionadoId] = useState('');
  const [pagina, setPagina] = useState(1);
  const [acao, setAcao] = useState('');
  const [valor, setValor] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [erro, setErro] = useState('');
  // Uma alteração salva substitui o exemplo que tem o mesmo id.
  const ingressos = [
    ...data.tickets,
    ...exemplos.filter((item) => !data.tickets.some((salvo) => salvo.id === item.id)),
  ].map((item) => ({
    ...item,
    status: data.events.some(
      (evento) => evento.id === item.eventId && evento.status === 'Cancelado',
    )
      ? 'Evento cancelado'
      : item.status,
  }));
  const filtrados = ingressos.filter(
    (item) =>
      normalizeSearch(item.title + ' ' + (item.location || '')).includes(normalizeSearch(busca)) &&
      (status === 'Todos' || item.status === status),
  );
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 5));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * 5, paginaAtual * 5);
  const selecionado = visiveis.find((item) => item.id === selecionadoId) || visiveis[0];
  const ativo = selecionado?.status === 'Reservado (demo)';

  function alterarIngresso(campos) {
    if (!selecionado) return;
    const novo = { ...selecionado, ...campos };
    update('tickets', (antigos) => [novo, ...antigos.filter((item) => item.id !== novo.id)]);
    setSelecionadoId(novo.id);
    setPagina(1);
    setStatus('Todos');
    setAcao('');
    notify('Ingresso atualizado na demonstração.');
  }
  function abrirAcao(nome) {
    setAcao(nome);
    setErro('');
    setValor(String(selecionado.total));
    setDestinatario('');
  }
  function confirmar(event) {
    event.preventDefault();
    if (acao === 'revender') {
      if (!validAmount(valor)) {
        setErro('Informe um preço positivo com até duas casas decimais.');
        return;
      }
      alterarIngresso({ status: 'Anunciado', resalePrice: Number(valor) });
    } else if (acao === 'transferir') {
      if (destinatario.trim().length < 3) {
        setErro('Informe o nome fictício do convidado.');
        return;
      }
      alterarIngresso({ status: 'Em transferência', recipient: destinatario.trim() });
    } else alterarIngresso({ status: 'Cancelado' });
  }
  return (
    <div className="workspace wallet-page">
      <Panel>
        <PageTitle
          title="MEUS INGRESSOS"
          subtitle="Carteira digital · gerencie suas entradas de demonstração."
        >
          <Badge>
            {ingressos.filter((item) => item.status === 'Reservado (demo)').length} ativos
          </Badge>
          <Badge tone="blue">
            {ingressos.filter((item) => item.status === 'Anunciado').length} anunciados
          </Badge>
          <Badge tone="amber">
            {ingressos.filter((item) => item.status === 'Utilizado').length} utilizados
          </Badge>
        </PageTitle>
      </Panel>
      <Panel>
        <div className="filter-bar no-margin">
          <input
            aria-label="Buscar ingressos"
            placeholder="Buscar por evento ou local…"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
          <select
            aria-label="Status do ingresso"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagina(1);
            }}
          >
            {[
              'Todos',
              'Reservado (demo)',
              'Anunciado',
              'Em transferência',
              'Utilizado',
              'Cancelado',
              'Evento cancelado',
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            className="button outline"
            onClick={() => {
              setBusca('');
              setStatus('Todos');
              setPagina(1);
            }}
          >
            Limpar filtros
          </button>
          <Link className="button blue-button" to="/eventos">
            + Adicionar ingresso
          </Link>
        </div>
      </Panel>
      <div className="wallet-grid">
        <Panel
          title="INGRESSOS DISPONÍVEIS"
          subtitle={`${filtrados.length} registros encontrados na carteira`}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ingresso & evento</th>
                  <th>Data & local</th>
                  <th>Setor / tipo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((item) => (
                  <tr key={item.id} className={selecionado?.id === item.id ? 'selected-row' : ''}>
                    <td>
                      <strong>{item.title}</strong>
                      <small className="cell-caption">{item.id}</small>
                    </td>
                    <td>
                      {item.date || 'Consultar evento'}
                      <small className="cell-caption">{item.location || 'Local do evento'}</small>
                    </td>
                    <td>
                      {item.quantity} × {item.type}
                    </td>
                    <td>{money(item.total)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                    <td>
                      <button
                        className="button outline"
                        aria-label={`Ver ingresso ${item.title}`}
                        onClick={() => setSelecionadoId(item.id)}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visiveis.length && (
            <Empty title="Nenhum ingresso encontrado">
              Altere os filtros ou adicione uma reserva pelo catálogo.
            </Empty>
          )}
          <div className="form-footer">
            <span>
              Página {paginaAtual} de {totalPaginas}
            </span>
            <div className="actions">
              <button
                className="button outline"
                disabled={paginaAtual === 1}
                onClick={() => setPagina(paginaAtual - 1)}
              >
                Anterior
              </button>
              <button
                className="button outline"
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPagina(paginaAtual + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </Panel>
        {selecionado && (
          <aside className="wallet-detail">
            <div className="wallet-ticket-heading">
              <Badge tone="blue">INGRESSO SELECIONADO</Badge>
              <h2>{selecionado.title}</h2>
              <p>{selecionado.type}</p>
              <div className="card-actions">
                <code>{selecionado.id}</code>
                <strong>{money(selecionado.resalePrice || selecionado.total)}</strong>
              </div>
            </div>
            <div className="wallet-ticket-body">
              <div className="ticket-demo-stamp">
                <span aria-hidden="true">▦</span>
                <strong>INGRESSO DEMONSTRATIVO</strong>
                <p>Sem QR Code válido. Não permite entrada em eventos.</p>
              </div>
              <h3>Detalhes de titularidade</h3>
              <dl className="key-values">
                <dt>Titular</dt>
                <dd>{data.profile.name}</dd>
                <dt>Quantidade</dt>
                <dd>{selecionado.quantity}</dd>
                <dt>Status</dt>
                <dd>{selecionado.status}</dd>
                {selecionado.recipient && (
                  <>
                    <dt>Convidado</dt>
                    <dd>{selecionado.recipient}</dd>
                  </>
                )}
              </dl>
              <div className="info-note">
                Revenda e transferência alteram apenas esta carteira local. Nenhuma pessoa recebe
                mensagens ou ingressos reais.
              </div>
              <div className="wallet-actions">
                {ativo && (
                  <>
                    <button className="button blue-button" onClick={() => abrirAcao('revender')}>
                      + Anunciar para revenda
                    </button>
                    <button className="button outline" onClick={() => abrirAcao('transferir')}>
                      Transferir para amigo
                    </button>
                    <button className="button danger-outline" onClick={() => abrirAcao('cancelar')}>
                      Cancelar reserva
                    </button>
                  </>
                )}
                {['Anunciado', 'Em transferência'].includes(selecionado.status) && (
                  <button
                    className="button outline"
                    onClick={() =>
                      alterarIngresso({ status: 'Reservado (demo)', recipient: '', resalePrice: 0 })
                    }
                  >
                    {selecionado.status === 'Anunciado'
                      ? 'Retirar anúncio'
                      : 'Desfazer transferência'}
                  </button>
                )}
                <button className="button outline" onClick={() => window.print()}>
                  Imprimir / salvar PDF
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
      {acao && (
        <Modal
          title={
            acao === 'revender'
              ? 'Anunciar ingresso (demo)'
              : acao === 'transferir'
                ? 'Transferir ingresso (demo)'
                : 'Cancelar reserva?'
          }
          onClose={() => setAcao('')}
        >
          <form onSubmit={confirmar} noValidate>
            <p>
              {selecionado.title} · {selecionado.quantity} ingresso(s)
            </p>
            {acao === 'revender' && (
              <Field
                label="Preço total do anúncio (R$)"
                name="resale-value"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            )}
            {acao === 'transferir' && (
              <Field
                label="Nome fictício do convidado"
                name="recipient"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
              />
            )}
            <p>Esta operação é apenas uma simulação local.</p>
            {erro && (
              <p className="field-error" role="alert">
                {erro}
              </p>
            )}
            <div className="actions">
              <button type="button" className="button outline" onClick={() => setAcao('')}>
                Voltar
              </button>
              <button className="button blue-button">Confirmar simulação</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
