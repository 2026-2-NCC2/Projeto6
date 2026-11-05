// Dados de demonstração do Fórum TrocaTicket.
// Enquanto o backend do fórum não existe, tudo vem daqui e as ações do
// usuário (votos, comentários, publicações...) ficam salvas no localStorage.

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;
const agora = Date.now();
const atras = (ms) => new Date(agora - ms).toISOString();

export const usuarioAtual = {
  username: "lucas_rock",
  nome: "Lucas M.",
  iniciais: "LR",
  flair: "Fã Frequente",
  nivel: 4,
  vip: true,
};

export const usuarios = {
  mari_silva: { iniciais: "MS", cor: "#8b5cf6" },
  carlos_seguranca: { iniciais: "CS", cor: "#059669", moderador: true },
  pedro_cultura: { iniciais: "PC", cor: "#16a34a" },
  lucas_rock: { iniciais: "LR", cor: "#0f172a" },
  camila_live: { iniciais: "CL", cor: "#2563eb" },
  rodrigo_sound: { iniciais: "RS", cor: "#16a34a", flair: "Fã Frequente" },
  felipe_eventos: { iniciais: "FE", cor: "#0ea5e9" },
  ana_livemusic: { iniciais: "AL", cor: "#e11d48" },
  bia_tours: { iniciais: "BT", cor: "#f59e0b" },
  joao_pista: { iniciais: "JP", cor: "#7c3aed" },
};

export const categorias = [
  { id: "trocas", nome: "Trocas e Ingressos", emoji: "🎟️", selo: { texto: "Ativo", tom: "azul" } },
  { id: "shows", nome: "Shows e Festivais", emoji: "🎸", contagem: "14k" },
  { id: "esportes", nome: "Esportes & Estádios", emoji: "⚽", contagem: "9k" },
  { id: "eventos", nome: "Eventos & Experiências", emoji: "✨" },
  { id: "duvidas", nome: "Dúvidas e Ajuda", emoji: "❓" },
  { id: "lugares", nome: "Recomendações de Lugares", emoji: "📍" },
  { id: "golpes", nome: "Avisos Anti-Golpe", emoji: "🛡️", selo: { texto: "Alerta", tom: "vermelho" } },
];

