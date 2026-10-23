import React, { useState } from 'react';
import { Modal } from '../UI';
import { inventoryStatuses, inventoryTypes, supplierCategories } from '../../data/supplier';
import { specsToText, textToSpecs } from '../../utils/inventory';
import { FormInput, FormSelect, FormTextArea } from './FormControls';

/* Formulário (modal) para criar ou editar um item do catálogo. onSave recebe o item já normalizado. */
export default function ItemFormModal({ item, onSave, onClose }) {
  const [kind, subtype = ''] = (item.type || 'Produto').split(' / ');
  const [form, setForm] = useState({
    name: item.name || '',
    version: item.version || '',
    category: item.category || supplierCategories[0],
    kind: inventoryTypes.includes(kind) ? kind : 'Produto',
    subtype,
    unit: item.unit || 'Unidade / Diária',
    price: item.price ?? '',
    cost: item.cost ?? '',
    status: item.status || 'Disponível',
    description: item.description || '',
    specsText: specsToText(item.specs),
  });
  const [errors, setErrors] = useState({});
  const set = (key) => (value) => setForm((old) => ({ ...old, [key]: value }));

  function submit(event) {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 3) next['item-name'] = 'Informe o nome do item (mínimo 3 letras).';
    if (!form.unit.trim()) next['item-unit'] = 'Informe a unidade de cobrança.';
    if (!(Number(form.price) > 0)) next['item-price'] = 'Informe um valor maior que zero.';
    if (form.cost !== '' && Number(form.cost) < 0) next['item-cost'] = 'O custo não pode ser negativo.';
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    onSave({
      ...item,
      name: form.name.trim(),
      version: form.version.trim(),
      category: form.category,
      type: form.subtype.trim() ? `${form.kind} / ${form.subtype.trim()}` : form.kind,
      unit: form.unit.trim(),
      price: Number(form.price),
      cost: form.cost === '' ? 0 : Number(form.cost),
      status: form.status,
      description: form.description.trim(),
      specs: textToSpecs(form.specsText),
    });
  }

  return (
    <Modal title={item.id ? 'Editar item' : 'Novo item do catálogo'} onClose={onClose}>
      <form noValidate onSubmit={submit} className="sp-form">
        <FormInput label="Nome do item" name="item-name" required value={form.name} error={errors['item-name']} onChange={set('name')} />
        <FormInput label="Versão / variação" name="item-version" value={form.version} onChange={set('version')} />
        <div className="sp-form-grid">
          <FormSelect label="Categoria" name="item-category" options={supplierCategories} value={form.category} onChange={set('category')} />
          <FormSelect label="Tipo" name="item-kind" options={inventoryTypes} value={form.kind} onChange={set('kind')} />
          <FormInput label="Subtipo" name="item-subtype" placeholder="Ex.: Estrutura, Mão de obra" value={form.subtype} onChange={set('subtype')} />
          <FormInput label="Unidade" name="item-unit" required value={form.unit} error={errors['item-unit']} onChange={set('unit')} />
          <FormInput
            label="Valor de referência (R$)"
            name="item-price"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.price}
            error={errors['item-price']}
            onChange={set('price')}
          />
          <FormInput
            label="Custo direto (R$)"
            name="item-cost"
            type="number"
            min="0"
            step="0.01"
            hint="Usado para calcular a margem líquida."
            value={form.cost}
            error={errors['item-cost']}
            onChange={set('cost')}
          />
          <FormSelect label="Status" name="item-status" options={inventoryStatuses} value={form.status} onChange={set('status')} />
        </div>
        <FormTextArea label="Descrição técnica" name="item-description" rows={3} value={form.description} onChange={set('description')} />
        <FormTextArea
          label="Especificações (uma por linha)"
          name="item-specs"
          rows={4}
          hint="Formato: Rótulo: valor — ex.: Dimensões: 4,00 m x 2,20 m"
          value={form.specsText}
          onChange={set('specsText')}
        />
        <button className="button blue-button full">Salvar item</button>
      </form>
    </Modal>
  );
}
