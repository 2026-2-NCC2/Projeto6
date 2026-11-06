// src/services/organizadorService.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data.error || data.message || `Erro de requisição (${response.status})`;
    throw new Error(errorMessage);
  }
  return data;
}

export const organizadorService = {
  // GET /api/organizadores
  async getAll(signal) {
    const res = await fetch(`${API_BASE_URL}/organizadores`, { signal });
    return handleResponse(res);
  },

  // GET /api/organizadores/:id
  async getById(id, signal) {
    const res = await fetch(`${API_BASE_URL}/organizadores/${id}`, { signal });
    return handleResponse(res);
  },

  // POST /api/organizadores
  async create(data) {
    const res = await fetch(`${API_BASE_URL}/organizadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // PUT /api/organizadores/:id
  async update(id, data) {
    const res = await fetch(`${API_BASE_URL}/organizadores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // DELETE /api/organizadores/:id
  async remove(id) {
    const res = await fetch(`${API_BASE_URL}/organizadores/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};