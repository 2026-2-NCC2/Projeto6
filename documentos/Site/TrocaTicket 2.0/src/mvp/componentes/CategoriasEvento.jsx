import React from 'react';
import { Field, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';

// Os valores ficam na página; este componente só apresenta os campos e seus eventos.
export default function CategoriasEvento({
  categorias,
  bloqueado,
  salvando,
  aoAlterar,
  aoRemover,
  aoAdicionar,
}) {
  const { t } = useI18n();
  return (
    <Panel
      title={t('Categorias, lotes e estoque')}
      subtitle={t(
        'Cada compra concluída emite uma unidade por ingresso. O estoque total deve caber na capacidade.',
      )}
    >
      <div className="mvp-stack">
        {categorias.map((c, i) => (
          <fieldset className="mvp-category" key={c.key} disabled={bloqueado || salvando}>
            <legend>
              {t('Categoria')} {i + 1}
            </legend>
            <div className="form-grid">
              <Field
                label={t('Nome da categoria')}
                name={`category-name-${c.key}`}
                required
                maxLength={100}
                value={c.name}
                onChange={(e) => aoAlterar(c.key, { name: e.target.value })}
              />
              <Field label={t('Tipo de ingresso')} name={`kind-${c.key}`}>
                <select
                  id={`kind-${c.key}`}
                  value={c.kind}
                  onChange={(e) => aoAlterar(c.key, { kind: e.target.value })}
                >
                  <option value="full">{t('Inteira')}</option>
                  <option value="half">{t('Meia-entrada')}</option>
                </select>
              </Field>
              <Field
                label={t('Preço por unidade (R$)')}
                name={`price-${c.key}`}
                inputMode="decimal"
                required
                value={c.price}
                onChange={(e) => aoAlterar(c.key, { price: e.target.value })}
              />
              <Field
                label={t('Estoque configurado')}
                name={`stock-${c.key}`}
                type="number"
                min="0"
                max="1000000"
                step="1"
                required
                value={c.stock}
                onChange={(e) => aoAlterar(c.key, { stock: e.target.value })}
              />
            </div>
            <label className="mvp-check">
              <input
                type="checkbox"
                checked={c.salesOpen}
                onChange={(e) => aoAlterar(c.key, { salesOpen: e.target.checked })}
              />
              {t('Vendas abertas nesta categoria')}
            </label>
            {c.id ? (
              <p className="muted">
                {t(
                  'Categorias salvas são preservadas. Feche as vendas para interromper novas reservas.',
                )}
              </p>
            ) : (
              <button type="button" className="text-link" onClick={() => aoRemover(c.key)}>
                {t('Remover categoria ainda não salva')}
              </button>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          className="button outline"
          disabled={bloqueado || categorias.length >= 20}
          onClick={aoAdicionar}
        >
          + {t('Adicionar categoria')}
        </button>
      </div>
    </Panel>
  );
}
