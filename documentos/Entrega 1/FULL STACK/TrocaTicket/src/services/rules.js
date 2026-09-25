export function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function validAmount(value, allowZero = false) {
  if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') return false;
  const number = Number(value);
  return (
    Number.isFinite(number) &&
    number >= (allowZero ? 0 : 0.01) &&
    number <= 1e9 &&
    Math.abs(number * 100 - Math.round(number * 100)) < 0.0001
  );
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateEvent(form, tickets = []) {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = 'Informe um nome com pelo menos 3 caracteres.';
  if (!form.location.trim()) errors.location = 'Informe o local.';
  if (!validDate(form.date)) errors.date = 'Informe uma data de início válida.';
  if (!validDate(form.endDate)) errors.endDate = 'Informe uma data de término válida.';
  for (const field of ['time', 'endTime']) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form[field]))
      errors[field] = 'Informe um horário válido.';
  }
  if (
    !errors.date &&
    !errors.endDate &&
    !errors.time &&
    !errors.endTime &&
    `${form.endDate}T${form.endTime}` <= `${form.date}T${form.time}`
  )
    errors.endDate = 'O término deve ser posterior ao início.';
  if (
    !Number.isSafeInteger(Number(form.capacity)) ||
    Number(form.capacity) < 1 ||
    Number(form.capacity) > 1000000
  )
    errors.capacity = 'Informe uma capacidade inteira entre 1 e 1.000.000.';
  const reserved = tickets
    .filter((ticket) => ticket.eventId === form.id && ticket.status !== 'Cancelado')
    .reduce((total, ticket) => total + ticket.quantity, 0);
  if (Number(form.capacity) < reserved)
    errors.capacity = `Já existem ${reserved} ingressos reservados. A capacidade não pode ser menor.`;
  if (!validAmount(form.price, true))
    errors.price = 'Informe um preço válido com até 2 casas decimais (zero para gratuito).';
  return errors;
}

export function reservationError(event, quantity, tickets = []) {
  if (event.status && event.status !== 'Publicado')
    return 'Este evento não está disponível para reservas.';
  const count = Number(quantity);
  if (!Number.isInteger(count) || count < 1 || count > 6)
    return 'Escolha uma quantidade inteira entre 1 e 6.';
  const reserved = tickets
    .filter((t) => t.eventId === event.id && t.status !== 'Cancelado')
    .reduce((sum, t) => sum + t.quantity, 0);
  if (event.capacity && reserved + count > event.capacity)
    return 'Não há capacidade disponível para essa quantidade.';
  return '';
}

export function lineTotal(items, prices) {
  return (
    items.reduce((sum, item, i) => sum + item[1] * Math.round(Number(prices[i] || 0) * 100), 0) /
    100
  );
}

export function csvText(rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n');
}

export function restoreData(saved, defaults) {
  if (saved?.version !== 2 || !saved.data || typeof saved.data !== 'object')
    return structuredClone(defaults);
  const result = structuredClone(defaults);
  for (const key of Object.keys(defaults)) {
    if (!Array.isArray(defaults[key]) || !Array.isArray(saved.data[key])) continue;
    const example = defaults[key][0];
    const rowValid = (row) => {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string') return false;
      if (example)
        return Object.entries(example).every(([field, value]) =>
          Array.isArray(value)
            ? Array.isArray(row[field]) && row[field].every((v) => typeof v === 'string')
            : typeof row[field] === typeof value &&
              (typeof value !== 'number' || Number.isFinite(row[field])),
        );
      if (key === 'messages') return typeof row.text === 'string' && typeof row.name === 'string';
      if (key === 'tickets')
        return (
          ['eventId', 'title', 'image', 'type', 'status'].every(
            (field) => typeof row[field] === 'string',
          ) &&
          Number.isInteger(row.quantity) &&
          row.quantity > 0 &&
          validAmount(row.total, true)
        );
      return true;
    };
    const values = saved.data[key];
    if (key === 'favorites') result[key] = values.filter((value) => typeof value === 'string');
    else {
      const ids = new Set();
      const validRows = values
        .filter((row) => {
          if (!rowValid(row) || !row.id.trim() || ids.has(row.id)) return false;
          ids.add(row.id);
          return true;
        })
        .map((row) => {
          const clean = { ...row };
          // Campos opcionais também precisam de validação antes de serem usados nas telas.
          for (const field of ['note', 'recipient', 'date', 'location']) {
            if (field in clean && typeof clean[field] !== 'string') delete clean[field];
          }
          if ('confirmations' in clean)
            clean.confirmations = Array.isArray(clean.confirmations)
              ? clean.confirmations.filter((id) => typeof id === 'string')
              : [];
          if (
            'prices' in clean &&
            (!Array.isArray(clean.prices) || !clean.prices.every((value) => validAmount(value)))
          )
            delete clean.prices;
          if ('resalePrice' in clean && !validAmount(clean.resalePrice, true))
            delete clean.resalePrice;
          if (
            'items' in clean &&
            (!Array.isArray(clean.items) ||
              !clean.items.every(
                (item) =>
                  item &&
                  typeof item.name === 'string' &&
                  Number.isInteger(item.quantity) &&
                  item.quantity > 0 &&
                  typeof item.unit === 'string' &&
                  validAmount(item.price),
              ))
          )
            delete clean.items;
          return clean;
        });
      if (values.length === 0 || validRows.length) result[key] = validRows;
    }
  }
  const profile = saved.data.profile;
  if (profile && typeof profile === 'object') {
    for (const key of ['name', 'email', 'phone', 'photo', 'timezone'])
      if (typeof profile[key] === 'string') result.profile[key] = profile[key];
    if (
      Array.isArray(profile.preferences) &&
      profile.preferences.length === 4 &&
      profile.preferences.every((value) => typeof value === 'boolean')
    )
      result.profile.preferences = profile.preferences;
  }
  return result;
}
