// Regras de apresentação do inventário (funcionam também com itens antigos, sem os campos novos).
export const kindOf = (item) => (item.type || '').split(' / ')[0] || 'Item';
export const skuOf = (item) => item.sku || item.id;

// Margem líquida (%) calculada a partir de preço e custo direto; null se não houver custo.
export function marginOf(item) {
  const price = Number(item.price);
  const cost = Number(item.cost);
  if (!price || !cost) return null;
  return Math.round(((price - cost) / price) * 100);
}

export function statusView(item) {
  switch (item.status) {
    case 'Disponível':
      return { tone: 'green', label: 'Disponível' };
    case 'Alocado':
      return { tone: 'amber', label: item.allocatedEvents ? `Alocado (${item.allocatedEvents} evt)` : 'Alocado' };
    case 'Manutenção':
      return { tone: 'gray', label: 'Em manutenção' };
    default:
      return { tone: 'red', label: item.status || 'Inativo' };
  }
}

// Especificações como lista de pares [rótulo, valor]
export const specsOf = (item) =>
  item.specs?.length ? item.specs : item.description ? [['Descrição', item.description]] : [];

// "Rótulo: valor" (uma por linha) <-> [[rótulo, valor]]
export const specsToText = (specs = []) => specs.map(([label, value]) => `${label}: ${value}`).join('\n');
export function textToSpecs(text = '') {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(':');
      return at > 0 ? [line.slice(0, at).trim(), line.slice(at + 1).trim()] : ['Detalhe', line];
    });
}
