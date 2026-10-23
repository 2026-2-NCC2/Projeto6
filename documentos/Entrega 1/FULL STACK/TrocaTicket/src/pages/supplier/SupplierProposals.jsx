import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../../context/Store';
import { Badge, Empty, Modal, PageTitle, dateLabel, downloadCSV, money } from '../../components/UI';
import FilterSidebar from '../../components/supplier/FilterSidebar';
import ProposalCard, { outcomeOf } from '../../components/supplier/ProposalCard';
import Icon from '../../components/supplier/Icon';
import { Chip, LabeledSelect } from '../../components/supplier/common';
import { withEventInfo } from '../../data/supplier';

const GROUPS = [
  { value: 'Todas', label: 'Todas as propostas', tone: 'blue', match: () => true },
  { value: 'Em análise', label: 'Em análise', tone: 'amber', match: (p) => p.status === 'Em análise' },
  { value: 'Aprovada', label: 'Aprovadas / selecionadas', tone: 'green', match: (p) => p.status === 'Aprovada' },
  { value: 'Não selecionada', label: 'Não selecionadas', tone: 'gray', match: (p) => p.status === 'Não selecionada' },
  { value: 'Encerrada', label: 'Encerradas / histórico', tone: 'gray', match: (p) => p.status === 'Encerrada' },
  { value: 'Rascunho', label: 'Rascunhos', tone: 'blue', match: (p) => p.status === 'Rascunho' },
];
const RANGES = [
  { value: 'Todos', label: 'Todos os valores', match: () => true },
  { value: 'ate100', label: 'Até R$ 100 mil', match: (p) => p.total <= 100000 },
  { value: '100a200', label: 'R$ 100 mil a R$ 200 mil', match: (p) => p.total > 100000 && p.total <= 200000 },
  { value: 'acima200', label: 'Acima de R$ 200 mil', match: (p) => p.total > 200000 },
];
const SORTS = [
  { value: 'recent', label: 'Data de envio (mais recentes)' },
  { value: 'value', label: 'Maior valor' },
  { value: 'event', label: 'Data do evento (mais próxima)' },
];
const yearOf = (proposal) => String(proposal.eventDate || '').slice(0, 4);

