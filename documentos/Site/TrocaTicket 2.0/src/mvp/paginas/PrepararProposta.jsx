import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Field, PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { parseCents } from '../api';
import { MutationError, Price, QueryState, useMutation, useQuery } from '../shared';

export default function PrepararProposta() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const event = useQuery(`/eventos/${id}`);
  const items = useQuery('/fornecedor/produtos');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const action = useMutation(() => navigate('/fornecedor/propostas'));
  const item = items.data?.find((p) => p.id === Number(productId));
  const unitCents = parseCents(price);
  return (
    <div className="workspace narrow">
      <PageTitle title={t('Preparar proposta')} subtitle={event.data?.title} />
      <Panel>
        <QueryState state={event}>
          <QueryState state={items}>
            <form
              className="mvp-stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (unitCents === null) {
                  action.setError(t('Informe um preço válido.'));
                  return;
                }
                action.run('/propostas', {
                  eventId: Number(id),
                  productId: Number(productId),
                  quantity: Number(quantity),
                  unitCents,
                  description,
                });
              }}
            >
              <Field label={t('Produto ou serviço')} name="quote-product">
                <select
                  id="quote-product"
                  required
                  value={productId}
                  onChange={(e) => {
                    const p = items.data.find((x) => x.id === Number(e.target.value));
                    setProductId(e.target.value);
                    setPrice(p ? (p.priceCents / 100).toFixed(2) : '');
                  }}
                >
                  <option value="">{t('Selecione um item')}</option>
                  {items.data
                    ?.filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              {item && (
                <p>
                  {t('Disponíveis')}: {item.available ?? item.stock}
                </p>
              )}
              <div className="form-grid">
                <Field
                  label={t('Quantidade')}
                  name="quote-quantity"
                  type="number"
                  min="1"
                  step="1"
                  max={item?.available ?? item?.stock ?? 1000000}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <Field
                  label={t('Preço por unidade (R$)')}
                  name="quote-price"
                  inputMode="decimal"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <Field label={t('Descrição da proposta')} name="quote-description">
                <textarea
                  id="quote-description"
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <p>
                {t('Total da proposta')}:{' '}
                <strong>
                  <Price value={unitCents === null ? null : unitCents * Number(quantity)} />
                </strong>
              </p>
              <p className="muted">
                {t('A proposta é B2B. Ela não emite ingressos nem gera pagamento real.')}
              </p>
              <MutationError action={action} />
              <button
                className="button primary"
                disabled={!productId || action.busy || event.data?.status !== 'published'}
              >
                {t('Enviar proposta')}
              </button>
              <Link className="button outline" to="/fornecedor/inventario">
                {t('Cadastrar ou editar itens')}
              </Link>
            </form>
          </QueryState>
        </QueryState>
      </Panel>
    </div>
  );
}
