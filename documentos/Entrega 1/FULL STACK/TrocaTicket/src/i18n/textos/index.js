// Dicionários de tradução (etapa 7). Cada linha: [português, inglês, espanhol, francês, alemão, italiano].
// O português é a chave. Linhas posteriores substituem as anteriores com a mesma chave, por isso
// as traduções reaproveitadas da TrocaTicket 2.0 vêm primeiro e as deste site depois.
// Modelos com {nome} mais específicos devem vir antes dos mais genéricos.
import reaproveitados from './reaproveitados.js';
import lote01 from './lote01.js';
import lote02 from './lote02.js';
import lote03 from './lote03.js';
import lote04 from './lote04.js';
import lote05 from './lote05.js';
import lote06 from './lote06.js';
import lote07 from './lote07.js';
import lote08 from './lote08.js';
import lote09 from './lote09.js';
import lote10 from './lote10.js';

export default [
  ...reaproveitados,
  ...lote01,
  ...lote02,
  ...lote03,
  ...lote04,
  ...lote05,
  ...lote06,
  ...lote07,
  ...lote08,
  ...lote09,
  ...lote10,
];
