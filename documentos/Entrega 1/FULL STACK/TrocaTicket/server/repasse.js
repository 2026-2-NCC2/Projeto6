// Revenda, fila de espera e transferência com aceite — etapa 4 da integração com a TrocaTicket 2.0.
//
// Adaptado de documentos/Site/TrocaTicket 2.0/server/src/transacoes (reservas-fila.js,
// transferencias.js e contexto.js) para o banco da main (MIGRACAO_REPASSE.sql) e para os pedidos
// da etapa 3 (pedidos.js), que fornecem a transação idempotente, o pagamento simulado e o prazo.
//
// Regras:
// - Só o dono atual anuncia ou transfere um ingresso ativo de evento publicado e ainda vigente.
// - Teto de revenda: o valor que o dono atual pagou (ingresso.preco). Quem recebeu de graça só
//   pode transferir de graça. A revenda passa o preço pago ao comprador; o convite, zero.
// - Cada ingresso tem no máximo uma operação aberta: anúncio, convite, oferta de troca ou reserva.
// - Reservar um anúncio cria um pedido da etapa 3 (prazo, pagamento simulado e cancelamento).
//   Pagamento aprovado passa o ingresso ao comprador com código novo; recusa, cancelamento ou
//   prazo vencido devolvem o anúncio à venda e chamam o próximo da fila.
// - Fila por evento e tipo de ingresso, por ordem de chegada; a vez vira uma reserva em Meus pedidos.
// - Convite de transferência com prazo: o dono só muda quando a outra conta aceita.
// - Mesmo limite da etapa 3: 6 ingressos ativos, reservados ou convidados por conta e evento.
// - Ingresso já revendido ou transferido por convite não tem estorno.
// Toda ordem de travas começa pelo evento, como nos pedidos: evento -> anúncio/fila/convite/pedido
// -> ingresso. Assim operações do mesmo evento acontecem uma de cada vez e não se travam.

const crypto = require('crypto');

const TIPOS = ['Inteira', 'Meia-entrada'];
const PRECO_MAXIMO_CENTAVOS = 9999999999;
const DATA_ISO = "'%Y-%m-%dT%H:%i:%sZ'";
// Só o formato mínimo: o convite precisa achar uma conta já cadastrada com este e-mail.
const EMAIL = /^[^@]+@[^@]+$/;

// Ingresso que nunca foi revendido nem transferido por convite (o estorno depende disso).
const SQL_NUNCA_REPASSADO = (alias = 'i') =>
  `(NOT EXISTS (SELECT 1 FROM anuncio_ingresso ar WHERE ar.ingresso_id = ${alias}.id AND ar.status = 'sold')
    AND NOT EXISTS (SELECT 1 FROM convite_ingresso cr WHERE cr.ingresso_id = ${alias}.id AND cr.status = 'accepted'))`;

// Ingresso com anúncio aberto ou convite pendente.
const SQL_EM_REPASSE = (alias = 'i') =>
  `(EXISTS (SELECT 1 FROM anuncio_ingresso ao WHERE ao.ingresso_id = ${alias}.id AND ao.status IN ('active', 'reserved'))
    OR EXISTS (SELECT 1 FROM convite_ingresso co WHERE co.ingresso_id = ${alias}.id AND co.status = 'pending'
                 AND co.expira_em > UTC_TIMESTAMP()))`;

function minutosConvite() {
  const minutos = Number(process.env.CONVITE_MINUTOS);
  return Number.isInteger(minutos) && minutos >= 1 && minutos <= 10080 ? minutos : 1440;
}

