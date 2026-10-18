import { exigir, texto, inteiro, centavos } from '../http.js';

// Exportação mantida para os testes e consumidores anteriores.
export function dateSql(value, field) {
  exigir(
    typeof value === 'string' &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value),
    `${field}: informe data e hora com Z ou fuso explícito.`,
  );
  const [ano, mes, dia, hora, minuto, segundo = 0] = value
    .match(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?/)[0]
    .split(/[-T:]/)
    .map(Number);
  exigir(
    mes >= 1 &&
      mes <= 12 &&
      dia >= 1 &&
      dia <= new Date(Date.UTC(ano, mes, 0)).getUTCDate() &&
      hora <= 23 &&
      minuto <= 59 &&
      segundo <= 59,
    `${field}: data inválida.`,
  );
  const data = new Date(value);
  exigir(
    Number.isFinite(data.getTime()) &&
      data.getUTCFullYear() >= 2020 &&
      data.getUTCFullYear() <= 2100,
    `${field}: data inválida.`,
  );
  return data.toISOString().slice(0, 23).replace('T', ' ');
}

export function validarDadosEvento(body, anterior) {
  const title = texto(body.title ?? anterior?.titulo, 'Nome do evento', 255, 3);
  const description = texto(body.description ?? anterior?.description ?? '', 'Descrição', 10000, 0);
  const venue = texto(body.venue ?? anterior?.local, 'Local', 255);
  const category = texto(body.category ?? anterior?.category ?? 'Cultural', 'Categoria', 80);
  const start = body.dateISO ? dateSql(body.dateISO, 'Início') : anterior?.data_hora;
  exigir(start, 'Informe o início do evento.');
  const end = Object.hasOwn(body, 'endsAt')
    ? body.endsAt
      ? dateSql(body.endsAt, 'Término')
      : null
    : anterior?.ends_at || null;
  exigir(
    !end || new Date(`${end.replace(' ', 'T')}Z`) > new Date(`${String(start).replace(' ', 'T')}Z`),
    'O término deve ser posterior ao início.',
  );
  const capacity = inteiro(body.capacity ?? anterior?.publico_max, 'Capacidade', 1, 1000000);
  const status = body.status ?? anterior?.status ?? 'draft';
  exigir(
    ['draft', 'published', 'closed'].includes(status),
    'Estado inválido; cancelamento usa fluxo próprio.',
  );
  if (anterior && anterior.status !== 'draft')
    exigir(status !== 'draft', 'Evento já publicado não pode voltar a rascunho.', 409);
  return { title, description, venue, category, start, end, capacity, status };
}

export function validarCategoria(categoria) {
  const name = texto(categoria.name, 'Nome da categoria', 100);
  const priceCents = centavos(categoria.priceCents);
  const stock = inteiro(categoria.stock, 'Estoque', 0, 1000000);
  exigir(['full', 'half'].includes(categoria.kind), 'Tipo deve ser inteira ou meia.');
  const salesOpen = categoria.salesOpen === undefined ? true : categoria.salesOpen;
  exigir(typeof salesOpen === 'boolean', 'Abertura de vendas inválida.');
  return { name, priceCents, stock, kind: categoria.kind, salesOpen };
}
