import { API_URL } from './api';

async function request(path, options, fallback) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API. Verifique se o servidor está rodando.', {
      cause: error,
    });
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Resposta inválida do servidor.');
  }
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

const json = (method, body, signal) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal,
});

export function getSupplierProfile(id, signal) {
  return request(`/fornecedores/${encodeURIComponent(id)}/perfil`, { signal }, 'Não foi possível carregar o perfil do fornecedor.');
}

export function saveSupplierProfile(id, profile) {
  return request(
    `/fornecedores/${encodeURIComponent(id)}/perfil`,
    json('PUT', profile),
    'Não foi possível salvar o perfil do fornecedor.',
  );
}

export function getSupplierInventory(id, signal) {
  return request(`/fornecedores/${encodeURIComponent(id)}/produtos`, { signal }, 'Não foi possível carregar o inventário.');
}

export function saveSupplierProduct(id, product) {
  const isUpdate = Number.isSafeInteger(Number(product.id));
  const path = `/fornecedores/${encodeURIComponent(id)}/produtos${isUpdate ? `/${encodeURIComponent(product.id)}` : ''}`;
  return request(path, json(isUpdate ? 'PUT' : 'POST', product), 'Não foi possível salvar o item.');
}

export function getSupplierOpportunities(id, signal) {
  return request(`/fornecedores/${encodeURIComponent(id)}/oportunidades`, { signal }, 'Não foi possível carregar as oportunidades.');
}

export function getSupplierProposals(id, signal) {
  return request(`/fornecedores/${encodeURIComponent(id)}/propostas`, { signal }, 'Não foi possível carregar as propostas.');
}

export function saveSupplierProposal(id, proposal) {
  const path = `/fornecedores/${encodeURIComponent(id)}/propostas`;
  return request(path, json('POST', proposal), 'Não foi possível salvar a proposta.');
}

export function getPublicSupplierOpportunities(signal) {
  return request('/oportunidades', { signal }, 'Não foi possível carregar os eventos disponíveis.');
}
