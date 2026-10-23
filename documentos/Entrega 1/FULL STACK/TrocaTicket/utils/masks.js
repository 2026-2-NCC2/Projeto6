// Máscaras simples para inputs controlados: recebem o texto digitado e devolvem o formatado.
export const onlyDigits = (value = '') => String(value).replace(/\D/g, '');

function applyPattern(digits, pattern) {
  let i = 0;
  let out = '';
  for (const char of pattern) {
    if (i >= digits.length) break;
    out += char === '#' ? digits[i++] : char;
  }
  return out;
}

export const maskCnpj = (value) => applyPattern(onlyDigits(value).slice(0, 14), '##.###.###/####-##');
export const maskCep = (value) => applyPattern(onlyDigits(value).slice(0, 8), '#####-###');
export const maskPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  return applyPattern(digits, digits.length > 10 ? '(##) #####-####' : '(##) ####-####');
};
