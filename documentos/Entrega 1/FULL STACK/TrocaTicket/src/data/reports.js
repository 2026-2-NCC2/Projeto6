// Dados estáticos dos relatórios gerenciais. Todo evento usa a mesma estrutura:
// basta incluir uma nova chave em `definitions` (o id deve existir em `opportunities`).

export const SECTORS = [
  'Pista Premium',
  'Pista Comum',
  'Cadeira Inferior',
  'Camarote Gold',
  'VIP Lounge',
];
export const CHANNELS = ['Site', 'Aplicativo', 'Parceiros', 'Bilheteria', 'Outros'];
export const AGES = ['18–24 anos', '25–34 anos', '35–44 anos', '45–59 anos', '60+ anos'];
export const CHART_COLORS = ['#243c91', '#2860ee', '#13a3d7', '#ff7914', '#0cba86'];

const definitions = {
  'tim-maia': {
    tag: 'Show Holográfico Especial / Turnê Nacional',
    status: 'Vendas Ativas',
    tagline: 'Mega Produção Imersiva • Sistema Holográfico HD 360°',
    venue: 'Arena Carioca',
    city: 'Rio de Janeiro, RJ',
    rating: 5,
    doors: '19:00',
    start: '21:30',
    lot: 'Lote 04 (Final)',
    producer: 'Som & Alma Ent.',
    capacity: 85000,
    sold: 80000,
    avgTicket: 310,
    projection: 12,
    exchanges: 3420,
    conversion: '94,8%',
    shares: {
      sector: [35, 25, 20, 15, 5],
      channel: [40, 30, 15, 10, 5],
      age: [25, 40, 20, 10, 5],
    },
    transactions: { count: 48, firstId: 89231, salesDay: '2031-10-18' },
  },
  'lil-peep': {
    tag: 'Turnê Mundial / Memorial',
    status: 'Em auditoria',
    tagline: 'Memorial World Arena Tour • Experiência imersiva',
    venue: 'Arena Paulista',
    city: 'São Paulo, SP',
    rating: 4,
    doors: '18:00',
    start: '20:00',
    lot: 'Lote 02',
    producer: 'SoundWave Live Latam',
    capacity: 20000,
    sold: 16000,
    avgTicket: 280,
    projection: 8,
    exchanges: 1890,
    conversion: '87,4%',
    shares: {
      sector: [30, 30, 20, 12, 8],
      channel: [45, 35, 10, 5, 5],
      age: [40, 35, 15, 7, 3],
    },
    transactions: { count: 36, firstId: 71840, salesDay: '2031-03-09' },
  },
  michael: {
    tag: 'Experiência Imersiva / Tributo',
    status: 'Pré-venda ativa',
    tagline: 'The Last Dance • Show de encerramento de turnê',
    venue: 'Estádio Nacional',
    city: 'Brasília, DF',
    rating: 5,
    doors: '17:00',
    start: '20:30',
    lot: 'Lote 01 (Pré-venda)',
    producer: 'Legacy Global Entertainment',
    capacity: 50000,
    sold: 42000,
    avgTicket: 450,
    projection: 5,
    exchanges: 8950,
    conversion: '99,2%',
    shares: {
      sector: [28, 22, 25, 15, 10],
      channel: [35, 25, 20, 15, 5],
      age: [10, 25, 30, 25, 10],
    },
    transactions: { count: 42, firstId: 64520, salesDay: '2028-06-24' },
  },
};

const SECTOR_PRICE_WEIGHT = [1.35, 0.85, 0.65, 3, 4.8];
const KINDS = [
  'Meia Entrada & Inteira',
  'Transferência Nominal',
  'Cota Solidária',
  'Validação de Titularidade',
  'Inteira Padrão',
];
const STATUSES = ['Aprovado', 'Pendente', 'Aprovado', 'Em Revisão', 'Aprovado', 'Aprovado'];

const pad = (n) => String(n).padStart(2, '0');
const distribution = (labels, shares, sold) =>
  labels.map((label, i) => ({
    label,
    share: shares[i],
    value: Math.round((sold * shares[i]) / 100),
    color: CHART_COLORS[i],
  }));

// Preço por setor ajustado para que a média ponderada seja o ticket médio do evento.
function sectorPrices(avgTicket, shares) {
  const norm = SECTOR_PRICE_WEIGHT.reduce((sum, w, i) => sum + (w * shares[i]) / 100, 0);
  return SECTOR_PRICE_WEIGHT.map((w) => Math.round((avgTicket * w) / norm / 10) * 10);
}

function buildTransactions({ count, firstId, salesDay }, avgTicket, sectorShares) {
  const prices = sectorPrices(avgTicket, sectorShares);
  const [year, month, day] = salesDay.split('-').map(Number);
  const base = Date.UTC(year, month - 1, day, 17, 32, 10);
  return Array.from({ length: count }, (_, i) => {
    const sector = (i * 2 + (i % 3)) % SECTORS.length;
    const qty = ((i * 5 + 3) % 6) + 1;
    const lot = ((i * 7 + 2) % 4) + 1;
    const moment = new Date(base - i * 83 * 60000 - (i % 7) * 11000);
    return {
      id: `#TRX-${firstId - i}-LT${lot}`,
      sector: SECTORS[sector],
      detail: `Lote ${pad(lot)} • ${KINDS[(i + sector) % KINDS.length]}`,
      date: `${pad(moment.getUTCDate())}/${pad(moment.getUTCMonth() + 1)}/${moment.getUTCFullYear()}`,
      time: `${pad(moment.getUTCHours())}:${pad(moment.getUTCMinutes())}:${pad(moment.getUTCSeconds())}`,
      qty,
      total: qty * prices[sector],
      status: STATUSES[(i * 3 + 1) % STATUSES.length],
    };
  });
}

export const eventReports = Object.fromEntries(
  Object.entries(definitions).map(([id, d]) => [
    id,
    {
      ...d,
      occupancy: Math.round((d.sold / d.capacity) * 1000) / 10,
      remaining: d.capacity - d.sold,
      revenue: d.sold * d.avgTicket,
      groups: {
        sector: distribution(SECTORS, d.shares.sector, d.sold),
        channel: distribution(CHANNELS, d.shares.channel, d.sold),
        age: distribution(AGES, d.shares.age, d.sold),
      },
      transactions: buildTransactions(d.transactions, d.avgTicket, d.shares.sector),
    },
  ]),
);

// Cor do selo de situação do evento (usada no relatório e no painel do administrador).
export const STATUS_TONE = {
  'Vendas Ativas': 'green',
  'Em auditoria': 'blue',
  'Pré-venda ativa': 'amber',
};