export default function SupplierProposals() {
  const { data, notify } = useStore();
  const all = useMemo(() => data.proposals.map(withEventInfo), [data.proposals]);
  const [group, setGroup] = useState('Todas');
  const [period, setPeriod] = useState('Todos');
  const [category, setCategory] = useState('Todas');
  const [range, setRange] = useState('Todos');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(null);

  const years = [...new Set(all.map(yearOf).filter(Boolean))].sort();
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))].sort();
  const count = (value) => all.filter(GROUPS.find((g) => g.value === value).match).length;
  const active = all.filter((p) => !['Não selecionada', 'Encerrada'].includes(p.status)).length;

  const proposals = useMemo(() => {
    const inGroup = GROUPS.find((g) => g.value === group).match;
    const inRange = RANGES.find((r) => r.value === range).match;
    return all
      .filter(
        (p) =>
          inGroup(p) &&
          inRange(p) &&
          (period === 'Todos' || yearOf(p) === period) &&
          (category === 'Todas' || p.category === category),
      )
      .sort((a, b) => {
        if (sort === 'value') return b.total - a.total;
        if (sort === 'event') return String(a.eventDate).localeCompare(String(b.eventDate));
        return b.date.localeCompare(a.date);
      });
  }, [all, group, period, category, range, sort]);

  function clear() {
    setGroup('Todas');
    setPeriod('Todos');
    setCategory('Todas');
    setRange('Todos');
  }
  function exportOne(p) {
    downloadCSV(`${p.id}.csv`, [
      ['Proposta', 'Evento', 'Total', 'Status', 'Pagamento'],
      [p.id, p.title, p.total, p.status, p.payment],
    ]);
  }

  const statuses = GROUPS.filter((g) => g.value !== 'Rascunho' || count('Rascunho') > 0).map((g) => ({
    value: g.value,
    label: g.label,
    tone: g.tone,
    count: count(g.value),
  }));

  return (
    <div className="workspace sp-page">
      <PageTitle
        title={
          <span className="sp-title-with-chip">
            Minhas propostas
            <Chip tone="blue">{active} ativas</Chip>
          </span>
        }
        subtitle="Acompanhe o ciclo de aprovação, status e valores das propostas comerciais enviadas para os eventos."
      >
        <Link className="button blue-button" to="/fornecedor">
          <Icon name="plus" size={15} /> Nova proposta comercial
        </Link>
      </PageTitle>

      <div className="sp-chip-row" aria-label="Resumo das propostas">
        <Chip>{all.length} propostas totais</Chip>
        <Chip tone="amber" dot>
          {count('Em análise')} em análise
        </Chip>
        <Chip tone="green" dot>
          {count('Aprovada')} aprovadas / contratadas
        </Chip>
        <Chip dot>{count('Não selecionada')} não selecionadas</Chip>
        <Chip>{count('Encerrada')} encerrada{count('Encerrada') === 1 ? '' : 's'}</Chip>
      </div>

      <div className="sp-proposals-layout">
        <FilterSidebar
          statuses={statuses}
          status={group}
          onStatus={setGroup}
          onClear={clear}
          selects={[
            {
              id: 'period',
              label: 'Período do evento',
              value: period,
              onChange: setPeriod,
              options: [
                { value: 'Todos', label: years.length ? `Todos (${years[0]}–${years[years.length - 1]})` : 'Todos os períodos' },
                ...years.map((y) => ({ value: y, label: y })),
              ],
            },
            {
              id: 'category',
              label: 'Categoria fornecida',
              value: category,
              onChange: setCategory,
              options: [{ value: 'Todas', label: 'Todas as categorias' }, ...categories],
            },
            { id: 'range', label: 'Faixa de valor da proposta', value: range, onChange: setRange, options: RANGES },
          ]}
        />

        <section aria-label="Lista de propostas">
          <div className="sp-list-bar">
            <p aria-live="polite">
              Exibindo: <strong>{proposals.length} {proposals.length === 1 ? 'proposta' : 'propostas'}</strong>
            </p>
            <LabeledSelect label="Ordenar por:" value={sort} onChange={setSort} options={SORTS} />
          </div>
          {proposals.length > 0 ? (
            <div className="sp-grid-proposals">
              {proposals.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onDetails={setSelected}
                  onExport={exportOne}
                  onSecondary={(item) => notify(`“${item.secondaryAction}” ficará disponível quando o backend for conectado.`)}
                />
              ))}
            </div>
          ) : (
            <Empty>
              Nenhuma proposta com esses filtros.{' '}
              <button type="button" className="sp-link-button" onClick={clear}>
                Limpar filtros
              </button>
            </Empty>
          )}
        </section>
      </div>

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <Badge tone={outcomeOf(selected).tone === 'gray' ? 'blue' : undefined}>{selected.status}</Badge>
          <p>{selected.description}</p>
          <p>
            Total: <strong>{money(selected.total)}</strong> · Pagamento: {selected.payment}
          </p>
          <p className="muted">
            {selected.organizer} · {selected.location} · evento em {dateLabel(selected.eventDate)}
          </p>
          {selected.items?.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd.</th>
                    <th>Valor unit.</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>
                        {item.qty} {item.unit}
                      </td>
                      <td>{money(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selected.note && <p>Observações: {selected.note}</p>}
          <p className="muted">
            Proposta registrada apenas neste navegador. Nenhum contrato ou pagamento real foi realizado.
          </p>
          <button className="button outline" onClick={() => exportOne(selected)}>
            ↓ Baixar resumo (CSV)
          </button>
        </Modal>
      )}
    </div>
  );
}
