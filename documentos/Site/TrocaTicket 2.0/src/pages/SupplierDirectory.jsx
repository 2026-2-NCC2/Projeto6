import { useI18n } from '../i18n';
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
  const { t } = useI18n();
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
        title={t('Insumos e Fornecedores')}
        subtitle={t('Consulte parceiros e recursos materiais para seus eventos.')}
      >
        <Badge tone="blue">{t('Módulo integrado')}</Badge>
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
            aria-label={t('Buscar no catálogo de fornecedores')}
            placeholder={t('Buscar por fornecedor, serviço ou insumo…')}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {aba === 'Fornecedores' && (
            <>
              <select
                aria-label={t('Categoria do fornecedor')}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                <option value="Todas">{t('Todas as categorias')}</option>
                {suppliers.map((item) => (
                  <option key={item.id} value={item.category}>
                    {t(item.category)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('Status do fornecedor')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Todos">{t('Todos os status')}</option>
                <option value="Confirmado">{t('Confirmado')}</option>
                <option value="Pendente">{t('Pendente')}</option>
              </select>
              <select
                aria-label={t('Região do fornecedor')}
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
              >
                <option value="Todas">{t('Todas as regiões')}</option>
                {[...new Set(Object.values(locais))].map((local) => (
                  <option key={local} value={local}>
                    {local}
                  </option>
                ))}
              </select>
            </>
          )}
          <button className="button outline" onClick={limparFiltros}>
            {t('Limpar filtros')}
          </button>
        </div>
      </Panel>
      {aba === 'Fornecedores' && (
        <Panel>
          <div className="table-wrap">
            <table className="directory-table">
              <thead>
                <tr>
                  <th>{t('Fornecedor')}</th>
                  <th>{t('Categoria / serviço')}</th>
                  <th>{t('Contato comercial')}</th>
                  <th>{t('Localidade')}</th>
                  <th>{t('Valor de referência')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Ações')}</th>
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
                      <small className="cell-caption">{t('Contato fictício')}</small>
                    </td>
                    <td>{locais[item.id]} · SP</td>
                    <td>{money(item.price)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                    <td>
                      <button className="button outline" onClick={() => setSelecionado(item)}>
                        {t('Ver detalhes →')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!fornecedores.length && <Empty />}
          <p className="muted">
            {t('{count} fornecedores encontrados no catálogo demonstrativo.', {
              count: fornecedores.length,
            })}
          </p>
        </Panel>
      )}
      {aba === 'Insumos & Materiais' && (
        <Panel
          title={t('Recursos cadastrados')}
          subtitle={t('Itens do inventário do fornecedor disponíveis para consulta.')}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Item')}</th>
                  <th>{t('Categoria')}</th>
                  <th>{t('Unidade')}</th>
                  <th>{t('Preço')}</th>
                  <th>{t('Status')}</th>
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
          title={t('Propostas comerciais')}
          subtitle={t(
            'Consulta local das propostas. Não representa contratação ou assinatura de contrato.',
          )}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Proposta')}</th>
                  <th>{t('Evento')}</th>
                  <th>{t('Descrição')}</th>
                  <th>{t('Total')}</th>
                  <th>{t('Status')}</th>
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
            {t(selecionado.category)} · {locais[selecionado.id]}, SP
          </p>
          <p>
            {t('Valor de referência:')} <strong>{money(selecionado.price)}</strong>
          </p>
          <Badge>{selecionado.status}</Badge>
          <p>{t('Os dados de contato e os serviços são exemplos para este projeto.')}</p>
          <Link
            className="button blue-button"
            to={`/organizador/novo?fornecedor=${selecionado.id}`}
          >
            {t('Planejar evento com este parceiro')}
          </Link>
        </Modal>
      )}
    </div>
  );
}