export const comunidades = [
  {
    slug: "ShowsEFestivais",
    titulo: "Shows, Festivais e Turnês no Brasil",
    categoria: "shows",
    icone: "music",
    cor: "#2563eb",
    membros: 14200,
    online: 482,
    criadaEm: "2022-10-18",
    descricao:
      "Espaço aberto para troca de experiências reais, reviews acústicos de setores de estádios, logística de festivais e bate-papo seguro sobre repasse justo de ingressos.",
    sobre:
      "Comunidade oficial de fãs de música, grandes turnês internacionais e festivais nacionais. Fórum de apoio aos usuários da plataforma TrocaTicket.",
    regras: [
      { titulo: "Respeito mútuo entre fãs", texto: "Críticas a setores, bandas e produtoras são bem-vindas; ataques pessoais não." },
      { titulo: "Proibido cambismo e revenda abusiva", texto: "Repasses só pelo valor de face e sempre com a blindagem P2P do TrocaTicket." },
      { titulo: "Conteúdo focado em eventos & logística", texto: "Shows, festivais, transporte, hospedagem e experiência nos locais." },
      { titulo: "Sem dados sensíveis ou WhatsApp público", texto: "Não publique telefone, CPF, prints de QR Code ou dados de pagamento." },
      { titulo: "Denuncie tentativas de golpe", texto: "Use o botão de denúncia; a moderação responde em até 2 horas." },
    ],
  },
  {
    slug: "TrocasEIngressos",
    titulo: "Trocas e repasses verificados",
    categoria: "trocas",
    icone: "ticket",
    cor: "#0891b2",
    membros: 28900,
    online: 913,
    criadaEm: "2021-03-02",
    descricao: "Dúvidas sobre repasse, transferência nominal e custódia de ingressos.",
    sobre: "O maior espaço do fórum para quem compra e vende ingressos com segurança pelo TrocaTicket.",
    regras: [
      { titulo: "Somente trocas com custódia", texto: "Negociações fora da plataforma não são permitidas." },
      { titulo: "Valor de face", texto: "Anúncios com ágio abusivo são removidos." },
      { titulo: "Sem dados pessoais", texto: "Nunca compartilhe dados de contato em público." },
    ],
  },
  {
    slug: "AvisosESeguranca",
    titulo: "Avisos oficiais e segurança",
    categoria: "golpes",
    icone: "shield",
    cor: "#059669",
    membros: 31200,
    online: 640,
    criadaEm: "2021-01-10",
    oficial: true,
    descricao: "Canal oficial da equipe TrocaTicket sobre golpes, fraudes e boas práticas.",
    sobre: "Comunicados da moderação e da equipe de segurança do TrocaTicket.",
    regras: [
      { titulo: "Somente moderadores publicam", texto: "Membros podem comentar e tirar dúvidas." },
      { titulo: "Denuncie golpes", texto: "Use o botão de denúncia em qualquer publicação suspeita." },
    ],
  },
  {
    slug: "EventosSP",
    titulo: "O que fazer em São Paulo",
    categoria: "eventos",
    icone: "pin",
    cor: "#7c3aed",
    membros: 18100,
    online: 301,
    criadaEm: "2022-05-21",
    descricao: "Agenda, dicas de transporte e hospedagem para eventos na capital paulista.",
    sobre: "Agenda colaborativa de eventos, exposições e festivais em São Paulo.",
    regras: [
      { titulo: "Foco em São Paulo", texto: "Eventos e dicas da cidade e região metropolitana." },
      { titulo: "Respeito mútuo", texto: "Sem ataques pessoais." },
    ],
  },
  {
    slug: "DicasESeguranca",
    titulo: "Dicas de segurança para fãs",
    categoria: "duvidas",
    icone: "shieldCheck",
    cor: "#16a34a",
    membros: 8400,
    online: 122,
    criadaEm: "2023-02-14",
    descricao: "Como evitar golpes, conferir ingressos e chegar seguro aos eventos.",
    sobre: "Guias colaborativos de segurança para quem frequenta shows e eventos.",
    regras: [{ titulo: "Informação verificada", texto: "Cite fontes quando falar de golpes." }],
  },
  {
    slug: "EsportesEEstadios",
    titulo: "Futebol, estádios e arenas",
    categoria: "esportes",
    icone: "trophy",
    cor: "#ea580c",
    membros: 9000,
    online: 210,
    criadaEm: "2023-07-01",
    descricao: "Setores, acesso e experiência em estádios e arenas esportivas.",
    sobre: "Discussões sobre jogos, setores e acesso aos estádios.",
    regras: [{ titulo: "Sem rivalidade tóxica", texto: "Torcer sim, ofender não." }],
  },
];

