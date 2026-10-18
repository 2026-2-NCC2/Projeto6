import { createHash, randomBytes } from 'node:crypto';

export class ErroTransacao extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const falhar = (status, message) => {
  throw new ErroTransacao(status, message);
};
export function inteiro(value, name = 'Identificador', minimum = 1, maximum = 2147483647) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    falhar(400, `${name} inválido.`);
  return value;
}
export function texto(value, name, maximum = 500) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum)
    falhar(400, `${name} inválido.`);
  return value.trim();
}
export function tetoRepasse(originalCents, costCents) {
  inteiro(originalCents, 'Valor original', 0);
  inteiro(costCents, 'Custo', 0);
  return Math.min(originalCents, costCents);
}
export function validarPrecoRepasse(price, original, cost) {
  inteiro(price, 'Preço em centavos', 1);
  if (price > tetoRepasse(original, cost))
    falhar(409, 'Preço acima do teto de repasse desta unidade.');
  return price;
}
export function campos(body, permitted) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !permitted.includes(key))
  )
    falhar(400, 'Campos não permitidos nesta operação.');
  return body;
}
function ordenado(value) {
  if (Array.isArray(value)) return value.map(ordenado);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, ordenado(value[key])]),
    );
  return value;
}
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const hashPayload = (operation, body) => hash(JSON.stringify(ordenado({ operation, body })));
export const novaCredencial = () => randomBytes(32).toString('hex');
export function chaveIdempotente(key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_.:-]{16,120}$/.test(key))
    falhar(400, 'Informe uma Idempotency-Key de 16 a 120 caracteres.');
  return key;
}
export const dataISO = (value) =>
  value == null
    ? null
    : value instanceof Date
      ? value.toISOString()
      : `${String(value).replace(' ', 'T').replace(/Z$/, '')}Z`;
