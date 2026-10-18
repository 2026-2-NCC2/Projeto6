# Contrato transacional — MVP acadêmico

Prefixo `/api`. Sessão HttpOnly e `X-CSRF-Token` do módulo de autenticação. Toda escrita exige `Idempotency-Key` (16–120 caracteres); repetir a mesma chave/conteúdo retorna o mesmo resultado. Conteúdo divergente recebe 409. IDs numéricos e valores em centavos inteiros. Erros `{message}`. Datas UTC ISO. Sempre mostrar “Demonstração acadêmica • sem pagamentos ou ingressos reais”. Nenhum campo do cliente escolhe pagamento/emissão.

| Método/caminho                      | Conteúdo                                      | Resultado                                                                                                 |
| ----------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| GET `/ingressos`                    | —                                             | array de Ticket                                                                                           |
| GET `/ingressos/:id/credencial`     | —                                             | `{ticketId,credential,academic:true}`; somente titular atual e unidade elegível                           |
| GET `/ingressos/:id/historico`      | —                                             | array `{id,kind,fromUserId,toUserId,amountCents,createdAt,orderId}`; titular/participante histórico/admin |
| GET `/pedidos`                      | —                                             | array de Order da conta                                                                                   |
| GET `/pedidos/:id`                  | —                                             | Order da conta/admin                                                                                      |
| POST `/pedidos`                     | `{categoryId,quantity,halfDeclaration?:true}` | Order reservada por 10 minutos; preço vem do banco                                                        |
| POST `/pedidos/:id/pagar`           | `{}`                                          | Order com pagamento/entrega separados; sem cobrança real                                                  |
| POST `/pedidos/:id/recuperar`       | `{}`                                          | tenta entrega pendente novamente                                                                          |
| POST `/pedidos/:id/estornar`        | `{}`                                          | estorno simulado idempotente de entrega pendente; sem recriar ingresso usado                              |
| POST `/pedidos/:id/cancelar`        | `{}`                                          | desiste de reserva ainda não paga e libera estoque/fila; pedido pago usa estorno/atendimento              |
| GET `/anuncios?eventId=N`           | —                                             | array de Listing                                                                                          |
| POST `/anuncios`                    | `{ticketId,priceCents}`                       | Listing; inteiro positivo até o teto da unidade                                                           |
| DELETE `/anuncios/:id`              | `{}`                                          | Listing cancelado, somente antes de reserva                                                               |
| POST `/anuncios/:id/reservar`       | `{}`                                          | Order secundária, respeita fila anterior                                                                  |
| GET `/fila`                         | —                                             | array `{id,eventId,categoryId,status,position,orderId,createdAt}` da conta                                |
| POST `/fila`                        | `{eventId,categoryId,halfDeclaration?:true}`  | inscrição ordenada por created_at,id; reserva automática se houver anúncio                                |
| DELETE `/fila/:id`                  | `{}`                                          | inscrição retirada; reserva vigente cancelada/liberada                                                    |
| GET `/transferencias`               | —                                             | convites enviados/recebidos `{id,ticketId,fromUserId,toUserId,status,expiresAt,eventTitle}`               |
| POST `/transferencias`              | `{ticketId,email}`                            | convite gratuito; titular e credencial preservados até aceite                                             |
| POST `/transferencias/:id/aceitar`  | `{}`                                          | convite aceito; custo/teto zero; credencial anterior revogada                                             |
| POST `/transferencias/:id/recusar`  | `{}`                                          | destinatário recusa                                                                                       |
| POST `/transferencias/:id/cancelar` | `{}`                                          | remetente cancela antes do aceite                                                                         |
| POST `/portaria`                    | `{eventId,credential}`                        | `{ticketId,accepted:true,academic:true}`; organizador responsável/admin; segunda leitura 409              |
| GET `/atendimentos`                 | —                                             | solicitações próprias; admin vê todas                                                                     |
| POST `/atendimentos`                | `{orderId?:N,listingId?:N,subject,message}`   | solicitação vinculada a um objeto acessível                                                               |
| POST `/atendimentos/:id/respostas`  | `{message,status:'open'                       | 'reviewing'                                                                                               | 'closed'}`                              | resposta administrativa persistida                                                           |
| GET `/demo/config`                  | —                                             | configuração apenas admin                                                                                 |
| PATCH `/demo/config`                | `{paymentScenario?:'approved'                 | 'rejected'                                                                                                | 'unavailable',issuerScenario?:'success' | 'temporary_failure',reservationMinutes?:1..60,invitationMinutes?:1..60,accountLimit?:1..20}` | cenários e limites locais; somente admin; altera somente campos enviados |
| POST `/eventos/:id/cancelar`        | `{reason}`                                    | cancela unidades/operações e estorna cadeia onerosa uma única vez; responsável/admin                      |

