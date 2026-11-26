// Pedidos, pagamento simulado, cancelamento e estorno — etapa 3 da integração com a TrocaTicket 2.0.
//
// Adaptado de documentos/Site/TrocaTicket 2.0/server/src/transacoes (pagamentos.js, contexto.js e
// regras.js) para o banco da main (tabelas criadas por MIGRACAO_PEDIDOS_PAGAMENTOS.sql).
//
// Fluxo:
// 1. Reserva: o participante cria um pedido; os ingressos ficam guardados por RESERVA_MINUTOS (15).
// 2. Pagamento simulado (Pix ou cartão, sem nenhum dado de pagamento): o resultado vem de
//    PAGAMENTO_SIMULADO (aprovado | recusado | indisponivel). Aprovado emite os ingressos.
// 3. Cancelamento: reserva ainda não paga pode ser desfeita; reserva vencida vira "expirado".
// 4. Estorno: ingressos pagos que ainda estão com quem comprou podem ser devolvidos até a véspera
//    do evento (um registro de estorno por ingresso). Ingresso recebido em troca é cancelado sem
//    estorno, porque a troca não envolve dinheiro.
// Toda gravação exige o cabeçalho Idempotency-Key: repetir a mesma ação devolve a mesma resposta.
// A revenda, a fila de espera e a transferência com aceite (etapa 4) ficam em repasse.js e usam
// estes mesmos pedidos: a compra de um anúncio é um pedido ligado a ele (pedido.anuncio_id).

const crypto = require('crypto');
const { criarRepasse, SQL_NUNCA_REPASSADO, SQL_EM_REPASSE } = require('./repasse');

const LIMITE_POR_CONTA = 6;
const PERCENTUAL_TIPO = { Inteira: 100, 'Meia-entrada': 50 };
const FORMAS_PAGAMENTO = ['pix', 'cartao'];
const CHAVE_VALIDA = /^[A-Za-z0-9_.:-]{16,120}$/;
const DATA_ISO = "'%Y-%m-%dT%H:%i:%sZ'";

class ErroPedido extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}
const falhar = (status, mensagem) => {
  throw new ErroPedido(status, mensagem);
};

function minutosReserva() {
  const minutos = Number(process.env.RESERVA_MINUTOS);
  return Number.isInteger(minutos) && minutos >= 1 && minutos <= 120 ? minutos : 15;
}

function cenarioPagamento() {
  const cenario = String(process.env.PAGAMENTO_SIMULADO || 'aprovado').toLowerCase();
  return ['aprovado', 'recusado', 'indisponivel'].includes(cenario) ? cenario : 'aprovado';
}

function centavosUnitarios(precoBase, tipo) {
  const centavos = Math.round(Number(precoBase) * PERCENTUAL_TIPO[tipo]);
  if (!Number.isSafeInteger(centavos) || centavos < 0 || centavos > 9999999999) {
    falhar(400, 'O preço cadastrado para o evento é inválido.');
  }
  return centavos;
}
const reais = (centavos) => (centavos / 100).toFixed(2);
const centavos = (valor) => Math.round(Number(valor) * 100);

function inteiroPositivo(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

function ordenado(valor) {
  if (Array.isArray(valor)) return valor.map(ordenado);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, ordenado(valor[chave])]));
  }
  return valor;
}
const resumoConteudo = (operacao, corpo) =>
  crypto.createHash('sha256').update(JSON.stringify({ operacao, corpo: ordenado(corpo ?? {}) })).digest('hex');

function rotuloTicket(status) {
  return status === 'A' ? 'Ativo' : status === 'V' ? 'Utilizado' : 'Cancelado';
}

