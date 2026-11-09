import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useStore } from '../../context/Store';
import { Modal, NotFound, PageTitle, Panel, dateLabel, downloadCSV, money } from '../../components/UI';
import { supplierOpportunities as opportunities, quoteTotal } from '../../data/supplier';
import { FormTextArea, RadioCards } from '../../components/supplier/FormControls';
import { BriefingPanel, DemandCard, OrganizerCard, QuoteFooter, QuoteItemsTable } from '../../components/supplier/QuoteParts';
import { Callout, Chip, LabeledSelect, SearchInput, Tag } from '../../components/supplier/common';
import Icon from '../../components/supplier/Icon';
import { getSupplierInventory, getSupplierOpportunities, getSupplierProposals, saveSupplierProposal } from '../../services/supplier';

const PAYMENTS = ['50% sinal + 50% D+10', 'Faturamento 28 DDL'];
const CRITERIA = [
  'Certidões negativas e documentos fiscais da empresa em dia.',
  'Apólice de seguro de responsabilidade civil vigente para o evento.',
  'Equipe com treinamento e certificações exigidas no memorial descritivo.',
  'Laudos e ART dos equipamentos e estruturas que serão instalados.',
];
const normalize = (text) => text.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');

function databaseOpportunity(event) {
  const submitted = event.proposal && event.proposal.status !== 'Rascunho';
  return {
    ...event,
    subtitle: event.subtitle || event.format || 'Evento publicado',
    proposal: submitted ? event.proposal : null,
    quote: {
      code: event.proposal?.protocol || `EV-${event.id}`,
      lot: event.category,
      venue: event.location,
      audience: event.capacity ? `${event.capacity.toLocaleString('pt-BR')} pessoas` : 'Não informado',
      window: {
        state: submitted ? 'submitted' : 'open',
        pill: submitted ? 'Proposta enviada' : 'Evento publicado',
        note: submitted ? event.proposal.protocol : 'Cotação aberta',
      },
      closesIn: submitted ? 'Proposta enviada' : 'Prazo não informado',
      closesAt: submitted ? `Enviada em ${event.proposal.sentAt}` : `Evento em ${dateLabel(event.date)}`,
      scope: event.description || `Envie sua proposta para o evento ${event.title}.`,
      organizer: { city: event.location, reliability: 'Dados cadastrados na plataforma' },
      docs: [],
    },
  };
}

