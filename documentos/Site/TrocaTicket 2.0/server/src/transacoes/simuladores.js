// Adaptadores locais: não usam rede, dinheiro, cartões, Pix ou emissor comercial.
import { falhar, inteiro } from './regras.js';

export class PagamentoSimulado {
  confirmar(scenario, amountCents) {
    inteiro(amountCents, 'Total simulado', 0);
    if (!['approved', 'rejected', 'unavailable'].includes(scenario))
      falhar(400, 'Cenário de pagamento simulado inválido.');
    return { state: amountCents === 0 ? 'approved' : scenario, realChargeCents: 0, academic: true };
  }
}
export class EmissorSimulado {
  emitir(scenario) {
    if (!['success', 'temporary_failure'].includes(scenario))
      falhar(400, 'Cenário de emissor simulado inválido.');
    return { delivered: scenario === 'success', academic: true };
  }
}
