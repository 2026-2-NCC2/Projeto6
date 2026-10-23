import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../../context/Store';
import { DownloadButton, Empty, PageTitle, Panel } from '../../components/UI';
import { inventoryStatuses, inventoryTypes, supplierCategories } from '../../data/supplier';
import { kindOf, skuOf } from '../../utils/inventory';
import { parseCSV } from '../../utils/csv';
import Icon from '../../components/supplier/Icon';
import { ChipTabs, Chip, Pagination } from '../../components/supplier/common';
import SearchToolbar from '../../components/supplier/SearchToolbar';
import InventoryTable from '../../components/supplier/InventoryTable';
import ItemDetail from '../../components/supplier/ItemDetail';
import ItemFormModal from '../../components/supplier/ItemFormModal';

const PAGE_SIZE = 5;
const STATUS_FILTERS = [
  { value: 'Todos', label: 'Todos os status' },
  { value: 'Disponível', label: 'Apenas disponíveis' },
  { value: 'Alocado', label: 'Alocados' },
  { value: 'Manutenção', label: 'Em manutenção' },
  { value: 'Inativo', label: 'Inativos' },
];
const normalize = (text) => String(text).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');
const newId = () => `ITEM-${Date.now().toString().slice(-6)}`;
const BLANK = { category: supplierCategories[0], type: 'Produto', unit: 'Unidade / Diária', status: 'Disponível' };