export default function SupplierQuote() {
  const { id } = useParams();
  const { data, role, update, notify } = useStore();
  const navigate = useNavigate();
  const supplierId = Number(data.supplierProfile?.id);
  const connectedSupplier =
    role === 'fornecedor' && Number.isSafeInteger(supplierId) && supplierId > 0;
  const [databaseEvents, setDatabaseEvents] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [apiError, setApiError] = useState('');
  const [retry, setRetry] = useState(0);
  const demoEvent = opportunities.find((item) => String(item.id) === id);
  const databaseEvent = databaseEvents.find((item) => String(item.id) === id);
  const sourceEvent = connectedSupplier ? databaseEvent : demoEvent;
  const event = sourceEvent && connectedSupplier ? databaseOpportunity(sourceEvent) : sourceEvent;
  const draft = data.proposals.find(
    (proposal) => String(proposal.eventId) === id && proposal.status === 'Rascunho',
  );
  const products = data.inventory.filter((item) => item.status !== 'Inativo');
  const items = event
    ? connectedSupplier
      ? draft?.items?.length
        ? draft.items.map((quoteItem) => {
            const product = products.find((item) => String(item.id) === String(quoteItem.productId));
            return {
              ...quoteItem,
              productId: quoteItem.productId,
              name: product?.name || quoteItem.name,
              spec: product?.description || product?.version || product?.category || '',
              ref: Number(product?.price || quoteItem.price),
              unit: product?.unit || quoteItem.unit,
            };
          })
        : products.map((product) => ({
            productId: product.id,
            name: product.name,
            spec: product.description || product.version || product.category || '',
            qty: 1,
            unit: product.unit,
            ref: Number(product.price),
          }))
      : event.quote.items
    : [];
  const itemSignature = items
    .map((item) => `${item.productId ?? item.id}:${item.ref}:${item.qty}`)
    .join('|');
  const draftSignature = JSON.stringify(draft || null);

  const [prices, setPrices] = useState(() => draft?.prices || items.map((item) => item.price ?? item.offer));
  const [quantities, setQuantities] = useState(() => draft?.items?.map((item) => item.qty) || items.map((item) => item.qty));
  const [note, setNote] = useState(draft?.note || '');
  const [payment, setPayment] = useState(draft?.payment || PAYMENTS[0]);
  const [invalid, setInvalid] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const [modal, setModal] = useState(null); // 'criteria' | doc | 'docs'

  useEffect(() => {
    if (!connectedSupplier) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setLoaded(false);
    Promise.all([
      getSupplierOpportunities(supplierId, controller.signal),
      getSupplierInventory(supplierId, controller.signal),
      getSupplierProposals(supplierId, controller.signal),
    ])
      .then(([events, inventory, proposals]) => {
        setDatabaseEvents(events);
        update('inventory', inventory);
        update('proposals', proposals);
        setLoadError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoaded(true);
        }
      });
    return () => controller.abort();
  }, [connectedSupplier, retry, supplierId, update]);

  useEffect(() => {
    if (!items.length) return;
    setPrices(draft?.items?.length
      ? draft.items.map((item) => item.price)
      : draft?.prices || items.map((item) => item.price ?? item.offer));
    setQuantities(draft?.items?.length
      ? draft.items.map((item) => item.qty)
      : items.map((item) => item.qty));
    setNote(draft?.note || '');
    setPayment(draft?.payment || PAYMENTS[0]);
  }, [connectedSupplier, draftSignature, event?.id, itemSignature]);

  if (connectedSupplier && !loaded && !loadError) {
    return <div className="workspace sp-page"><p role="status">Carregando cotação do banco de dados…</p></div>;
  }
  if (loadError) {
    return (
      <div className="workspace sp-page">
        <div className="api-error" role="alert">
          <span>Não foi possível carregar a cotação: {loadError}</span>
          <button type="button" className="button outline tiny" onClick={() => setRetry((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  if (!event) return <NotFound title="Cotação não encontrada" />;

  const { quote } = event;
  const locked = quote.window.state === 'submitted';
  const lineItems = items.map((item, index) => ({ ...item, qty: quantities[index] ?? item.qty }));
  const total = quoteTotal(lineItems, prices);
  const ceiling = connectedSupplier ? null : quoteTotal(items, items.map((item) => item.ref));
  const opportunityList = connectedSupplier ? databaseEvents.map(databaseOpportunity) : opportunities;
  const categories = ['Todas', ...new Set(opportunityList.map((e) => e.category))];
  const demands = opportunityList.filter(
    (e) =>
      normalize(`${e.title} ${e.subtitle} ${e.organizer}`).includes(normalize(query.trim())) &&
      (category === 'Todas' || e.category === category),
  );
  const openCount = opportunityList.filter((e) => e.quote.window.state !== 'submitted').length;
  const closingCount = opportunityList.filter((e) => e.quote.window.state === 'closing').length;

  async function submit(status) {
    const bad = prices
      .map((value, index) =>
        Number.isFinite(Number(value)) && Number(value) > 0 &&
        Number.isSafeInteger(Number(quantities[index])) && Number(quantities[index]) > 0 ? -1 : index,
      )
      .filter((index) => index >= 0);
    setInvalid(bad);
    if (!items.length || bad.length) {
      if (!items.length) setApiError('Cadastre ao menos um item ativo no inventário antes de enviar uma proposta.');
      document.getElementById(`quote-price-${bad[0]}`)?.focus();
      return;
    }
    const proposal = {
      id: draft?.id || `PRP-${event.date.slice(0, 4)}-${String(Date.now()).slice(-4)}`,
      eventId: connectedSupplier ? Number(id) : id,
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
      items: items.map((item, i) => ({
        productId: item.productId,
        name: item.name,
        qty: Number(quantities[i] ?? item.qty),
        unit: item.unit,
        price: Number(prices[i]),
      })),
      note,
    };
    if (connectedSupplier) {
      try {
        const saved = await saveSupplierProposal(supplierId, {
          proposalId: Number.isSafeInteger(Number(draft?.id)) ? Number(draft.id) : undefined,
          eventId: Number(id),
          status,
          payment,
          note,
          items: proposal.items,
        });
        const persistedProposal = { ...proposal, ...saved, date: proposal.date };
        update('proposals', (old) =>
          draft
            ? old.map((item) => (String(item.id) === String(draft.id) ? persistedProposal : item))
            : [persistedProposal, ...old],
        );
        notify(status === 'Rascunho' ? 'Rascunho salvo no banco de dados.' : 'Proposta enviada para análise.');
        navigate('/fornecedor/propostas');
      } catch (error) {
        setApiError(error.message);
      }
      return;
    }
    update('proposals', (old) => (draft ? old.map((p) => (p.id === draft.id ? proposal : p)) : [proposal, ...old]));
    notify(status === 'Rascunho' ? 'Rascunho da proposta salvo.' : 'Proposta enviada para análise na demonstração.');
    navigate('/fornecedor/propostas');
  }

  function openDoc(doc) {
    if (!doc) {
      setModal('docs');
      return;
    }
    notify(`O edital “${doc.name}” não possui arquivo anexado.`);
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
              {connectedSupplier ? 'Itens ofertados do seu inventário' : 'Itens requisitados para cotação'}{' '}
              <Chip>{items.length} itens</Chip>
            </h2>
            <button type="button" className="sp-link-button" onClick={() => setModal('criteria')}>
              Revisar critérios técnicos de homologação <Icon name="arrow-right" size={13} />
            </button>
          </div>

          <QuoteItemsTable
            items={items}
            prices={prices}
            quantities={quantities}
            invalid={invalid}
            disabled={locked}
            onPrice={(i, value) => setPrices((old) => old.map((v, j) => (j === i ? value : v)))}
            onQuantity={(i, value) => setQuantities((old) => old.map((v, j) => (j === i ? value : v)))}
            editableQuantity={connectedSupplier}
          />
          {apiError && <p role="alert" className="field-error">{apiError}</p>}
          {connectedSupplier && !items.length && (
            <p className="muted">
              Seu inventário não tem itens ativos.{' '}
              <Link className="text-link" to="/fornecedor/inventario">Cadastre produtos ou serviços</Link>
              {' '}para montar a proposta.
            </p>
          )}
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
                A condição de pagamento será registrada na proposta; pagamentos dependem de contrato formal.
              </small>
            </div>
          </div>

          <QuoteFooter total={total} withinCeiling={ceiling === null ? null : total <= ceiling}>
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
