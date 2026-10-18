import { exigir, idValido, texto, inteiro, centavos } from '../http.js';

export function validarDadosProduto(body, anterior) {
  const name = texto(body.name ?? anterior?.name, 'Nome', 255);
  const description = texto(body.description ?? anterior?.description ?? '', 'Descrição', 500, 0);
  const type = body.type ?? anterior?.type;
  const priceCents = centavos(body.priceCents ?? anterior?.priceCents);
  const stock = inteiro(body.stock ?? anterior?.stock, 'Estoque', 0, 1000000);
  const active = body.active ?? (anterior ? Boolean(anterior.active) : true);
  exigir(['P', 'S'].includes(type), 'Tipo deve ser produto (P) ou serviço (S).');
  exigir(typeof active === 'boolean', 'Situação inválida.');
  return { name, description, type, priceCents, stock, active };
}

export function validarDadosProposta(body) {
  const eventId = idValido(body.eventId);
  const productId = idValido(body.productId);
  const quantity = inteiro(body.quantity, 'Quantidade', 1, 1000000);
  const unitCents = centavos(body.unitCents);
  const description = texto(body.description || '', 'Descrição', 500, 0);
  const total = quantity * unitCents;
  exigir(
    Number.isSafeInteger(total) && total <= 999999999,
    'Total da proposta excede o limite da demonstração.',
  );
  return { eventId, productId, quantity, unitCents, description };
}
