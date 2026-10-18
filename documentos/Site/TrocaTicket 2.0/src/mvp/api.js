// A sessão fica no cookie HttpOnly; o token CSRF existe apenas nesta memória.
let csrfToken = null;
export function setCsrfToken(value) {
  csrfToken = value || null;
}
export function operationKey() {
  return crypto.randomUUID();
}
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export async function api(path, { method = 'GET', body, signal, key } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method)) {
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    headers['Idempotency-Key'] = key || operationKey();
  }
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(
      'Não foi possível conectar à API local. Confira se o servidor está iniciado e tente novamente.',
      0,
      'NETWORK',
    );
  }
  const contentType = response.headers.get('content-type') || '';
  const data =
    response.status === 204
      ? null
      : contentType.includes('application/json')
        ? await response.json()
        : null;
  if (!response.ok)
    throw new ApiError(
      data?.error || data?.message || 'A operação não pôde ser concluída.',
      response.status,
      data?.code,
    );
  if (response.status !== 204 && data === null)
    throw new ApiError(
      'A API respondeu em um formato inesperado. Confira a conexão local.',
      502,
      'FORMAT',
    );
  return data;
}
export function parseCents(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [integer, decimal = ''] = text.split('.');
  const result = Number(integer) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}
export function moneyCents(value, locale = 'pt-BR') {
  return Number.isSafeInteger(value)
    ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value / 100)
    : '—';
}
export function dateTime(value, locale = 'pt-BR') {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(date);
}
