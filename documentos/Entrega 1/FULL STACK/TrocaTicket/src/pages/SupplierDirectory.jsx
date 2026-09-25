import React, { useState } from 'react';
import { Link } from 'react-router';
import { suppliers } from '../data/demo';
import { useStore } from '../context/StoreContext';
import { Badge, Empty, Modal, PageTitle, Panel, Tabs, money } from '../components/UI';
import { normalizeSearch } from '../services/rules';

const locais = {
  vibe: 'São Paulo',
  buffet: 'Pinheiros',
  guarda: 'Santo Amaro',
  lumina: 'São Paulo',
  palco: 'Campinas',
};

export default function SupplierDirectory() {
  const { data } = useStore();
  const [aba, setAba] = useState('Fornecedores');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [status, setStatus] = useState('Todos');
  const [regiao, setRegiao] = useState('Todas');
  const [selecionado, setSelecionado] = useState(null);
  function limparFiltros() {
    setBusca('');
    setCategoria('Todas');
    setStatus('Todos');
    setRegiao('Todas');
  }
  const fornecedores = suppliers.filter(
    (item) =>
      normalizeSearch(item.name + ' ' + item.category).includes(normalizeSearch(busca)) &&
      (categoria === 'Todas' || item.category === categoria) &&
      (status === 'Todos' || item.status === status) &&
      (regiao === 'Todas' || locais[item.id] === regiao),
  );
  const materiais = data.inventory.filter((item) =>
    normalizeSearch(item.name + ' ' + item.category).includes(normalizeSearch(busca)),
  );
  const propostas = data.proposals.filter((item) =>
    normalizeSearch(item.title + ' ' + item.id).includes(normalizeSearch(busca)),
  );
  return (
    <div className="workspace">
      <PageTitle
        title="Insumos e Fornecedores"
        subtitle="Consulte parceiros e recursos materiais para seus eventos."
      >
        <Badge tone="blue">Módulo integrado</Badge>
      </PageTitle>
      <Tabs
        options={['Fornecedores', 'Insumos & Materiais', 'Contratos & Propostas']}
        value={aba}
        onChange={(valor) => {
          setAba(valor);
          limparFiltros();
        }}
      />
      <Panel>
        <div className="filter-bar no-margin">
          <input
            aria-label="Buscar no catálogo de fornecedores"
            placeholder="Buscar por fornecedor, serviço ou insumo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {aba === 'Fornecedores' && (
            <>
              <select
                aria-label="Categoria do fornecedor"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="Todas">Todas as categorias</option>
                {suppliers.map((item) => (
                  <option key={item.id}>{item.category}</option>
                ))}
              </select>
              <select
                aria-label="Status do fornecedor"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Todos">Todos os status</option>
                <option>Confirmado</option>
                <option>Pendente</option>
              </select>
              <select
                aria-label="Região do fornecedor"
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
              >
                <option value="Todas">Todas as regiões</option>
                {[...new Set(Object.values(locais))].map((local) => (
                  <option key={local}>{local}</option>
                ))}
              </select>
            </>
          )}
          <button className="button outline" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </div>
      </Panel>
      {aba === 'Fornecedores' && (
        <Panel>
          <div className="table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Categoria / serviço</th>
                  <th>Contato comercial</th>
                  <th>Localidade</th>
                  <th>Valor de referência</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="directory-name">
                        <span className="directory-avatar">
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                        <strong>{item.name}</strong>
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>
                      <span>contato@{item.id}.example.com</span>
                      <small className="cell-caption">Contato fictício</small>
                    </td>
                    <td>{locais[item.id]} · SP</td>
                    <td>{money(item.price)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                    <td>
                      <button className="button outline" onClick={() => setSelecionado(item)}>
                        Ver detalhes →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!fornecedores.length && <Empty />}
          <p className="muted">
            {fornecedores.length} fornecedores encontrados no catálogo demonstrativo.
          </p>
        </Panel>
      )}
      {aba === 'Insumos & Materiais' && (
        <Panel
          title="Recursos cadastrados"
          subtitle="Itens do inventário do fornecedor disponíveis para consulta."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Preço</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small className="cell-caption">{item.description}</small>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td>{money(item.price)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!materiais.length && <Empty />}
        </Panel>
      )}
      {aba === 'Contratos & Propostas' && (
        <Panel
          title="Propostas comerciais"
          subtitle="Consulta local das propostas. Não representa contratação ou assinatura de contrato."
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Proposta</th>
                  <th>Evento</th>
                  <th>Descrição</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {propostas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.description}</td>
                    <td>{money(item.total)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!propostas.length && <Empty />}
        </Panel>
      )}
      {selecionado && (
        <Modal title={selecionado.name} onClose={() => setSelecionado(null)}>
          <img className="supplier-cover" src={selecionado.image} alt={selecionado.name} />
          <p>
            {selecionado.category} · {locais[selecionado.id]}, SP
          </p>
          <p>
            Valor de referência: <strong>{money(selecionado.price)}</strong>
          </p>
          <Badge>{selecionado.status}</Badge>
          <p>Os dados de contato e os serviços são exemplos para este projeto.</p>
          <Link
            className="button blue-button"
            to={`/organizador/novo?fornecedor=${selecionado.id}`}
          >
            Planejar evento com este parceiro
          </Link>
        </Modal>
      )}
    </div>
  );
}