function criarPedidos({ db, requireUserRole }) {
  // Reservas vencidas deixam de segurar ingressos antes de qualquer leitura ou gravação.
  async function expirarReservas(conexao) {
    await conexao.execute(
      `UPDATE pedido SET status = 'expirado', motivo = 'Prazo de pagamento encerrado',
              atualizado_em = UTC_TIMESTAMP()
        WHERE status = 'reservado' AND expira_em <= UTC_TIMESTAMP() AND anuncio_id IS NULL`,
    );
  }

  // Reservas de venda, convites e reservas de anúncio vencidos (estas chamam o próximo da fila).
  async function expirarTudo() {
    await expirarReservas(db);
    await repasse.processarVencidos();
  }

  // Transação curta com leitura do que já foi gravado (READ COMMITTED) e nova tentativa em deadlock.
  async function emTransacao(trabalho) {
    for (let tentativa = 1; ; tentativa += 1) {
      const conexao = await db.getConnection();
      try {
        await conexao.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await conexao.beginTransaction();
        const resultado = await trabalho(conexao);
        await conexao.commit();
        return resultado;
      } catch (error) {
        await conexao.rollback().catch(() => {});
        if (error.code === 'ER_LOCK_DEADLOCK' && tentativa < 3) continue;
        throw error;
      } finally {
        conexao.release();
      }
    }
  }

  async function travarEvento(conexao, eventoId, { vendas = true } = {}) {
    const [[evento]] = await conexao.execute(
      `SELECT id, status, capacidade, preco_base, (data_fim >= CURRENT_DATE) AS vigente,
              (data_inicio > CURRENT_DATE) AS antes_do_inicio
         FROM evento WHERE id = ? FOR UPDATE`,
      [eventoId],
    );
    if (!evento) falhar(404, 'Evento não encontrado.');
    if (vendas && (evento.status !== 'Publicado' || !Number(evento.vigente))) {
      falhar(409, 'Este evento não está disponível para venda.');
    }
    return evento;
  }

  // Ingressos ativos, reservas em aberto e convites de transferência pendentes da conta no evento.
  async function contarConta(conexao, eventoId, usuarioId, { ignorarPedidoId = 0, ignorarConviteId = 0 } = {}) {
    const [[contagem]] = await conexao.execute(
      `SELECT
         (SELECT COUNT(*) FROM ingresso WHERE evento_id = ? AND dono_atual_id = ? AND status = 'A')
           + (SELECT COALESCE(SUM(quantidade), 0) FROM pedido
               WHERE evento_id = ? AND usuario_id = ? AND status = 'reservado' AND expira_em > UTC_TIMESTAMP()
                 AND id <> ?)
           + (SELECT COUNT(*) FROM convite_ingresso c JOIN ingresso i ON i.id = c.ingresso_id
               WHERE i.evento_id = ? AND c.destinatario_id = ? AND c.status = 'pending'
                 AND c.expira_em > UTC_TIMESTAMP() AND c.id <> ?) AS total`,
      [eventoId, usuarioId, eventoId, usuarioId, ignorarPedidoId, eventoId, usuarioId, ignorarConviteId],
    );
    return Number(contagem.total);
  }

  async function conferirLimiteConta(conexao, eventoId, usuarioId, quantidade, opcoes = {}) {
    if ((await contarConta(conexao, eventoId, usuarioId, opcoes)) + quantidade > LIMITE_POR_CONTA) {
      falhar(
        409,
        opcoes.mensagem || `Cada conta pode ter até ${LIMITE_POR_CONTA} ingressos ativos ou reservados por evento.`,
      );
    }
  }

  async function conferirLotacaoELimite(conexao, evento, usuarioId, quantidade, ignorarPedidoId = 0) {
    // Reservas de anúncio não ocupam lugar novo: o ingresso já existe e já é contado.
    const [[contagem]] = await conexao.execute(
      `SELECT
         (SELECT COUNT(*) FROM ingresso WHERE evento_id = ? AND status = 'A')
           + (SELECT COALESCE(SUM(quantidade), 0) FROM pedido
               WHERE evento_id = ? AND status = 'reservado' AND expira_em > UTC_TIMESTAMP() AND id <> ?
                 AND anuncio_id IS NULL) AS ocupados`,
      [evento.id, evento.id, ignorarPedidoId],
    );
    if (evento.capacidade !== null && Number(contagem.ocupados) + quantidade > Number(evento.capacidade)) {
      falhar(409, 'Não há ingressos suficientes para a quantidade solicitada.');
    }
    await conferirLimiteConta(conexao, evento.id, usuarioId, quantidade, { ignorarPedidoId });
  }

  async function emitirIngressos(conexao, pedido) {
    for (let n = 0; n < pedido.quantidade; n += 1) {
      const codigo = `TT-${pedido.evento_id}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      await conexao.execute(
        `INSERT INTO ingresso
           (codigo_ingresso, evento_id, dono_atual_id, tipo_ingresso, preco, status, disponivel_troca, pedido_id)
         VALUES (?, ?, ?, ?, ?, 'A', FALSE, ?)`,
        [codigo, pedido.evento_id, pedido.usuario_id, pedido.tipo_ingresso, pedido.valor_unitario, pedido.id],
      );
    }
  }

  async function inserirPedido(conexao, { usuarioId, evento, tipo, quantidade, status = 'reservado', forma = null }) {
    const unitario = centavosUnitarios(evento.preco_base, tipo);
    const [resultado] = await conexao.execute(
      `INSERT INTO pedido
         (usuario_id, evento_id, tipo_ingresso, quantidade, valor_unitario, valor_total, status,
          forma_pagamento, criado_em, expira_em, pago_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? MINUTE,
               ${status === 'pago' ? 'UTC_TIMESTAMP()' : 'NULL'}, UTC_TIMESTAMP())`,
      [usuarioId, evento.id, tipo, quantidade, reais(unitario), reais(unitario * quantidade), status, forma, minutosReserva()],
    );
    return resultado.insertId;
  }

  async function lerPedido(conexao, pedidoId, { travar = false } = {}) {
    const [[pedido]] = await conexao.execute(
      `SELECT *, (expira_em > UTC_TIMESTAMP()) AS no_prazo FROM pedido WHERE id = ?${travar ? ' FOR UPDATE' : ''}`,
      [pedidoId],
    );
    return pedido || null;
  }

  async function atualizarSituacaoEstorno(conexao, pedidoId) {
    const [[situacao]] = await conexao.execute(
      `SELECT COUNT(*) AS total, SUM(s.id IS NOT NULL) AS estornados
         FROM ingresso i LEFT JOIN estorno s ON s.ingresso_id = i.id
        WHERE i.pedido_id = ?`,
      [pedidoId],
    );
    if (!Number(situacao.estornados)) return;
    const status = Number(situacao.estornados) === Number(situacao.total) ? 'estornado' : 'estornado_parcial';
    await conexao.execute('UPDATE pedido SET status = ?, atualizado_em = UTC_TIMESTAMP() WHERE id = ?', [status, pedidoId]);
  }

  // Cancela um ingresso ativo (e as trocas pendentes que o envolvem). Se ele foi comprado por
  // quem ainda o possui, registra o estorno simulado do valor pago.
  async function desativarIngresso(conexao, ingresso, motivo) {
    await conexao.execute(
      `UPDATE troca_ingresso SET status = 'Cancelada', data_resposta = CURRENT_TIMESTAMP
        WHERE status = 'Pendente' AND (ingresso_solicitado_id = ? OR ingresso_ofertado_id = ?)`,
      [ingresso.id, ingresso.id],
    );
    await conexao.execute(
      "UPDATE ingresso SET status = 'C', disponivel_troca = FALSE WHERE id = ?",
      [ingresso.id],
    );
    if (!ingresso.pedido_id) return false;
    const pedido = await lerPedido(conexao, ingresso.pedido_id, { travar: true });
    if (!pedido || pedido.usuario_id !== ingresso.dono_atual_id) return false;
    // Ingresso que já foi revendido ou transferido não gera estorno, mesmo se voltou ao comprador.
    if (await repasse.foiRepassado(conexao, ingresso.id)) return false;
    await conexao.execute(
      `INSERT INTO estorno (pedido_id, ingresso_id, valor, motivo, criado_em)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [pedido.id, ingresso.id, ingresso.preco, motivo],
    );
    await atualizarSituacaoEstorno(conexao, pedido.id);
    return true;
  }

  async function pedidoParaResposta(conexao, pedidoId) {
    const [[p]] = await conexao.execute(
      `SELECT p.id, p.usuario_id, p.evento_id, p.tipo_ingresso, p.quantidade, p.valor_unitario,
              p.valor_total, p.status, p.forma_pagamento, p.motivo, p.anuncio_id,
              DATE_FORMAT(p.criado_em, ${DATA_ISO}) AS criado,
              DATE_FORMAT(p.expira_em, ${DATA_ISO}) AS expira,
              DATE_FORMAT(p.pago_em, ${DATA_ISO}) AS pago,
              GREATEST(TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), p.expira_em), 0) AS segundos,
              e.titulo, e.imagem_capa_url, DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS data_evento,
              e.\`local\` AS local_evento, (e.data_inicio > CURRENT_DATE) AS antes_do_evento
         FROM pedido p JOIN evento e ON e.id = p.evento_id
        WHERE p.id = ?`,
      [pedidoId],
    );
    const repasse = Boolean(p.anuncio_id);
    const colunas = `i.id, i.codigo_ingresso, i.status, i.preco, i.dono_atual_id, s.valor AS estornado,
              ${SQL_NUNCA_REPASSADO('i')} AS nunca_repassado, ${SQL_EM_REPASSE('i')} AS em_repasse
         FROM ingresso i LEFT JOIN estorno s ON s.ingresso_id = i.id`;
    // Na compra de um anúncio, o ingresso só aparece no pedido depois do pagamento.
    const [ingressos] = !repasse
      ? await conexao.execute(`SELECT ${colunas} WHERE i.pedido_id = ? ORDER BY i.id`, [pedidoId])
      : p.status === 'pago'
        ? await conexao.execute(
            `SELECT ${colunas} WHERE i.id = (SELECT ingresso_id FROM anuncio_ingresso WHERE id = ?)`,
            [p.anuncio_id],
          )
        : [[]];
    // Estorno: só na venda original, até a véspera, para ingresso que nunca foi repassado e que não
    // está anunciado nem com convite pendente.
    const reembolsaveis = !repasse && Number(p.antes_do_evento)
      ? ingressos.filter(
          (i) =>
            i.status === 'A' && i.dono_atual_id === p.usuario_id && Number(i.nunca_repassado) && !Number(i.em_repasse),
        )
      : [];
    const reservado = p.status === 'reservado';
    return {
      id: Number(p.id),
      eventId: Number(p.evento_id),
      eventTitle: p.titulo,
      resale: repasse,
      eventDate: p.data_evento,
      location: p.local_evento,
      image: p.imagem_capa_url || '/images/asset-5.jpg',
      type: p.tipo_ingresso,
      quantity: Number(p.quantidade),
      unitPrice: Number(p.valor_unitario),
      total: Number(p.valor_total),
      status: p.status,
      paymentMethod: p.forma_pagamento,
      reason: p.motivo,
      createdAt: p.criado,
      expiresAt: reservado ? p.expira : null,
      paidAt: p.pago,
      secondsToExpire: reservado ? Number(p.segundos) : 0,
      tickets: ingressos.map((i) => ({
        id: Number(i.id),
        // O código vale como credencial: só aparece enquanto o ingresso é de quem fez o pedido.
        code: i.dono_atual_id === p.usuario_id ? i.codigo_ingresso : null,
        status: rotuloTicket(i.status),
        withBuyer: i.dono_atual_id === p.usuario_id,
        refunded: i.estornado !== null,
      })),
      refundedAmount: ingressos.reduce((soma, i) => soma + (i.estornado === null ? 0 : centavos(i.estornado)), 0) / 100,
      refundableAmount: reembolsaveis.reduce((soma, i) => soma + centavos(i.preco), 0) / 100,
      canPay: reservado,
      canCancel: reservado,
      canRefund: ['pago', 'estornado_parcial'].includes(p.status) && reembolsaveis.length > 0,
    };
  }

  // Executa uma gravação numa transação e guarda a resposta pela chave Idempotency-Key.
  async function executarIdempotente(req, operacao, corpo, trabalho) {
    const chave = req.get('Idempotency-Key');
    if (typeof chave !== 'string' || !CHAVE_VALIDA.test(chave)) {
      falhar(400, 'Envie o cabeçalho Idempotency-Key com 16 a 120 caracteres.');
    }
    const resumo = resumoConteudo(operacao, corpo);
    // Fora da transação: vencer reservas não precisa travar os pedidos que estão sendo gravados.
    await expirarTudo();
    for (let tentativa = 1; ; tentativa += 1) {
      try {
        return await gravarUmaVez(req, chave, operacao, resumo, trabalho);
      } catch (error) {
        // Pedidos simultâneos podem travar uns aos outros no banco; repetir resolve.
        if (error.code === 'ER_LOCK_DEADLOCK' && tentativa < 3) continue;
        throw error;
      }
    }
  }

  async function gravarUmaVez(req, chave, operacao, resumo, trabalho) {
    const conexao = await db.getConnection();
    try {
      // Cada leitura enxerga o que já foi gravado por quem segurava a trava do evento antes.
      await conexao.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await conexao.beginTransaction();
      try {
        await conexao.execute(
          `INSERT INTO pedido_idempotencia (usuario_id, chave, operacao, hash_conteudo, criado_em)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
          [req.user.id, chave, operacao, resumo],
        );
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
        // Leitura simples (sem FOR UPDATE): a gravação anterior já terminou e várias repetições
        // podem ler ao mesmo tempo sem disputar a mesma trava.
        const [[anterior]] = await conexao.execute(
          'SELECT hash_conteudo, status_http, resposta_json FROM pedido_idempotencia WHERE usuario_id = ? AND chave = ?',
          [req.user.id, chave],
        );
        await conexao.rollback();
        if (anterior.hash_conteudo !== resumo) {
          falhar(409, 'Esta ação já foi registrada com outros dados. Recarregue a página e tente de novo.');
        }
        return { status: anterior.status_http, corpo: JSON.parse(anterior.resposta_json) };
      }
      const { status, corpo: resposta } = await trabalho(conexao);
      await conexao.execute(
        'UPDATE pedido_idempotencia SET status_http = ?, resposta_json = ? WHERE usuario_id = ? AND chave = ?',
        [status, JSON.stringify(resposta), req.user.id, chave],
      );
      await conexao.commit();
      return { status, corpo: resposta };
    } catch (error) {
      await conexao.rollback().catch(() => {});
      throw error;
    } finally {
      conexao.release();
    }
  }

  async function exigirParticipante(req, res) {
    if (!req.user) {
      res.status(401).json({ error: 'Sua sessão terminou ou você ainda não entrou. Entre novamente.', code: 'UNAUTHENTICATED' });
      return false;
    }
    return requireUserRole(req.user.id, 1, res);
  }

  function rota(trabalho) {
    return async (req, res) => {
      try {
        if (!(await exigirParticipante(req, res))) return;
        await trabalho(req, res);
      } catch (error) {
        if (error instanceof ErroPedido) return res.status(error.status).json({ error: error.message });
        console.error('Erro ao processar pedido:', error);
        res.status(500).json({ error: 'Erro interno ao processar o pedido.' });
      }
    };
  }

  // Busca o pedido da conta logada; pedido de outra conta responde como inexistente.
  async function pedidoDaConta(conexao, req, { travar = false } = {}) {
    const pedidoId = inteiroPositivo(req.params.id);
    if (!pedidoId) falhar(400, 'Informe um pedido válido.');
    const pedido = await lerPedido(conexao, pedidoId, { travar });
    if (!pedido || pedido.usuario_id !== req.user.id) falhar(404, 'Pedido não encontrado.');
    return pedido;
  }

  function registrarRotas(app) {
    repasse.registrarRotas(app);

    app.get('/api/pedidos', rota(async (req, res) => {
      await expirarTudo();
      const [linhas] = await db.execute(
        'SELECT id FROM pedido WHERE usuario_id = ? ORDER BY id DESC LIMIT 100',
        [req.user.id],
      );
      res.json(await Promise.all(linhas.map((linha) => pedidoParaResposta(db, linha.id))));
    }));

    app.get('/api/pedidos/:id', rota(async (req, res) => {
      await expirarTudo();
      const pedido = await pedidoDaConta(db, req);
      res.json(await pedidoParaResposta(db, pedido.id));
    }));

    app.post('/api/pedidos', rota(async (req, res) => {
      const { eventId, type, quantity, halfDeclaration } = req.body || {};
      const eventoId = inteiroPositivo(eventId);
      const quantidade = Number(quantity);
      if (!eventoId || !Object.hasOwn(PERCENTUAL_TIPO, type) || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 6) {
        falhar(400, 'Informe evento, tipo de ingresso e quantidade válidos (1 a 6).');
      }
      if (type === 'Meia-entrada' && halfDeclaration !== true) {
        falhar(400, 'Confirme a declaração de direito à meia-entrada (simulação).');
      }
      const resultado = await executarIdempotente(
        req,
        'criar',
        { eventId: eventoId, type, quantity: quantidade, halfDeclaration: halfDeclaration === true },
        async (conexao) => {
          const evento = await travarEvento(conexao, eventoId);
          await conferirLotacaoELimite(conexao, evento, req.user.id, quantidade);
          const pedidoId = await inserirPedido(conexao, { usuarioId: req.user.id, evento, tipo: type, quantidade });
          return { status: 201, corpo: await pedidoParaResposta(conexao, pedidoId) };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.post('/api/pedidos/:id/pagar', rota(async (req, res) => {
      const { paymentMethod } = req.body || {};
      const resultado = await executarIdempotente(req, `pagar:${req.params.id}`, { paymentMethod }, async (conexao) => {
        const previa = await pedidoDaConta(conexao, req);
        const evento = await travarEvento(conexao, previa.evento_id, { vendas: false });
        const pedido = await lerPedido(conexao, previa.id, { travar: true });
        if (pedido.status === 'pago') return { status: 200, corpo: await pedidoParaResposta(conexao, pedido.id) };
        if (pedido.status !== 'reservado' || !Number(pedido.no_prazo)) {
          falhar(409, 'Esta reserva foi cancelada, expirou ou já foi encerrada. Faça um novo pedido.');
        }
        if (evento.status !== 'Publicado' || !Number(evento.vigente)) {
          falhar(409, 'Este evento não está mais disponível para venda.');
        }
        const gratuito = Number(pedido.valor_total) === 0;
        if (!gratuito && !FORMAS_PAGAMENTO.includes(paymentMethod)) {
          falhar(400, 'Escolha Pix ou cartão (pagamento simulado).');
        }
        if (pedido.anuncio_id) {
          await conferirLimiteConta(conexao, evento.id, pedido.usuario_id, pedido.quantidade, {
            ignorarPedidoId: pedido.id,
          });
        } else {
          await conferirLotacaoELimite(conexao, evento, pedido.usuario_id, pedido.quantidade, pedido.id);
        }
        const cenario = gratuito ? 'aprovado' : cenarioPagamento();
        const forma = gratuito ? 'gratuito' : paymentMethod;
        if (cenario === 'aprovado') {
          if (pedido.anuncio_id) await repasse.entregarRepasse(conexao, pedido);
          else await emitirIngressos(conexao, pedido);
          await conexao.execute(
            `UPDATE pedido SET status = 'pago', forma_pagamento = ?, motivo = NULL,
                    pago_em = UTC_TIMESTAMP(), atualizado_em = UTC_TIMESTAMP() WHERE id = ?`,
            [forma, pedido.id],
          );
        } else {
          await conexao.execute(
            `UPDATE pedido SET status = 'recusado', forma_pagamento = ?, motivo = ?,
                    atualizado_em = UTC_TIMESTAMP() WHERE id = ?`,
            [
              forma,
              cenario === 'recusado'
                ? 'Pagamento recusado (simulação). A reserva foi liberada.'
                : 'Pagamento indisponível no momento (simulação). A reserva foi liberada.',
              pedido.id,
            ],
          );
          if (pedido.anuncio_id) {
            await repasse.liberarRepasse(conexao, pedido, 'left');
            await repasse.alocarFila(conexao, evento.id);
          }
        }
        return { status: 200, corpo: await pedidoParaResposta(conexao, pedido.id) };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.post('/api/pedidos/:id/cancelar', rota(async (req, res) => {
      const resultado = await executarIdempotente(req, `cancelar:${req.params.id}`, {}, async (conexao) => {
        const previa = await pedidoDaConta(conexao, req);
        await travarEvento(conexao, previa.evento_id, { vendas: false });
        const pedido = await lerPedido(conexao, previa.id, { travar: true });
        if (pedido.status === 'reservado') {
          await conexao.execute(
            `UPDATE pedido SET status = 'cancelado', motivo = 'Reserva cancelada pela conta',
                    atualizado_em = UTC_TIMESTAMP() WHERE id = ?`,
            [pedido.id],
          );
          if (pedido.anuncio_id) {
            await repasse.liberarRepasse(conexao, pedido, 'left');
            await repasse.alocarFila(conexao, pedido.evento_id);
          }
        } else if (!['cancelado', 'expirado', 'recusado'].includes(pedido.status)) {
          falhar(409, 'Pedido pago não é cancelado: use a solicitação de estorno.');
        }
        return { status: 200, corpo: await pedidoParaResposta(conexao, pedido.id) };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.post('/api/pedidos/:id/estornar', rota(async (req, res) => {
      const resultado = await executarIdempotente(req, `estornar:${req.params.id}`, {}, async (conexao) => {
        const previa = await pedidoDaConta(conexao, req);
        const evento = await travarEvento(conexao, previa.evento_id, { vendas: false });
        const pedido = await lerPedido(conexao, previa.id, { travar: true });
        if (!['pago', 'estornado_parcial'].includes(pedido.status)) {
          falhar(409, 'Só pedidos pagos podem ser estornados.');
        }
        if (pedido.anuncio_id) {
          falhar(409, 'Compras de revenda não têm estorno. Você pode revender ou transferir o ingresso.');
        }
        if (!Number(evento.antes_do_inicio)) {
          falhar(409, 'O estorno só pode ser pedido até a véspera do evento.');
        }
        const [ingressos] = await conexao.execute(
          'SELECT id, preco, status, dono_atual_id, pedido_id FROM ingresso WHERE pedido_id = ? ORDER BY id FOR UPDATE',
          [pedido.id],
        );
        const elegiveis = [];
        for (const ingresso of ingressos) {
          if (ingresso.status !== 'A' || ingresso.dono_atual_id !== pedido.usuario_id) continue;
          if (await repasse.foiRepassado(conexao, ingresso.id)) continue;
          if (await repasse.bloqueioDeRepasse(conexao, ingresso.id)) continue;
          elegiveis.push(ingresso);
        }
        if (!elegiveis.length) {
          falhar(
            409,
            'Nenhum ingresso deste pedido pode ser estornado (já usados, cancelados, repassados ou anunciados para revenda).',
          );
        }
        for (const ingresso of elegiveis) await desativarIngresso(conexao, ingresso, 'Estorno solicitado pela conta');
        return { status: 200, corpo: await pedidoParaResposta(conexao, pedido.id) };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));
  }

  // Compatibilidade: POST /api/eventos/:id/ingressos continua comprando direto (pedido já pago).
  async function comprarDireto(conexao, { usuarioId, eventoId, tipo, quantidade }) {
    let evento;
    try {
      evento = await travarEvento(conexao, eventoId);
    } catch (error) {
      // Mesma resposta que a rota antiga dava para evento inexistente ou fora de venda.
      if (error instanceof ErroPedido) falhar(404, 'Evento não encontrado ou indisponível para reserva.');
      throw error;
    }
    await conferirLotacaoELimite(conexao, evento, usuarioId, quantidade);
    const pedidoId = await inserirPedido(conexao, { usuarioId, evento, tipo, quantidade, status: 'pago', forma: 'direto' });
    await emitirIngressos(conexao, await lerPedido(conexao, pedidoId));
    const [linhas] = await conexao.execute('SELECT id FROM ingresso WHERE pedido_id = ? ORDER BY id', [pedidoId]);
    return linhas.map((linha) => linha.id);
  }

  // Usado por PUT /api/ingressos/:id/cancelar.
  async function cancelarIngresso(conexao, { ingressoId, usuarioId }) {
    const [[ingresso]] = await conexao.execute(
      `SELECT i.id, i.status, i.preco, i.dono_atual_id, i.pedido_id, (e.data_inicio > CURRENT_DATE) AS antes_do_evento
         FROM ingresso i JOIN evento e ON e.id = i.evento_id
        WHERE i.id = ? AND i.dono_atual_id = ? FOR UPDATE`,
      [ingressoId, usuarioId],
    );
    if (!ingresso) falhar(404, 'Ingresso não encontrado nesta conta.');
    if (ingresso.status !== 'A') falhar(409, 'Somente ingressos ativos podem ser cancelados.');
    if (!Number(ingresso.antes_do_evento)) falhar(409, 'O evento já começou; o ingresso não pode mais ser cancelado.');
    const bloqueio = await repasse.bloqueioDeRepasse(conexao, ingresso.id);
    if (bloqueio) falhar(409, bloqueio);
    return desativarIngresso(conexao, ingresso, 'Cancelamento do ingresso pela conta');
  }

  const repasse = criarRepasse({
    db,
    falhar,
    inteiroPositivo,
    limitePorConta: LIMITE_POR_CONTA,
    travarEvento,
    lerPedido,
    pedidoParaResposta,
    executarIdempotente,
    emTransacao,
    rota,
    contarConta,
    conferirLimiteConta,
    minutosReserva,
    expirar: expirarTudo,
  });

  return {
    registrarRotas,
    comprarDireto,
    cancelarIngresso,
    bloqueioDeRepasse: (conexao, ingressoId) => repasse.bloqueioDeRepasse(conexao, ingressoId),
    ErroPedido,
  };
}

module.exports = { criarPedidos, ErroPedido, centavosUnitarios, resumoConteudo, cenarioPagamento, minutosReserva };
