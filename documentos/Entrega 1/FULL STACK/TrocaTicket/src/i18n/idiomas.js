// Idiomas do site (etapa 7 da integração com a TrocaTicket 2.0): os mesmos seis da 2.0.
// O português do Brasil é o padrão e o texto-fonte; os outros ficam nos dicionários de textos/.
export const PADRAO = 'pt-BR';
export const CHAVE_IDIOMA = 'trocaticket-idioma';

export const IDIOMAS = [
  { codigo: 'pt-BR', nome: 'Português (Brasil)', curto: 'PT' },
  { codigo: 'en', nome: 'English', curto: 'EN' },
  { codigo: 'es', nome: 'Español', curto: 'ES' },
  { codigo: 'fr', nome: 'Français', curto: 'FR' },
  { codigo: 'de', nome: 'Deutsch', curto: 'DE' },
  { codigo: 'it', nome: 'Italiano', curto: 'IT' },
];

// Ordem das colunas dos dicionários: [português, inglês, espanhol, francês, alemão, italiano].
export const COLUNAS = ['en', 'es', 'fr', 'de', 'it'];

export const idiomaValido = (codigo) => IDIOMAS.some((item) => item.codigo === codigo);