const centavos = (valor) => Math.round(Number(valor) * 100);
const reais = (valorCentavos) => (valorCentavos / 100).toFixed(2);
const brl = (valorCentavos) =>
  (valorCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const novoCodigo = (eventoId) => `TT-${eventoId}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

function criarRepasse({
  db,
  falhar,
  inteiroPositivo,
  limitePorConta,
  travarEvento,
  lerPedido,
  pedidoParaResposta,
  executarIdempotente,
  emTransacao,
  rota,
  contarConta,
  conferirLimiteConta,
  minutosReserva,
  expirar,
}) {
  // ---------- leitura ----------

  const SELECT_ANUNCIO = `
    SELECT a.id, a.ingresso_id, a.vendedor_id, a.preco_centavos, a.status,
           i.evento_id, i.tipo_ingresso, i.preco, i.status AS status_ingresso, i.dono_atual_id,
           e.titulo, e.imagem_capa_url, DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS data_evento,
           e.\`local\` AS local_evento
      FROM anuncio_ingresso a
      JOIN ingresso i ON i.id = a.ingresso_id
      JOIN evento e ON e.id = i.evento_id`;

  async function lerAnuncio(conexao, anuncioId, { travar = false } = {}) {
    const [[anuncio]] = await conexao.execute(
      `${SELECT_ANUNCIO} WHERE a.id = ?${travar ? ' FOR UPDATE' : ''}`,
      [anuncioId],
    );
    return anuncio || null;
  }

  // Quem vende vê os próprios detalhes; os demais veem só o que precisam para comprar.
  function anuncioParaResposta(a, usuarioId) {
    const meu = a.vendedor_id === usuarioId;
    return {
      id: Number(a.id),
      eventId: Number(a.evento_id),
      eventTitle: a.titulo,
      eventDate: a.data_evento,
      location: a.local_evento,
      image: a.imagem_capa_url || '/images/asset-5.jpg',
      type: a.tipo_ingresso,
      priceCents: Number(a.preco_centavos),
      status: a.status,
      mine: meu,
      sellerId: meu ? usuarioId : null,
      ticketId: meu ? Number(a.ingresso_id) : null,
      ceilingCents: meu ? centavos(a.preco) : null,
    };
  }

  const SELECT_FILA = `
    SELECT f.id, f.evento_id, f.tipo_ingresso, f.status, f.pedido_id, e.titulo,
           DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS data_evento,
           (SELECT COUNT(*) FROM fila_repasse q
             WHERE q.evento_id = f.evento_id AND q.tipo_ingresso = f.tipo_ingresso
               AND q.status = 'queued' AND q.id <= f.id) AS posicao
      FROM fila_repasse f JOIN evento e ON e.id = f.evento_id`;

  function filaParaResposta(f) {
    return {
      id: Number(f.id),
      eventId: Number(f.evento_id),
      eventTitle: f.titulo,
      eventDate: f.data_evento,
      type: f.tipo_ingresso,
      status: f.status,
      position: f.status === 'queued' ? Number(f.posicao) : null,
      orderId: f.pedido_id ? Number(f.pedido_id) : null,
    };
  }

  async function lerFila(conexao, filaId) {
    const [[fila]] = await conexao.execute(`${SELECT_FILA} WHERE f.id = ?`, [filaId]);
    return fila || null;
  }

  const SELECT_CONVITE = `
    SELECT c.id, c.ingresso_id, c.remetente_id, c.destinatario_id, c.status,
           DATE_FORMAT(c.expira_em, ${DATA_ISO}) AS expira,
           i.evento_id, i.tipo_ingresso, e.titulo, DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS data_evento,
           r.nome AS remetente_nome, d.nome AS destinatario_nome
      FROM convite_ingresso c
      JOIN ingresso i ON i.id = c.ingresso_id
      JOIN evento e ON e.id = i.evento_id
      JOIN usuario r ON r.id = c.remetente_id
      JOIN usuario d ON d.id = c.destinatario_id`;

  function conviteParaResposta(c, usuarioId) {
    return {
      id: Number(c.id),
      ticketId: Number(c.ingresso_id),
      eventId: Number(c.evento_id),
      eventTitle: c.titulo,
      eventDate: c.data_evento,
      type: c.tipo_ingresso,
      status: c.status,
      expiresAt: c.expira,
      fromUserId: Number(c.remetente_id),
      toUserId: Number(c.destinatario_id),
      fromName: c.remetente_nome,
      toName: c.destinatario_nome,
      direction: c.destinatario_id === usuarioId ? 'recebido' : 'enviado',
    };
  }

  async function lerConvite(conexao, conviteId) {
    const [[convite]] = await conexao.execute(`${SELECT_CONVITE} WHERE c.id = ?`, [conviteId]);
    return convite || null;
  }

  // ---------- ingresso ----------

  async function eventoDoIngresso(conexao, ingressoId) {
    const [[ingresso]] = await conexao.execute('SELECT evento_id FROM ingresso WHERE id = ?', [ingressoId]);
    if (!ingresso) falhar(404, 'Ingresso não encontrado nesta conta.');
    return ingresso.evento_id;
  }

  async function travarIngresso(conexao, ingressoId) {
    const [[ingresso]] = await conexao.execute(
      `SELECT id, evento_id, dono_atual_id, tipo_ingresso, preco, status, disponivel_troca
         FROM ingresso WHERE id = ? FOR UPDATE`,
      [ingressoId],
    );
    return ingresso || null;
  }

  async function ingressoDaConta(conexao, ingressoId, usuarioId) {
    const ingresso = await travarIngresso(conexao, ingressoId);
    if (!ingresso || ingresso.dono_atual_id !== usuarioId) falhar(404, 'Ingresso não encontrado nesta conta.');
    if (ingresso.status !== 'A') falhar(409, 'Somente ingressos ativos podem ser revendidos ou transferidos.');
    if (!TIPOS.includes(ingresso.tipo_ingresso)) falhar(409, 'Este tipo de ingresso não pode ser repassado.');
    return ingresso;
  }

  async function operacoesAbertas(conexao, ingressoId) {
    const [[linha]] = await conexao.execute(
      `SELECT
         (SELECT id FROM anuncio_ingresso WHERE ingresso_id = ? AND status IN ('active', 'reserved') LIMIT 1) AS anuncio,
         (SELECT id FROM convite_ingresso WHERE ingresso_id = ? AND status = 'pending'
             AND expira_em > UTC_TIMESTAMP() LIMIT 1) AS convite,
         (SELECT id FROM troca_ingresso WHERE status = 'Pendente'
             AND (ingresso_solicitado_id = ? OR ingresso_ofertado_id = ?) LIMIT 1) AS troca`,
      [ingressoId, ingressoId, ingressoId, ingressoId],
    );
    return linha;
  }

  // Um ingresso só entra numa operação de repasse se não estiver em nenhuma outra.
  async function exigirLivre(conexao, ingresso) {
    const abertas = await operacoesAbertas(conexao, ingresso.id);
    if (ingresso.disponivel_troca || abertas.troca) {
      falhar(409, 'Este ingresso está oferecido para troca. Tire-o das trocas antes de revender ou transferir.');
    }
    if (abertas.anuncio) falhar(409, 'Este ingresso já está anunciado para revenda.');
    if (abertas.convite) falhar(409, 'Este ingresso já tem um convite de transferência pendente.');
  }

  // Usado pelas trocas da main, pelo cancelamento e pelo estorno: devolve o motivo do bloqueio.
  async function bloqueioDeRepasse(conexao, ingressoId) {
    const abertas = await operacoesAbertas(conexao, ingressoId);
    if (abertas.anuncio) return 'Este ingresso está anunciado para revenda. Retire o anúncio antes.';
    if (abertas.convite) return 'Este ingresso tem um convite de transferência pendente. Cancele o convite antes.';
    return null;
  }

  async function foiRepassado(conexao, ingressoId) {
    const [[linha]] = await conexao.execute(
      `SELECT NOT ${SQL_NUNCA_REPASSADO('i')} AS repassado FROM ingresso i WHERE i.id = ?`,
      [ingressoId],
    );
    return Boolean(Number(linha?.repassado));
  }

  // Muda o dono, gera código novo (o antigo deixa de valer) e define o novo teto de revenda.
  async function passarIngresso(conexao, ingresso, novoDonoId, precoPagoReais) {
    await conexao.execute(
      `UPDATE ingresso SET dono_atual_id = ?, preco = ?, disponivel_troca = FALSE, codigo_ingresso = ?
        WHERE id = ?`,
      [novoDonoId, precoPagoReais, novoCodigo(ingresso.evento_id), ingresso.id],
    );
  }

  // ---------- reservas de anúncio e fila ----------

  async function reservarAnuncio(conexao, anuncio, usuarioId) {
    await conferirLimiteConta(conexao, anuncio.evento_id, usuarioId, 1);
    const preco = reais(Number(anuncio.preco_centavos));
    const [resultado] = await conexao.execute(
      `INSERT INTO pedido
         (usuario_id, evento_id, tipo_ingresso, quantidade, valor_unitario, valor_total, status,
          forma_pagamento, criado_em, expira_em, pago_em, atualizado_em, anuncio_id)
       VALUES (?, ?, ?, 1, ?, ?, 'reservado', NULL, UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? MINUTE,
               NULL, UTC_TIMESTAMP(), ?)`,
      [usuarioId, anuncio.evento_id, anuncio.tipo_ingresso, preco, preco, minutosReserva(), anuncio.id],
    );
    await conexao.execute("UPDATE anuncio_ingresso SET status = 'reserved' WHERE id = ?", [anuncio.id]);
    return resultado.insertId;
  }

  // Dá cada anúncio ativo do evento ao primeiro da fila do mesmo tipo (que não seja o vendedor e
  // ainda caiba no limite da conta). Chamada com o evento travado.
  async function alocarFila(conexao, eventoId) {
    const [[evento]] = await conexao.execute(
      'SELECT status, (data_fim >= CURRENT_DATE) AS vigente FROM evento WHERE id = ?',
      [eventoId],
    );
    if (!evento || evento.status !== 'Publicado' || !Number(evento.vigente)) return;
    const [anuncios] = await conexao.execute(
      `SELECT a.id, a.ingresso_id, a.vendedor_id, a.preco_centavos, i.evento_id, i.tipo_ingresso,
              i.status AS status_ingresso, i.dono_atual_id
         FROM anuncio_ingresso a JOIN ingresso i ON i.id = a.ingresso_id
        WHERE i.evento_id = ? AND a.status = 'active'
        ORDER BY a.id FOR UPDATE`,
      [eventoId],
    );
    for (const anuncio of anuncios) {
      if (anuncio.status_ingresso !== 'A' || anuncio.dono_atual_id !== anuncio.vendedor_id) {
        await conexao.execute("UPDATE anuncio_ingresso SET status = 'cancelled' WHERE id = ?", [anuncio.id]);
        continue;
      }
      const [candidatos] = await conexao.execute(
        `SELECT id, usuario_id FROM fila_repasse
          WHERE evento_id = ? AND tipo_ingresso = ? AND status = 'queued' AND usuario_id <> ?
          ORDER BY id FOR UPDATE`,
        [eventoId, anuncio.tipo_ingresso, anuncio.vendedor_id],
      );
      for (const candidato of candidatos) {
        if ((await contarConta(conexao, eventoId, candidato.usuario_id)) >= limitePorConta) continue;
        const pedidoId = await reservarAnuncio(conexao, anuncio, candidato.usuario_id);
        await conexao.execute("UPDATE fila_repasse SET status = 'reserved', pedido_id = ? WHERE id = ?", [
          pedidoId,
          candidato.id,
        ]);
        break;
      }
    }
  }

  // Reserva de anúncio encerrada sem pagamento (cancelada, recusada ou vencida): o anúncio volta à
  // venda e a vez de quem estava na fila termina com a situação informada.
  async function liberarRepasse(conexao, pedido, situacaoFila) {
    if (!pedido.anuncio_id) return;
    await conexao.execute("UPDATE anuncio_ingresso SET status = 'active' WHERE id = ? AND status = 'reserved'", [
      pedido.anuncio_id,
    ]);
    await conexao.execute("UPDATE fila_repasse SET status = ? WHERE pedido_id = ? AND status = 'reserved'", [
      situacaoFila,
      pedido.id,
    ]);
  }

  // Pagamento aprovado de uma reserva de anúncio: o ingresso passa ao comprador.
  async function entregarRepasse(conexao, pedido) {
    const [[anuncio]] = await conexao.execute('SELECT * FROM anuncio_ingresso WHERE id = ? FOR UPDATE', [
      pedido.anuncio_id,
    ]);
    const ingresso = anuncio ? await travarIngresso(conexao, anuncio.ingresso_id) : null;
    if (
      !anuncio ||
      anuncio.status !== 'reserved' ||
      !ingresso ||
      ingresso.status !== 'A' ||
      ingresso.dono_atual_id !== anuncio.vendedor_id
    ) {
      falhar(409, 'Este repasse não pode mais ser concluído porque o ingresso mudou de situação. Nada foi cobrado.');
    }
    await passarIngresso(conexao, ingresso, pedido.usuario_id, pedido.valor_unitario);
    await conexao.execute("UPDATE anuncio_ingresso SET status = 'sold' WHERE id = ?", [anuncio.id]);
    await conexao.execute("UPDATE fila_repasse SET status = 'completed' WHERE pedido_id = ? AND status = 'reserved'", [
      pedido.id,
    ]);
  }

  // Convites vencidos e reservas de anúncio vencidas (evento por evento, para chamar a fila).
  async function processarVencidos() {
    await db.execute(
      "UPDATE convite_ingresso SET status = 'expired' WHERE status = 'pending' AND expira_em <= UTC_TIMESTAMP()",
    );
    const [eventos] = await db.execute(
      `SELECT DISTINCT evento_id FROM pedido
        WHERE status = 'reservado' AND anuncio_id IS NOT NULL AND expira_em <= UTC_TIMESTAMP()`,
    );
    for (const { evento_id: eventoId } of eventos) {
      await emTransacao(async (conexao) => {
        await travarEvento(conexao, eventoId, { vendas: false });
        const [vencidos] = await conexao.execute(
          `SELECT id, anuncio_id FROM pedido
            WHERE evento_id = ? AND status = 'reservado' AND anuncio_id IS NOT NULL
              AND expira_em <= UTC_TIMESTAMP() FOR UPDATE`,
          [eventoId],
        );
        for (const pedido of vencidos) {
          await conexao.execute(
            `UPDATE pedido SET status = 'expirado', motivo = 'Prazo de pagamento encerrado',
                    atualizado_em = UTC_TIMESTAMP() WHERE id = ?`,
            [pedido.id],
          );
          await liberarRepasse(conexao, pedido, 'expired');
        }
        await alocarFila(conexao, eventoId);
      });
    }
  }

  // ---------- rotas ----------

  function idDaRota(req, mensagem) {
    const id = inteiroPositivo(req.params.id);
    if (!id) falhar(400, mensagem);
    return id;
  }

  function registrarRotas(app) {
    // Anúncios à venda (de eventos à venda) e todos os anúncios da própria conta.
    app.get('/api/anuncios', rota(async (req, res) => {
      await expirar();
      let eventoId = null;
      if (req.query.eventId !== undefined) {
        eventoId = inteiroPositivo(req.query.eventId);
        if (!eventoId) falhar(400, 'Informe um evento válido.');
      }
      const [linhas] = await db.execute(
        `${SELECT_ANUNCIO}
          WHERE ((a.status = 'active' AND e.status = 'Publicado' AND e.data_fim >= CURRENT_DATE)
                 OR a.vendedor_id = ?)${eventoId ? ' AND i.evento_id = ?' : ''}
          ORDER BY a.id DESC LIMIT 200`,
        eventoId ? [req.user.id, eventoId] : [req.user.id],
      );
      res.json(linhas.map((linha) => anuncioParaResposta(linha, req.user.id)));
    }));

    app.post('/api/anuncios', rota(async (req, res) => {
      const { ticketId, priceCents } = req.body || {};
      const ingressoId = inteiroPositivo(ticketId);
      const preco = Number(priceCents);
      if (!ingressoId || !Number.isSafeInteger(preco) || preco < 1 || preco > PRECO_MAXIMO_CENTAVOS) {
        falhar(400, 'Informe o ingresso e um preço de revenda válido.');
      }
      const resultado = await executarIdempotente(
        req,
        'anunciar',
        { ticketId: ingressoId, priceCents: preco },
        async (conexao) => {
          const eventoId = await eventoDoIngresso(conexao, ingressoId);
          await travarEvento(conexao, eventoId);
          const ingresso = await ingressoDaConta(conexao, ingressoId, req.user.id);
          await exigirLivre(conexao, ingresso);
          const teto = centavos(ingresso.preco);
          if (!teto) {
            falhar(409, 'Este ingresso foi recebido por transferência gratuita: ele só pode ser transferido de graça.');
          }
          if (preco > teto) {
            falhar(409, `O preço de revenda não pode passar de ${brl(teto)}, o valor pago por este ingresso.`);
          }
          const [inserido] = await conexao.execute(
            'INSERT INTO anuncio_ingresso (ingresso_id, vendedor_id, preco_centavos) VALUES (?, ?, ?)',
            [ingresso.id, req.user.id, preco],
          );
          await alocarFila(conexao, eventoId);
          return {
            status: 201,
            corpo: anuncioParaResposta(await lerAnuncio(conexao, inserido.insertId), req.user.id),
          };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.delete('/api/anuncios/:id', rota(async (req, res) => {
      const anuncioId = idDaRota(req, 'Informe um anúncio válido.');
      const resultado = await executarIdempotente(req, `retirar-anuncio:${anuncioId}`, {}, async (conexao) => {
        const previo = await lerAnuncio(conexao, anuncioId);
        if (!previo || previo.vendedor_id !== req.user.id) falhar(404, 'Anúncio não encontrado.');
        await travarEvento(conexao, previo.evento_id, { vendas: false });
        const anuncio = await lerAnuncio(conexao, anuncioId, { travar: true });
        if (anuncio.status === 'reserved') {
          falhar(409, 'Alguém está pagando por este anúncio agora. Aguarde o pagamento ou o fim do prazo.');
        }
        if (anuncio.status === 'sold') falhar(409, 'Este ingresso já foi vendido.');
        if (anuncio.status === 'active') {
          await conexao.execute("UPDATE anuncio_ingresso SET status = 'cancelled' WHERE id = ?", [anuncioId]);
        }
        return { status: 200, corpo: anuncioParaResposta(await lerAnuncio(conexao, anuncioId), req.user.id) };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.post('/api/anuncios/:id/reservar', rota(async (req, res) => {
      const anuncioId = idDaRota(req, 'Informe um anúncio válido.');
      const meia = req.body?.halfDeclaration === true;
      const resultado = await executarIdempotente(
        req,
        `reservar-anuncio:${anuncioId}`,
        { halfDeclaration: meia },
        async (conexao) => {
          const previo = await lerAnuncio(conexao, anuncioId);
          if (!previo) falhar(404, 'Anúncio não encontrado.');
          await travarEvento(conexao, previo.evento_id);
          // A fila tem prioridade: quem já esperava recebe o anúncio antes da compra direta.
          await alocarFila(conexao, previo.evento_id);
          const anuncio = await lerAnuncio(conexao, anuncioId, { travar: true });
          if (anuncio.vendedor_id === req.user.id) falhar(409, 'Este anúncio é seu.');
          const [[jaMinha]] = await conexao.execute(
            `SELECT id FROM pedido WHERE anuncio_id = ? AND usuario_id = ? AND status = 'reservado'
                AND expira_em > UTC_TIMESTAMP()`,
            [anuncioId, req.user.id],
          );
          if (jaMinha) return { status: 200, corpo: await pedidoParaResposta(conexao, jaMinha.id) };
          if (anuncio.status !== 'active') {
            falhar(409, 'Este anúncio já foi reservado ou encerrado. Entre na fila para ser avisado do próximo.');
          }
          if (anuncio.tipo_ingresso === 'Meia-entrada' && !meia) {
            falhar(400, 'Confirme a declaração de direito à meia-entrada (simulação).');
          }
          const ingresso = await travarIngresso(conexao, anuncio.ingresso_id);
          if (!ingresso || ingresso.status !== 'A' || ingresso.dono_atual_id !== anuncio.vendedor_id) {
            falhar(409, 'Este anúncio não está mais disponível.');
          }
          const pedidoId = await reservarAnuncio(conexao, anuncio, req.user.id);
          return { status: 201, corpo: await pedidoParaResposta(conexao, pedidoId) };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.get('/api/fila', rota(async (req, res) => {
      await expirar();
      const [linhas] = await db.execute(`${SELECT_FILA} WHERE f.usuario_id = ? ORDER BY f.id DESC LIMIT 100`, [
        req.user.id,
      ]);
      res.json(linhas.map(filaParaResposta));
    }));

    app.post('/api/fila', rota(async (req, res) => {
      const { eventId, type, halfDeclaration } = req.body || {};
      const eventoId = inteiroPositivo(eventId);
      if (!eventoId || !TIPOS.includes(type)) falhar(400, 'Informe o evento e o tipo de ingresso da fila.');
      if (type === 'Meia-entrada' && halfDeclaration !== true) {
        falhar(400, 'Confirme a declaração de direito à meia-entrada (simulação).');
      }
      const resultado = await executarIdempotente(
        req,
        'entrar-fila',
        { eventId: eventoId, type, halfDeclaration: halfDeclaration === true },
        async (conexao) => {
          await travarEvento(conexao, eventoId);
          const [[existente]] = await conexao.execute(
            `SELECT id FROM fila_repasse WHERE usuario_id = ? AND evento_id = ? AND tipo_ingresso = ?
                AND status IN ('queued', 'reserved') LIMIT 1`,
            [req.user.id, eventoId, type],
          );
          if (existente) falhar(409, 'Você já está na fila deste tipo de ingresso.');
          const [inserido] = await conexao.execute(
            'INSERT INTO fila_repasse (evento_id, usuario_id, tipo_ingresso) VALUES (?, ?, ?)',
            [eventoId, req.user.id, type],
          );
          await alocarFila(conexao, eventoId);
          return { status: 201, corpo: filaParaResposta(await lerFila(conexao, inserido.insertId)) };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.delete('/api/fila/:id', rota(async (req, res) => {
      const filaId = idDaRota(req, 'Informe uma fila válida.');
      const resultado = await executarIdempotente(req, `sair-fila:${filaId}`, {}, async (conexao) => {
        const [[previa]] = await conexao.execute('SELECT evento_id, usuario_id FROM fila_repasse WHERE id = ?', [
          filaId,
        ]);
        if (!previa || previa.usuario_id !== req.user.id) falhar(404, 'Fila não encontrada.');
        await travarEvento(conexao, previa.evento_id, { vendas: false });
        const [[fila]] = await conexao.execute('SELECT * FROM fila_repasse WHERE id = ? FOR UPDATE', [filaId]);
        if (fila.status === 'reserved') {
          const pedido = fila.pedido_id ? await lerPedido(conexao, fila.pedido_id, { travar: true }) : null;
          if (pedido?.status === 'pago') falhar(409, 'Sua vez já virou uma compra paga.');
          if (pedido?.status === 'reservado') {
            await conexao.execute(
              `UPDATE pedido SET status = 'cancelado', motivo = 'Saída da fila de espera',
                      atualizado_em = UTC_TIMESTAMP() WHERE id = ?`,
              [pedido.id],
            );
            await liberarRepasse(conexao, pedido, 'left');
          }
        }
        if (['queued', 'reserved'].includes(fila.status)) {
          await conexao.execute("UPDATE fila_repasse SET status = 'left' WHERE id = ?", [filaId]);
        }
        await alocarFila(conexao, previa.evento_id);
        return { status: 200, corpo: filaParaResposta(await lerFila(conexao, filaId)) };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.get('/api/transferencias', rota(async (req, res) => {
      await expirar();
      const [linhas] = await db.execute(
        `${SELECT_CONVITE} WHERE c.remetente_id = ? OR c.destinatario_id = ? ORDER BY c.id DESC LIMIT 100`,
        [req.user.id, req.user.id],
      );
      res.json(linhas.map((linha) => conviteParaResposta(linha, req.user.id)));
    }));

    app.post('/api/transferencias', rota(async (req, res) => {
      const { ticketId, email } = req.body || {};
      const ingressoId = inteiroPositivo(ticketId);
      const destinoEmail = String(email ?? '').trim().toLowerCase();
      if (!ingressoId || !EMAIL.test(destinoEmail) || destinoEmail.length > 191) {
        falhar(400, 'Informe o ingresso e o e-mail da conta que vai receber.');
      }
      const resultado = await executarIdempotente(
        req,
        'transferir',
        { ticketId: ingressoId, email: destinoEmail },
        async (conexao) => {
          const eventoId = await eventoDoIngresso(conexao, ingressoId);
          await travarEvento(conexao, eventoId);
          const ingresso = await ingressoDaConta(conexao, ingressoId, req.user.id);
          await exigirLivre(conexao, ingresso);
          const [[destino]] = await conexao.execute('SELECT id, tipo_perfil FROM usuario WHERE email = ?', [
            destinoEmail,
          ]);
          if (!destino || Number(destino.tipo_perfil) !== 1) {
            falhar(404, 'Não encontramos uma conta de usuário com esse e-mail.');
          }
          if (destino.id === req.user.id) falhar(400, 'Escolha outra conta para receber o ingresso.');
          await conferirLimiteConta(conexao, eventoId, destino.id, 1, {
            mensagem: `A conta de destino já tem o máximo de ${limitePorConta} ingressos para este evento.`,
          });
          const [inserido] = await conexao.execute(
            `INSERT INTO convite_ingresso (ingresso_id, remetente_id, destinatario_id, status, expira_em)
             VALUES (?, ?, ?, 'pending', UTC_TIMESTAMP() + INTERVAL ? MINUTE)`,
            [ingresso.id, req.user.id, destino.id, minutosConvite()],
          );
          return {
            status: 201,
            corpo: conviteParaResposta(await lerConvite(conexao, inserido.insertId), req.user.id),
          };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    const ACOES_CONVITE = { aceitar: 'accepted', recusar: 'rejected', cancelar: 'cancelled' };
    app.post('/api/transferencias/:id/:acao', rota(async (req, res) => {
      const conviteId = idDaRota(req, 'Informe um convite válido.');
      const acao = req.params.acao;
      if (!Object.hasOwn(ACOES_CONVITE, acao)) falhar(404, 'Ação não encontrada.');
      const resultado = await executarIdempotente(req, `convite-${acao}:${conviteId}`, {}, async (conexao) => {
        const previo = await lerConvite(conexao, conviteId);
        if (!previo || ![previo.remetente_id, previo.destinatario_id].includes(req.user.id)) {
          falhar(404, 'Convite não encontrado.');
        }
        const quemPode = acao === 'cancelar' ? previo.remetente_id : previo.destinatario_id;
        if (quemPode !== req.user.id) {
          falhar(403, acao === 'cancelar' ? 'Só quem enviou pode cancelar o convite.' : 'Só quem recebeu pode responder ao convite.');
        }
        const evento = await travarEvento(conexao, previo.evento_id, { vendas: false });
        const [[convite]] = await conexao.execute(
          'SELECT *, (expira_em > UTC_TIMESTAMP()) AS no_prazo FROM convite_ingresso WHERE id = ? FOR UPDATE',
          [conviteId],
        );
        if (convite.status === 'expired' || (convite.status === 'pending' && !Number(convite.no_prazo))) {
          falhar(409, 'Este convite expirou. O ingresso continua com quem enviou.');
        }
        if (convite.status !== 'pending') falhar(409, 'Este convite já foi respondido ou cancelado.');
        if (acao === 'aceitar') {
          if (evento.status !== 'Publicado' || !Number(evento.vigente)) {
            falhar(409, 'Este evento não aceita mais transferências.');
          }
          const ingresso = await travarIngresso(conexao, convite.ingresso_id);
          if (!ingresso || ingresso.status !== 'A' || ingresso.dono_atual_id !== convite.remetente_id) {
            falhar(409, 'Este ingresso mudou de situação e não pode mais ser transferido.');
          }
          await conferirLimiteConta(conexao, previo.evento_id, req.user.id, 1, { ignorarConviteId: conviteId });
          await passarIngresso(conexao, ingresso, req.user.id, '0.00');
        }
        await conexao.execute('UPDATE convite_ingresso SET status = ? WHERE id = ?', [ACOES_CONVITE[acao], conviteId]);
        return { status: 200, corpo: conviteParaResposta(await lerConvite(conexao, conviteId), req.user.id) };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));
  }

  return {
    registrarRotas,
    processarVencidos,
    alocarFila,
    liberarRepasse,
    entregarRepasse,
    bloqueioDeRepasse,
    foiRepassado,
  };
}

module.exports = { criarRepasse, SQL_NUNCA_REPASSADO, SQL_EM_REPASSE, minutosConvite };
