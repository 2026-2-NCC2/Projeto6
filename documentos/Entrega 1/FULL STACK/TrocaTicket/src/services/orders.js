// Pedidos, pagamento simulado, cancelamento e estorno (etapa 3 da integração com a TrocaTicket 2.0).
// Toda gravação leva o cabeçalho Idempotency-Key: repetir a mesma ação não compra em dobro.
import { API_URL, apiFetch } from './api';

export function criarChave() {
  if (globalThis.crypto?.randomUUID) return `pedido-${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return `pedido-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function request(path, options, fallback) {
  let response;
  try {
    response = await apiFetch(`${API_URL}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // Sem resposta: a ação pode ter sido registrada. Quem chama repete com a mesma chave.
    const semResposta = new Error(
      'Não foi possível conectar à API. Verifique se o servidor e o banco estão ativos.',
      { cause: error },
    );
    semResposta.semResposta = true;
    throw semResposta;
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('A API retornou uma resposta inválida.');
  }
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

const gravar = (path, body, chave, fallback) =>
  request(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': chave },
      body: JSON.stringify(body || {}),
    },
    fallback,
  );

export const listarPedidos = (signal) =>
  request('/pedidos', { signal }, 'Não foi possível carregar seus pedidos.');

export const reservarPedido = ({ eventId, type, quantity, halfDeclaration }, chave) =>
  gravar(
    '/pedidos',
    { eventId, type, quantity, halfDeclaration },
    chave,
    'Não foi possível reservar os ingressos.',
  );

export const pagarPedido = (pedidoId, paymentMethod, chave) =>
  gravar(
    `/pedidos/${encodeURIComponent(pedidoId)}/pagar`,
    { paymentMethod },
    chave,
    'Não foi possível concluir o pagamento simulado.',
  );

export const cancelarPedido = (pedidoId, chave) =>
  gravar(
    `/pedidos/${encodeURIComponent(pedidoId)}/cancelar`,
    {},
    chave,
    'Não foi possível cancelar a reserva.',
  );

export const estornarPedido = (pedidoId, chave) =>
  gravar(
    `/pedidos/${encodeURIComponent(pedidoId)}/estornar`,
    {},
    chave,
    'Não foi possível registrar o estorno.',
  );

export const SITUACAO_PEDIDO = {
  reservado: ['Aguardando pagamento', 'amber'],
  pago: ['Pago', 'green'],
  cancelado: ['Reserva cancelada', 'red'],
  expirado: ['Reserva expirada', 'red'],
  recusado: ['Pagamento recusado', 'red'],
  estornado: ['Estornado', 'blue'],
  estornado_parcial: ['Estornado em parte', 'blue'],
};

export const FORMA_PAGAMENTO = {
  pix: 'Pix (simulado)',
  cartao: 'Cartão (simulado)',
  gratuito: 'Gratuito',
  direto: 'Compra direta (simulada)',
};

// Horário local até quando a reserva vale, a partir dos segundos informados pela API.
export const horaLimite = (segundos) =>
  new Date(Date.now() + segundos * 1000).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
