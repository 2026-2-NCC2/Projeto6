import React, { useState } from 'react';
import { useStore } from '../context/Store';

export default function Profile() {
  const { notify } = useStore();

  // Puxa estritamente o que foi salvo no localStorage ou usa vazios para depurar
  const [name, setName] = useState(localStorage.getItem('userName') || 'Felipe');
  const [email, setEmail] = useState(
    localStorage.getItem('userEmail') || localStorage.getItem('user_email') || 'felipe@exemplo.com',
  );
  const [phone, setPhone] = useState(localStorage.getItem('userPhone') || '(11) 98452-1100');

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userPhone', phone);
    notify('Perfil atualizado com sucesso!');
  };

  const userInitials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <section className="inner-page">
      <div className="detail-card" style={{ maxWidth: '700px' }}>
        <h1>Configurações & Perfil</h1>
        <p>Gerencie seus dados de demonstração e suas preferências de comunicação.</p>

        {/* Card do Avatar e Nome Principal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            background: '#f8f9fc',
            padding: '20px',
            borderRadius: '12px',
            margin: '24px 0',
            border: '1px solid #dce2ed',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#5440eb',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              fontSize: '22px',
              fontWeight: 'bold',
            }}
          >
            {userInitials || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>{name}</h2>
            <p style={{ margin: 0, color: '#697991', fontSize: '13px' }}>{email}</p>
          </div>
        </div>

        {/* Formulário de Edição de Perfil */}
        <form
          onSubmit={handleSave}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                fontSize: '12px',
                textTransform: 'uppercase',
                marginBottom: '6px',
                color: '#697991',
              }}
            >
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '7px',
                border: '1px solid #c9d2e1',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                fontSize: '12px',
                textTransform: 'uppercase',
                marginBottom: '6px',
                color: '#697991',
              }}
            >
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '7px',
                border: '1px solid #c9d2e1',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontWeight: '600',
                fontSize: '12px',
                textTransform: 'uppercase',
                marginBottom: '6px',
                color: '#697991',
              }}
            >
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '7px',
                border: '1px solid #c9d2e1',
                fontSize: '14px',
              }}
            />
          </div>

          <button
            type="submit"
            className="button primary"
            style={{ marginTop: '10px', justifyContent: 'center' }}
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </section>
  );
}
