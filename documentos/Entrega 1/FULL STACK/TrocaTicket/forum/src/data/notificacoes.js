// Notificações de demonstração do Troca-Papo e a chave em que o fórum guarda o seu
// estado no navegador. Fonte única: o fórum e o card "Troca-Papo" da homepage do
// Usuário (site principal) leem daqui. Sem dependências.

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const atras = (ms) => new Date(Date.now() - ms).toISOString();

export const CHAVE_FORUM = "forum-trocaticket:v1";

export const notificacoesIniciais = [
  { id: "n1", texto: "u/rodrigo_sound respondeu na sua discussão sobre Allianz Parque", link: "/t/ShowsEFestivais/post/8942", criadoEm: atras(20 * MIN) },
  { id: "n2", texto: "Novo comunicado da moderação em t/ShowsEFestivais", link: "/t/ShowsEFestivais/post/8899", criadoEm: atras(3 * HORA) },
  { id: "n3", texto: "Sua publicação recebeu 50 upvotes 🎉", link: "/t/TrocasEIngressos/post/8915", criadoEm: atras(6 * HORA) },
];
