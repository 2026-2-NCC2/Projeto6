import React, { useState } from 'react';
import { FormInput } from './FormControls';

/*
 * Troca de senha (opcional), controlada pelo pai.
 *  - values: { current, next, confirm }
 *  - errors: objeto indexado pelo id de cada campo ({prefix}-currentPassword, …)
 */
export default function PasswordSection({ values, onChange, errors = {}, idPrefix = 'sp' }) {
  const [show, setShow] = useState(false);
  const type = show ? 'text' : 'password';
  const set = (key) => (value) => onChange({ ...values, [key]: value });
  return (
    <>
      <div className="sp-form-grid cols-3">
        <FormInput
          label="Senha atual"
          name={`${idPrefix}-currentPassword`}
          type={type}
          autoComplete="current-password"
          value={values.current}
          error={errors[`${idPrefix}-currentPassword`]}
          onChange={set('current')}
        />
        <FormInput
          label="Nova senha"
          name={`${idPrefix}-newPassword`}
          type={type}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={values.next}
          error={errors[`${idPrefix}-newPassword`]}
          onChange={set('next')}
        />
        <FormInput
          label="Confirmar senha"
          name={`${idPrefix}-confirmPassword`}
          type={type}
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          value={values.confirm}
          error={errors[`${idPrefix}-confirmPassword`]}
          onChange={set('confirm')}
        />
      </div>
      <label className="sp-check sp-show-password">
        <input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} /> Mostrar senhas
      </label>
    </>
  );
}