// Corpo das publicações em "markdown simples" (ver utils/markdown.jsx).
export const publicacoes = [
  {
    id: "8942",
    comunidade: "ShowsEFestivais",
    autor: "mari_silva",
    criadoEm: atras(2 * HORA),
    editadoEm: atras(90 * MIN),
    titulo: "Alguém já foi a um show no Allianz Parque? Qual setor tem a melhor acústica e visão?",
    resumo:
      "Estou me planejando para o Primavera Sound e queria saber se a Pista Premium realmente compensa ou se a Cadeira Inferior tem uma experiência de som melhor sem aperto. Quem já foi recentemente?",
    corpo:
      "Estou me planejando para a turnê que vai rolar no fim do ano no Allianz Parque. Gostaria de saber a experiência real de quem já esteve lá recentemente.\n\nA Pista Premium realmente compensa o valor adicional ou a Cadeira Inferior tem uma experiência de som melhor sem aperto? Alguém que já ficou na Cadeira Superior achou a acústica prejudicada pela cobertura? Além disso, como funciona o fluxo de entrada e conferência de ingressos pelo aplicativo nas catracas do estádio?",
    etiquetas: ["Shows & Festivais", "Dúvida & Dica", "Allianz Parque"],
    selo: { texto: "Dúvida & Dica", tom: "azul" },
    categoria: "shows",
    votos: 142,
    comentarios: 38,
    imagem: { src: "images/coldplay.jpg", legenda: "Visão real do setor Cadeira Inferior • Enviado por fã", rotulo: "Foto da Comunidade" },
    dica: "Nunca compre ingressos impressos ou QR Codes avulsos de cambistas nos portões da Rua Turiaçu/Palestra Itália. Use a transferência autenticada oficial.",
  },
  {
    id: "8901",
    comunidade: "AvisosESeguranca",
    autor: "carlos_seguranca",
    criadoEm: atras(4 * HORA),
    titulo: "Como identificar uma negociação suspeita de ingressos e garantir transferência segura pelo TrocaTicket",
    resumo:
      "Reunimos as 5 regras de ouro antes de fechar qualquer negociação externa. Lembre-se: utilize sempre a custódia do TrocaTicket para evitar ingressos clonados em PDFs ou prints falsos.",
    corpo:
      "Reunimos as 5 regras de ouro antes de fechar qualquer negociação:\n\n1. **Nunca pague via Pix direto** para o vendedor; use a custódia da plataforma.\n2. **Desconfie de preços muito abaixo** do valor de face.\n3. **PDF e print não são ingresso**: exija a transferência nominal pela ticketeira.\n4. **Não saia da plataforma**: golpistas pedem para conversar no WhatsApp.\n5. **Confira a reputação** do vendedor e o histórico de trocas.\n\nEm caso de dúvida, chame a moderação antes de concluir a negociação.",
    etiquetas: ["Oficial", "Segurança"],
    selo: { texto: "Oficial / Segurança", tom: "verde", emoji: "🛡️" },
    categoria: "golpes",
    votos: 389,
    comentarios: 64,
    oficial: true,
    fixado: true,
    custodia:
      "O valor só é liberado ao vendedor após a catraca do evento validar sua entrada. Nunca realize Pix direto em conversas externas.",
  },
  {
    id: "8920",
    comunidade: "EventosSP",
    autor: "pedro_cultura",
    criadoEm: atras(6 * HORA),
    titulo: "Quais os melhores eventos e festivais acontecendo em São Paulo neste fim de semana?",
    resumo:
      "Montei um compilado com 7 opções de shows, exposições e festivais gratuitos e pagos entre sexta e domingo. O que vocês recomendam adicionar?",
    corpo:
      "Montei um compilado com 7 opções de shows, exposições e festivais gratuitos e pagos entre sexta e domingo:\n\n- **Sexta:** jazz no Centro Cultural e feira gastronômica na Vila Madalena.\n- **Sábado:** festival no Parque Ibirapuera e exposição no Memorial da América Latina.\n- **Domingo:** roda de samba no centro e show gratuito no Vale do Anhangabaú.\n\nO que vocês recomendam adicionar?",
    etiquetas: ["Guia da Semana", "São Paulo"],
    selo: { texto: "Guia da Semana", tom: "azul" },
    categoria: "eventos",
    votos: 95,
    comentarios: 21,
    imagem: { src: "images/rock-in-rio.jpg", local: "Parque Ibirapuera & Memorial da América Latina" },
  },
  {
    id: "8915",
    comunidade: "TrocasEIngressos",
    autor: "lucas_rock",
    criadoEm: atras(8 * HORA),
    titulo: "Dicas para conseguir ingressos para festivais esgotados sem pagar ágio absurdo",
    resumo:
      "Fiz um passo a passo de como ativei as notificações de transferências oficiais aqui no TrocaTicket e peguei meu ingresso de Lollapalooza no valor facial!",
    corpo:
      "Fiz um passo a passo de como ativei as notificações de transferências oficiais aqui no TrocaTicket e peguei meu ingresso de festival no valor facial!\n\n1. Ative o alerta do evento na página de ingressos.\n2. Deixe o pagamento pré-cadastrado para não perder tempo.\n3. Prefira anúncios com **Troca Verificada**.\n\nEm duas semanas apareceram 4 repasses pelo valor de face.",
    etiquetas: ["Troca Verificada", "Dica"],
    selo: { texto: "Troca Verificada", tom: "azul" },
    categoria: "trocas",
    votos: 218,
    comentarios: 47,
  },
  {
    id: "8899",
    comunidade: "ShowsEFestivais",
    autor: "carlos_seguranca",
    criadoEm: atras(1 * DIA),
    titulo: "Diretrizes para relatos de setores em estádios e regras estritas contra cambismo nos festivais de 2026",
    resumo:
      "Lembramos que qualquer oferta de venda externa sem a blindagem da custódia do TrocaTicket resultará em banimento imediato. Usem as tags [Review de Setor] para fotos autorais de visão.",
    corpo:
      "Lembramos que qualquer oferta de venda externa sem a blindagem da custódia do TrocaTicket resultará em banimento imediato.\n\nUsem as tags **[Review de Setor]** para fotos autorais de visão do palco. Fotos de terceiros sem crédito serão removidas.",
    etiquetas: ["Comunicado da Moderação"],
    categoria: "golpes",
    votos: 48,
    comentarios: 19,
    comunicado: true,
    fixado: true,
  },
  {
    id: "8930",
    comunidade: "ShowsEFestivais",
    autor: "pedro_cultura",
    criadoEm: atras(5 * HORA),
    titulo: "Review do The Town e Lollapalooza: Guia prático de transporte expresso, entrada antecipada e setores VIP",
    resumo:
      "Depois de cobrir 4 edições em Interlagos, compilei as 3 lições vitais que evitam dor de cabeça e filas de 3 horas na volta.",
    corpo:
      "Depois de cobrir 4 edições em Interlagos, compilei as 3 lições vitais que evitam dor de cabeça e filas de 3 horas na volta:\n\n- **Trem Expresso Pinheiros:** Compre a passagem de volta com antecedência no app; a catraca normal trava após as 23h.\n- **Copos Reutilizáveis:** Leve a cordinha oficial de pescoço, pois a devolução de caução costuma ter fila no final.\n- **Lockers Oficiais:** Se for fazer bate-volta de outro estado, reserve o armário do setor central para mochila.",
    etiquetas: ["Relato de Experiência", "Guia Festivais"],
    selo: { texto: "Relato de Experiência", tom: "roxo" },
    categoria: "shows",
    votos: 89,
    comentarios: 24,
  },
  {
    id: "8933",
    comunidade: "ShowsEFestivais",
    autor: "camila_live",
    criadoEm: atras(1 * DIA + 3 * HORA),
    titulo: "Como funciona o prazo limite de transferência nominal de ingresso digital no aplicativo oficial da ticketeira?",
    resumo:
      "Comprei através do sistema de repasse com custódia aqui do TrocaTicket e o vendedor enviou a solicitação nominal. Algumas ticketeiras fecham a transferência 24h antes do show. Vocês recomendam aceitar de imediato no app parceiro?",
    corpo:
      "Comprei através do sistema de repasse com custódia aqui do TrocaTicket e o vendedor enviou a solicitação nominal. Algumas ticketeiras fecham a transferência 24h antes do show.\n\nVocês recomendam aceitar de imediato no app parceiro?",
    etiquetas: ["Ingressos & Transferência"],
    selo: { texto: "Ingressos & Transferência", tom: "vermelho" },
    categoria: "trocas",
    votos: 63,
    comentarios: 15,
    blindagem: "O pagamento permanece retido em nossa conta escrow e só é liberado ao vendedor após o evento ou confirmação nominal irrefutável.",
  },
  {
    id: "8910",
    comunidade: "TrocasEIngressos",
    autor: "joao_pista",
    criadoEm: atras(3 * DIA),
    titulo: "Transferência de ingresso digital na ticketeira demorou mais de 1 dia, é normal?",
    resumo: "Aceitei a transferência ontem e ainda aparece como pendente no app. Alguém já passou por isso?",
    corpo: "Aceitei a transferência ontem e ainda aparece como pendente no app. A custódia segue ativa aqui no TrocaTicket. Alguém já passou por isso?",
    etiquetas: ["Ingressos & Transferência"],
    selo: { texto: "Dúvida", tom: "azul" },
    categoria: "duvidas",
    votos: 19,
    comentarios: 12,
  },
  {
    id: "8905",
    comunidade: "EventosSP",
    autor: "bia_tours",
    criadoEm: atras(1 * DIA + 6 * HORA),
    titulo: "Melhor hotel perto do Autódromo de Interlagos para quem vem de fora?",
    resumo: "Vou para o festival com amigos de Curitiba. Vale ficar perto do autódromo ou na região da Paulista e ir de trem?",
    corpo: "Vou para o festival com amigos de Curitiba. Vale ficar perto do autódromo ou na região da Paulista e ir de trem?",
    etiquetas: ["Recomendações de Lugares"],
    selo: { texto: "Lugares", tom: "roxo" },
    categoria: "lugares",
    votos: 44,
    comentarios: 31,
  },
  {
    id: "8907",
    comunidade: "ShowsEFestivais",
    autor: "ana_livemusic",
    criadoEm: atras(2 * DIA),
    titulo: "Review e estrutura do Palco Sunset no último festival",
    resumo: "Som muito melhor que no ano passado, mas a área de alimentação ficou longe. Segue meu relato completo.",
    corpo: "Som muito melhor que no ano passado, mas a área de alimentação ficou longe.\n\n- **Som:** equalizado, dava para ouvir bem até o fundo.\n- **Telões:** maiores e bem posicionados.\n- **Acesso:** dois corredores, filas rápidas.",
    etiquetas: ["Relato de Experiência"],
    selo: { texto: "Relato de Experiência", tom: "roxo" },
    categoria: "shows",
    votos: 83,
    comentarios: 55,
    imagem: { src: "images/lollapalooza.jpg", legenda: "Palco Sunset ao entardecer" },
  },
];