Ticket: `{id,eventId,eventTitle,categoryId,categoryName,kind,state:'valid'|'used'|'cancelled',originalCents,costCents,ceilingCents,credential,ownerId,listingId,invitationId,blocked,createdAt}`. Credencial só aparece ao titular atual; lista da carteira contém somente suas unidades. Eventos anteriores sem `mvp_unidade` não são convertidos silenciosamente e não participam destes fluxos.

Order: `{id,eventId,eventTitle,categoryId,quantity,kind:'primary'|'resale',amountCents,paymentState:'pending'|'approved'|'rejected'|'unavailable'|'refunded',deliveryState:'reserved'|'pending'|'delivered'|'cancelled'|'refunded'|'expired',expiresAt,ticketIds,createdAt,academic:true,realChargeCents:0}`. No pagamento aprovado + falha do emissor, `paymentState=approved,deliveryState=pending`; nenhum ingresso novo é exibido como entregue. Reservas válidas e entregas pendentes ocupam estoque/capacidade. Unidades usadas/canceladas não entram no limite ativo de conta. Convites pendentes entram no limite do destinatário.

Listing: `{id,ticketId,eventId,categoryId,eventTitle,categoryName,sellerId,priceCents,ceilingCents,status:'active'|'reserved'|'sold'|'cancelled',createdAt}`. Preço zero usa convite gratuito, sem checkout.

Expiração executada no servidor na inicialização, periodicamente e dentro de cada operação relacionada ao evento; relógio UTC do MySQL. Pagamento e emissor são adaptadores locais independentes. Taxas e cobrança real são sempre zero.

O evento é o bloqueio comum (`FOR UPDATE`) para estoque, reservas, convites,
trocas de titular e entrada. Cada transação usa `READ COMMITTED`, para que uma
contagem não reutilize um snapshot obtido antes de esperar esse bloqueio.
Unicidades de colunas geradas impedem dois anúncios, dois convites ou duas
reservas secundárias vigentes da mesma unidade, inclusive no banco.

O limite por conta soma unidades válidas atuais, quantidades das reservas e
entregas pagas pendentes, e convites pendentes como destinatário. Na conclusão,
a própria reserva/convite é excluída da contagem e a quantidade recebida é
acrescentada uma vez. Ingressos usados/cancelados não entram nesse limite;
unidades usadas continuam consumindo a capacidade histórica do evento.
O histórico mantém operações anteriores para auditoria de atividade repetida.

Uma aceitação gratuita também consulta o emissor local: em falha temporária,
o convite permanece pendente com titular e credencial anteriores; a API retorna
503 e permite nova tentativa, recusa ou cancelamento. Não há checkout nem taxa.

No cancelamento de evento, cada pedido oneroso aprovado recebe um registro
único de estorno simulado pelo seu próprio valor (a emissão e cada repasse da
cadeia são reconciliados separadamente). São reversões contábeis fictícias; não
há saldo, pagamento ao vendedor ou movimentação de dinheiro. Os registros de
entrada e histórico são preservados e nenhuma unidade usada é recriada.

O campo legado `ingresso.status` não é reinterpretado: o estado de utilização
destes fluxos reside exclusivamente em `mvp_unidade.state`. Linhas M1 sem
unidade MVP ficam fora da carteira transacional, aguardando mapeamento explícito.
