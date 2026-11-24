// Pequenos formatadores compartilhados pelas telas do fornecedor.

// "Carlos Eduardo Mendes" -> "CE"
export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

// 1 -> "I", 2 -> "II", 4 -> "IV"
const ROMAN = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];
export function toRoman(number) {
  let rest = number;
  let out = '';
  for (const [value, symbol] of ROMAN) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}

// Dias entre uma data ISO (AAAA-MM-DD) e hoje. Negativo = data futura.
export const daysSince = (iso) =>
  Math.round((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86400000);

export function agoLabel(iso) {
  const days = daysSince(iso);
  if (days < 0) return '';
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

export const isoDaysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
