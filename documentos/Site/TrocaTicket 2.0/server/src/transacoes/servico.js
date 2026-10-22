import { EmissorSimulado, PagamentoSimulado } from './simuladores.js';
import { criarContextoTransacoes } from './contexto.js';
import { criarReservasFila } from './reservas-fila.js';
import { criarPagamentos } from './pagamentos.js';
import { criarTransferencias } from './transferencias.js';
import { criarCarteiraPortaria } from './carteira-portaria.js';
import { criarAtendimentoConfiguracao } from './atendimento-configuracao.js';

// A composição mantém a mesma API pública. As regras estão agrupadas por fluxo.
export function criarServicoTransacoes(
  pool,
  { pagamento = new PagamentoSimulado(), emissor = new EmissorSimulado() } = {},
) {
  const contexto = criarContextoTransacoes(pool, { pagamento, emissor });
  return {
    expire: contexto.expire,
    ...criarReservasFila(contexto),
    ...criarPagamentos(contexto),
    ...criarTransferencias(contexto),
    ...criarCarteiraPortaria(contexto),
    ...criarAtendimentoConfiguracao(contexto),
  };
}
