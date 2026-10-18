import React, { useState } from 'react';
import { Field, PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { parseCents } from '../api';
import { MutationError, Price, QueryState, Status, useMutation, useQuery } from '../shared';

export default function InventarioFornecedor() {
  const { t } = useI18n();
  const state = useQuery('/fornecedor/produtos');
  const blank = { name: '', description: '', type: 'S', price: '', stock: '1', active: true };
  const [values, setValues] = useState(blank);
  const [id, setId] = useState(null);
  const [saved, setSaved] = useState(false);
  const action = useMutation(() => {
    setSaved(true);
    setValues(blank);
    setId(null);
    state.reload();
  });
  function edit(item) {
    setSaved(false);
    setId(item.id);
    setValues({
      name: item.name,
      description: item.description,
      type: item.type,
      price: (item.priceCents / 100).toFixed(2),
      stock: String(item.stock),
      active: item.active,
    });
  }
  function change(e) {
    setSaved(false);
    setValues((v) => ({
      ...v,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));
  }
  function save(e) {
    e.preventDefault();
    const priceCents = parseCents(values.price);
    if (priceCents === null) {
      action.setError(t('Informe um preço válido.'));
      return;
    }
    action.run(
      id ? `/produtos/${id}` : '/produtos',
      {
        name: values.name,
        description: values.description,
        type: values.type,
        priceCents,
        stock: Number(values.stock),
        active: values.active,
      },
      id ? 'PUT' : 'POST',
    );
  }
  return (
    <div className="workspace">
      <PageTitle
        title={t('Inventário de produtos e serviços')}
        subtitle={t('Cadastre recursos fictícios para compor propostas aos organizadores.')}
      />
      <div className="mvp-flow-grid">
        <Panel title={t('Itens cadastrados')}>
          <QueryState state={state}>
            {state.data?.length ? (
              <div className="mvp-stack">
                {state.data.map((item) => (
                  <article className="mvp-list-row" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <p>
                        <Price value={item.priceCents} /> · {t('Estoque configurado')}: {item.stock}{' '}
                        · {t('Disponíveis')}: {item.available ?? item.stock}
                      </p>
                      <Status value={item.active ? 'active' : 'closed'} />
                    </div>
                    <button className="button outline" onClick={() => edit(item)}>
                      {t('Editar')}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p>{t('Nenhum item cadastrado.')}</p>
            )}
          </QueryState>
        </Panel>
        <Panel title={t(id ? 'Editar item' : 'Adicionar item')}>
          <form onSubmit={save} className="mvp-stack">
            <Field
              label={t('Nome')}
              name="name"
              required
              maxLength={255}
              value={values.name}
              onChange={change}
            />
            <Field label={t('Descrição')} name="description">
              <textarea
                id="description"
                name="description"
                maxLength={500}
                value={values.description}
                onChange={change}
              />
            </Field>
            <Field label={t('Tipo')} name="type">
              <select id="type" name="type" value={values.type} onChange={change}>
                <option value="P">{t('Produto')}</option>
                <option value="S">{t('Serviço')}</option>
              </select>
            </Field>
            <div className="form-grid">
              <Field
                label={t('Preço por unidade (R$)')}
                name="price"
                inputMode="decimal"
                required
                value={values.price}
                onChange={change}
              />
              <Field
                label={t('Estoque configurado')}
                name="stock"
                type="number"
                min="0"
                max="1000000"
                step="1"
                required
                value={values.stock}
                onChange={change}
              />
            </div>
            <label className="mvp-check">
              <input name="active" type="checkbox" checked={values.active} onChange={change} />
              {t('Item ativo no catálogo')}
            </label>
            <MutationError action={action} />
            {saved && <p role="status">{t('Alterações salvas no banco.')}</p>}
            <button className="button primary" disabled={action.busy}>
              {t('Salvar item')}
            </button>
            {id && (
              <button
                type="button"
                className="button outline"
                onClick={() => {
                  setValues(blank);
                  setId(null);
                }}
              >
                {t('Cancelar edição')}
              </button>
            )}
          </form>
        </Panel>
      </div>
    </div>
  );
}