export default function SupplierInventory() {
  const { data, update, notify } = useStore();
  const inventory = data.inventory;
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [category, setCategory] = useState('Todas');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(inventory[0]?.id);
  const [editing, setEditing] = useState(null);
  const importRef = useRef(null);

  const categories = [...new Set([...supplierCategories, ...inventory.map((item) => item.category)])];
  const count = (predicate) => inventory.filter(predicate).length;

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    return inventory.filter(
      (item) =>
        normalize(`${item.name} ${item.id} ${skuOf(item)}`).includes(term) &&
        (kind === 'Todos' || kindOf(item) === kind) &&
        (status === 'Todos' || item.status === status) &&
        (category === 'Todas' || item.category === category),
    );
  }, [inventory, query, kind, status, category]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selected = inventory.find((item) => item.id === selectedId) || filtered[0] || inventory[0];

  // qualquer mudança de filtro volta para a primeira página
  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  function clearFilters() {
    setQuery('');
    setKind('Todos');
    setStatus('Todos');
    setCategory('Todas');
    setPage(1);
  }

  function save(item) {
    const saved = { ...item, id: item.id || newId() };
    if (!saved.sku) saved.sku = saved.id;
    update('inventory', (old) => (item.id ? old.map((i) => (i.id === saved.id ? saved : i)) : [...old, saved]));
    setSelectedId(saved.id);
    setEditing(null);
    notify('Item salvo no inventário.');
  }
  function duplicate(item) {
    const id = newId();
    const copy = { ...item, id, sku: `${skuOf(item)}-COPIA`, name: `${item.name} (cópia)`, usage: [], allocatedEvents: 0 };
    update('inventory', (old) => [...old, copy]);
    setSelectedId(id);
    notify('Item duplicado. Ajuste os dados da cópia se necessário.');
  }
  function toggle(item) {
    const inactive = item.status === 'Inativo';
    update('inventory', (old) =>
      old.map((i) => (i.id === item.id ? { ...i, status: inactive ? 'Disponível' : 'Inativo' } : i)),
    );
    notify(inactive ? 'Item reativado.' : 'Item desativado.');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      notify('Por enquanto a importação aceita apenas CSV. Salve a planilha como .csv e tente de novo.');
      return;
    }
    const [header = [], ...rows] = parseCSV(await file.text());
    const col = (name) => header.findIndex((h) => normalize(h.trim()) === normalize(name));
    const idx = {
      id: col('Código'),
      name: col('Nome'),
      category: col('Categoria'),
      type: col('Tipo'),
      unit: col('Unidade'),
      price: col('Preço'),
      cost: col('Custo'),
      status: col('Status'),
    };
    if (idx.name < 0 || idx.price < 0) {
      notify('Não foi possível importar: o CSV precisa ter as colunas “Nome” e “Preço”.');
      return;
    }
    const taken = new Set(inventory.map((item) => item.id));
    const imported = [];
    let skipped = 0;
    rows.forEach((row, n) => {
      const get = (key) => (idx[key] >= 0 ? (row[idx[key]] || '').trim() : '');
      const price = Number(get('price').replace(/\./g, '').replace(',', '.')) || Number(get('price'));
      if (get('name').length < 3 || !(price > 0)) {
        skipped++;
        return;
      }
      let id = get('id') || `${newId()}-${n}`;
      if (taken.has(id)) id = `${newId()}-${n}`;
      taken.add(id);
      imported.push({
        ...BLANK,
        id,
        sku: id,
        name: get('name'),
        category: get('category') || BLANK.category,
        type: get('type') || BLANK.type,
        unit: get('unit') || BLANK.unit,
        price,
        cost: Number(get('cost')) || 0,
        status: inventoryStatuses.includes(get('status')) ? get('status') : 'Disponível',
        description: '',
      });
    });
    if (imported.length) update('inventory', (old) => [...old, ...imported]);
    notify(
      imported.length
        ? `${imported.length} ${imported.length === 1 ? 'item importado' : 'itens importados'}${skipped ? `; ${skipped} linha(s) ignorada(s) por dados inválidos` : ''}.`
        : 'Nenhum item válido encontrado no arquivo.',
    );
  }

  const homologated = count((item) => item.status !== 'Inativo');
  const available = count((item) => item.status === 'Disponível');
  const offline = count((item) => ['Alocado', 'Manutenção'].includes(item.status));

  return (
    <div className="workspace sp-page">
      <PageTitle
        title="Itens & inventário"
        subtitle="Gerencie o catálogo de produtos, serviços e equipamentos usados nas suas propostas."
      >
        <input ref={importRef} className="sp-hidden-input" type="file" accept=".csv,text/csv" tabIndex={-1} onChange={importFile} />
        <button type="button" className="button outline" onClick={() => importRef.current?.click()}>
          <Icon name="upload" size={15} /> Importar planilha (CSV)
        </button>
        <DownloadButton
          name="catalogo-fornecedor.csv"
          rows={[
            ['Código', 'Nome', 'Categoria', 'Tipo', 'Unidade', 'Preço', 'Custo', 'Status'],
            ...inventory.map((i) => [i.id, i.name, i.category, i.type || '', i.unit, i.price, i.cost || '', i.status]),
          ]}
        >
          <Icon name="download" size={15} /> Exportar catálogo
        </DownloadButton>
        <button type="button" className="button blue-button" onClick={() => setEditing({ ...BLANK })}>
          <Icon name="plus" size={15} /> Adicionar novo item
        </button>
      </PageTitle>

      <div className="sp-chip-row" aria-label="Resumo do inventário">
        <Chip tone="green" dot>{homologated} itens homologados</Chip>
        <Chip tone="blue" dot>{available} disponíveis imediatos</Chip>
        <Chip tone="amber" dot>{offline} em manutenção / alocados</Chip>
      </div>

      <Panel className="sp-inventory-filters">
        <SearchToolbar
          query={query}
          onQuery={filter(setQuery)}
          searchLabel="Buscar no inventário"
          placeholder="Buscar por nome, código ou SKU…"
          filters={[
            { id: 'kind', value: kind, onChange: filter(setKind), options: [{ value: 'Todos', label: 'Tipo: todos os tipos' }, ...inventoryTypes] },
            { id: 'status', value: status, onChange: filter(setStatus), options: STATUS_FILTERS },
          ]}
        >
          <button type="button" className="button outline" onClick={clearFilters}>
            Limpar filtros
          </button>
        </SearchToolbar>
        <div className="sp-category-row">
          <small>CATEGORIAS:</small>
          <ChipTabs
            value={category}
            onChange={filter(setCategory)}
            options={[
              { value: 'Todas', label: 'Todas', count: inventory.length },
              ...categories.map((name) => ({ value: name, label: name, count: count((i) => i.category === name) })),
            ]}
          />
        </div>
      </Panel>

      <div className="sp-inventory-layout">
        <Panel className="sp-inventory-list">
          <div className="sp-inventory-title">
            <div>
              <h2>Composição de custos & itens cadastrados</h2>
              <small>Tabela de preço homologada · {category === 'Todas' ? 'todas as categorias' : category}</small>
            </div>
          </div>
          {visible.length > 0 ? (
            <>
              <InventoryTable
                items={visible}
                selectedId={selected?.id}
                onSelect={setSelectedId}
                onEdit={setEditing}
                onDuplicate={duplicate}
              />
              <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} noun="itens" />
            </>
          ) : (
            <Empty>
              Nenhum item encontrado.{' '}
              <button type="button" className="sp-link-button" onClick={clearFilters}>
                Limpar filtros
              </button>
            </Empty>
          )}
        </Panel>

        {selected && <ItemDetail key={selected.id} item={selected} onEdit={setEditing} onToggle={toggle} />}
      </div>

      {editing && <ItemFormModal item={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}
