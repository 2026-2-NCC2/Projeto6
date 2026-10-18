export class ErroHttp extends Error {
  constructor(status, message, code = 'VALIDATION') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function exigir(condition, message, status = 400, code) {
  if (!condition) throw new ErroHttp(status, message, code);
}
export function idValido(value) {
  const id = Number(value);
  exigir(
    /^\d+$/.test(String(value)) && Number.isSafeInteger(id) && id > 0 && id <= 2147483647,
    'Identificador inválido.',
  );
  return id;
}
export function texto(value, field, max = 255, min = 1) {
  exigir(
    typeof value === 'string' && value.trim().length >= min && value.trim().length <= max,
    `${field}: informe entre ${min} e ${max} caracteres.`,
  );
  return value.trim();
}
export function inteiro(value, field, min = 0, max = 100000000) {
  exigir(
    Number.isSafeInteger(value) && value >= min && value <= max,
    `${field}: informe um número inteiro entre ${min} e ${max}.`,
  );
  return value;
}
export function centavos(value, field = 'Valor') {
  return inteiro(value, field, 0, 999999999);
}
export function semPrivilegios(body) {
  exigir(
    !['admin', 'approval', 'tipo_perfil', 'status_aprovacao', 'userId', 'usuario_id'].some((k) =>
      Object.hasOwn(body, k),
    ),
    'Permissões são definidas no servidor.',
    403,
    'FORBIDDEN',
  );
}
export function urlImagem(value) {
  if (!value) return null;
  exigir(typeof value === 'string' && value.length <= 500, 'Endereço de imagem inválido.');
  if (/^\/images\/[\w./%-]+$/.test(value) && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    exigir(
      url.protocol === 'https:' && !url.username && !url.password,
      'Use imagem HTTPS ou da pasta images.',
    );
    return url.href;
  } catch {
    throw new ErroHttp(400, 'Use imagem HTTPS ou da pasta images.');
  }
}
