import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../../context/Store';
import { Modal, NotFound, PageTitle, Panel, dateLabel, downloadCSV, money } from '../../components/UI';
import { supplierOpportunities as opportunities, quoteTotal } from '../../data/supplier';
import { FormTextArea, RadioCards } from '../../components/supplier/FormControls';
import { BriefingPanel, DemandCard, OrganizerCard, QuoteFooter, QuoteItemsTable } from '../../components/supplier/QuoteParts';
import { Callout, Chip, LabeledSelect, SearchInput, Tag } from '../../components/supplier/common';
import Icon from '../../components/supplier/Icon';

const PAYMENTS = ['50% sinal + 50% D+10', 'Faturamento 28 DDL'];
const CRITERIA = [
  'Certidões negativas e documentos fiscais da empresa em dia.',
  'Apólice de seguro de responsabilidade civil vigente para o evento.',
  'Equipe com treinamento e certificações exigidas no memorial descritivo.',
  'Laudos e ART dos equipamentos e estruturas que serão instalados.',
];
const normalize = (text) => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function SupplierQuote() {
  const { id } = useParams();
  const { data, update, notify } = useStore();
  const navigate = useNavigate();
  const event = opportunities.find((e) => e.id === id);
  const items = event?.quote.items ?? [];
  const draft = data.proposals.find((p) => p.eventId === id && p.status === 'Rascunho');

  const [prices, setPrices] = useState(() => draft?.prices || items.map((item) => item.offer));
  const [note, setNote] = useState(draft?.note || '');
  const [payment, setPayment] = useState(draft?.payment || PAYMENTS[0]);
  const [invalid, setInvalid] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [modal, setModal] = useState(null); // 'criteria' | doc | 'docs'

  if (!event) return <NotFound title="Cotação não encontrada" />;

  const { quote } = event;
  const locked = quote.window.state === 'submitted';
  const total = quoteTotal(items, prices);
  const ceiling = items.reduce((sum, item) => sum + item.qty * item.ref, 0);
  const categories = ['Todas', ...new Set(opportunities.map((e) => e.category))];
  const demands = opportunities.filter(
    (e) =>
      normalize(`${e.title} ${e.subtitle} ${e.organizer}`).includes(normalize(query.trim())) &&
      (category === 'Todas' || e.category === category),
  );
  const openCount = opportunities.filter((e) => e.quote.window.state !== 'submitted').length;
  const closingCount = opportunities.filter((e) => e.quote.window.state === 'closing').length;

  function submit(status) {
    const bad = prices.map((v, i) => (Number.isFinite(Number(v)) && Number(v) > 0 ? -1 : i)).filter((i) => i >= 0);
    setInvalid(bad);
    if (bad.length) {
      document.getElementById(`quote-price-${bad[0]}`)?.focus();
      return;
    }
    const proposal = {
      id: draft?.id || `PRP-${event.date.slice(0, 4)}-${String(Date.now()).slice(-4)}`,
      eventId: id,
      title: `${event.title} — ${event.subtitle}`,
      total,
      status,
      date: new Date().toISOString().slice(0, 10),
      eventDate: event.date,
      location: event.location,
      organizer: event.organizer,
      category: event.category,
      description: `${items.length} itens cotados: ${items.map((item) => item.name.split(' (')[0]).join(', ')}`,
      payment,
      prices: prices.map(Number),
      items: items.map((item, i) => ({ name: item.name, qty: item.qty, unit: item.unit, price: Number(prices[i]) })),
      note,
    };
    update('proposals', (old) => (draft ? old.map((p) => (p.id === draft.id ? proposal : p)) : [proposal, ...old]));
    notify(status === 'Rascunho' ? 'Rascunho da proposta salvo.' : 'Proposta enviada para análise na demonstração.');
    navigate('/fornecedor/propostas');
  }

  function openDoc(doc) {
    if (!doc) {
      setModal('docs');
      return;
    }
    notify(`O download de “${doc.name}” ficará disponível quando o backend for conectado.`);
  }

  return (
    <div className="workspace sp-page">
      <PageTitle
        title={
          <span className="sp-title-with-chip">
            Eventos
            <Chip tone="blue">{openCount} abertos para cotação</Chip>
            {closingCount > 0 && <Chip tone="amber">{closingCount} próximo do prazo</Chip>}
          </span>
        }
        subtitle="Selecione uma demanda no menu lateral para visualizar os editais e submeter sua proposta técnica e comercial."
      >
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar evento ou organizadora…" label="Buscar evento ou organizadora" />
        <LabeledSelect label="Categoria:" value={category} onChange={setCategory} options={categories} />
      </PageTitle>

      <div className="sp-quote-layout">
        <aside className="sp-quote-side">
          <OrganizerCard name={event.organizer} city={quote.organizer.city} reliability={quote.organizer.reliability} />
          <div className="sp-side-title">
            <small>DEMANDA EM CONCORRÊNCIA</small>
            <span>Total: {demands.length}</span>
          </div>
          {demands.map((demand) => (
            <DemandCard key={demand.id} event={demand} active={demand.id === id} />
          ))}
          {!demands.length && <p className="muted sp-side-empty">Nenhuma demanda com esses filtros.</p>}
          <BriefingPanel docs={quote.docs} onOpen={openDoc} />
        </aside>

        <Panel className="sp-quote-main">
          <div className="sp-quote-top">
            <div>
              <div className="sp-quote-tags">
                <Tag tone="blue">COTAÇÃO ATIVA Nº {quote.code}</Tag>
                <span>Lote: {quote.lot}</span>
              </div>
              <h1>
                {event.title} — {event.subtitle}
              </h1>
              <p className="sp-quote-meta">
                <span>
                  <Icon name="pin" size={14} /> {quote.venue} · {event.location}
                </span>
                <span>
                  <Icon name="user" size={14} /> Público estimado: {quote.audience}
                </span>
              </p>
            </div>
            <div className={`sp-deadline ${quote.window.state}`}>
              <small>RECEBIMENTO DE PROPOSTAS</small>
              <strong>{quote.closesIn}</strong>
              <span>{quote.closesAt}</span>
            </div>
          </div>

          <p className="sp-scope-text">
            <strong>Escopo resumido:</strong> {quote.scope}
          </p>

          {locked && (
            <Callout
              tone="blue"
              icon="check"
              title={`Proposta enviada em ${event.proposal.sentAt}`}
              action={<span className="sp-protocol">Protocolo {event.proposal.protocol}</span>}
            >
              Os valores abaixo estão bloqueados enquanto a proposta é analisada.
            </Callout>
          )}

          <div className="sp-section-head">
            <h2>
              Itens requisitados para cotação <Chip>{items.length} itens</Chip>
            </h2>
            <button type="button" className="sp-link-button" onClick={() => setModal('criteria')}>
              Revisar critérios técnicos de homologação <Icon name="arrow-right" size={13} />
            </button>
          </div>

          <QuoteItemsTable
            items={items}
            prices={prices}
            invalid={invalid}
            disabled={locked}
            onPrice={(i, value) => setPrices((old) => old.map((v, j) => (j === i ? value : v)))}
          />
          {invalid.length > 0 && (
            <p role="alert" className="field-error">
              Informe um valor maior que zero para todos os itens.
            </p>
          )}

          <div className="sp-quote-extras">
            <FormTextArea
              label="Observações & diferenciais da fornecedora"
              name="quote-note"
              rows={4}
              disabled={locked}
              placeholder="Ex.: informar tempo de montagem, frota própria de caminhões refrigerados, certificados ISO…"
              value={note}
              onChange={setNote}
            />
            <div>
              <RadioCards legend="Condição de faturamento proposta" name="payment" options={PAYMENTS} value={payment} onChange={locked ? () => {} : setPayment} />
              <small className="sp-hint">
                * Conforme edital, o pagamento é garantido via custódia TrocaTicket Pay.
              </small>
            </div>
          </div>

          <QuoteFooter total={total} withinCeiling={total <= ceiling}>
            {locked ? (
              <Link className="button blue-button" to="/fornecedor/propostas">
                Acompanhar proposta <Icon name="arrow-right" size={14} />
              </Link>
            ) : (
              <>
                <button type="button" className="button sp-ghost-light" onClick={() => submit('Rascunho')}>
                  Salvar rascunho
                </button>
                <button type="button" className="button blue-button" onClick={() => submit('Em análise')}>
                  Enviar proposta comercial <Icon name="arrow-right" size={14} />
                </button>
              </>
            )}
          </QuoteFooter>
        </Panel>
      </div>

      {modal === 'criteria' && (
        <Modal title="Critérios técnicos de homologação" onClose={() => setModal(null)}>
          <ul className="sp-criteria">
            {CRITERIA.map((item) => (
              <li key={item}>
                <Icon name="check" size={14} /> {item}
              </li>
            ))}
          </ul>
          <p className="muted">Critérios de demonstração. Os critérios reais virão do edital de cada evento.</p>
        </Modal>
      )}
      {modal === 'docs' && (
        <Modal title="Briefing do evento" onClose={() => setModal(null)}>
          <p>{quote.scope}</p>
          <button
            className="button outline"
            onClick={() =>
              downloadCSV('briefing.csv', [
                [event.title],
                ['Item', 'Quantidade', 'Unidade', 'Valor sugerido'],
                ...items.map((item) => [item.name, item.qty, item.unit, item.ref]),
              ])
            }
          >
            ↓ Baixar briefing (CSV)
          </button>
          <p className="muted">
            Teto sugerido da cotação: <strong>{money(ceiling)}</strong> · evento em {dateLabel(event.date)}
          </p>
        </Modal>
      )}
    </div>
  );
}