// Comentários: árvore por publicação. "extras" aparecem em "Carregar mais".
export const comentarios = {
  8942: [
    {
      id: "c1",
      autor: "rodrigo_sound",
      criadoEm: atras(2 * HORA),
      texto:
        "Fui em 4 shows no Allianz no último ano. A Cadeira Inferior (principalmente Leste ou Oeste) tem o melhor equilíbrio absoluto: você senta se quiser, tem visão ampla de todo o telão e o som rebate menos do que na Pista Comum lá atrás.",
      votos: 47,
      respostas: [
        {
          id: "c1-1",
          autor: "mari_silva",
          criadoEm: atras(1 * HORA),
          texto:
            "Muito obrigada Rodrigo! E em relação à saída do estádio, o acesso para o metrô Palmeiras-Barra Funda costuma ser tranquilo saindo pela Cadeira Inferior?",
          votos: 14,
          respostas: [
            {
              id: "c1-1-1",
              autor: "felipe_eventos",
              criadoEm: atras(50 * MIN),
              texto:
                "Sim, super de boa! Dá uns 10 a 15 minutos de caminhada rápida com policiamento nas vias principais (Rua Francisco Matarazzo). O fluxo anda bem.",
              votos: 8,
              respostas: [],
            },
          ],
        },
      ],
    },
    {
      id: "c2",
      autor: "carlos_seguranca",
      criadoEm: atras(1 * HORA),
      destaque: true,
      texto:
        "Lembrando a todos: ingressos para o setor Pista Premium e Cadeira possuem conferência biométrica/facial nas catracas do Allianz agora. Não aceitem prints estáticos de terceiros. Usem sempre a custódia garantida da plataforma.",
      votos: 89,
      respostas: [],
    },
    {
      id: "c3",
      autor: "ana_livemusic",
      criadoEm: atras(45 * MIN),
      texto:
        "Se você tem menos de 1,65m, fuja da Pista Comum em dia lotado, você não enxerga o palco direito e a inclinação não ajuda. Cadeira Inferior é a melhor escolha sem erro!",
      votos: 23,
      respostas: [],
    },
    {
      id: "c4",
      autor: "joao_pista",
      criadoEm: atras(30 * MIN),
      extra: true,
      texto: "Pista Premium vale se você chega cedo. Depois das 19h fica impossível chegar perto da grade.",
      votos: 6,
      respostas: [],
    },
    {
      id: "c5",
      autor: "bia_tours",
      criadoEm: atras(20 * MIN),
      extra: true,
      texto: "Cadeira Superior tem som com eco nos graves, achei a pior opção custo-benefício.",
      votos: 4,
      respostas: [],
    },
  ],
  8901: [
    {
      id: "s1",
      autor: "camila_live",
      criadoEm: atras(3 * HORA),
      texto: "Quase caí num golpe semana passada com o papo de 'te mando o PDF agora'. Obrigada pelo guia!",
      votos: 31,
      respostas: [],
    },
  ],
};

export const notificacoesIniciais = [
  { id: "n1", texto: "u/rodrigo_sound respondeu na sua discussão sobre Allianz Parque", link: "/r/ShowsEFestivais/post/8942", criadoEm: atras(20 * MIN) },
  { id: "n2", texto: "Novo comunicado da moderação em r/ShowsEFestivais", link: "/r/ShowsEFestivais/post/8899", criadoEm: atras(3 * HORA) },
  { id: "n3", texto: "Sua publicação recebeu 50 upvotes 🎉", link: "/r/TrocasEIngressos/post/8915", criadoEm: atras(6 * HORA) },
];
