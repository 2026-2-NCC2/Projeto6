// Administração ligada ao banco e cancelamento de evento — etapa 6 da integração com a TrocaTicket 2.0.
//
// Adaptado de documentos/Site/TrocaTicket 2.0/server/src (app.js: /admin/usuarios e aprovação;
// transacoes/carteira-portaria.js: cancelEvent) para o banco da main (MIGRACAO_ADMINISTRACAO.sql).
//
// - Conta de administração (tipo 4, criada por scripts/criar-admin.js) lista contas e decide a
//   situação: A aprovada, P aguardando, R recusada (recusa exige motivo). Cada decisão fica no
//   histórico (aprovacao_conta). Ninguém muda a própria conta nem contas de administração por aqui.
// - Painel e relatório com números do banco: ingressos ativos, utilizados e cancelados, receita da
//   venda original, estornos, revendas, transferências, trocas e atendimentos abertos.
// - Cancelamento de evento (organizador dono ou administração), com motivo:
//   reservas em aberto são canceladas; anúncios, fila, convites e trocas pendentes são encerrados;
//   cada ingresso ativo é cancelado e quem pagou por ele por último recebe o estorno (simulado):
//   o comprador da revenda, se houve revenda; senão, quem comprou na venda original. Ingressos já
//   utilizados na portaria não são estornados.

const DATA_ISO = "'%Y-%m-%dT%H:%i:%sZ'";
const SITUACOES = ['A', 'P', 'R'];
const PERFIS = { 1: 'comprador', 2: 'organizador', 3: 'fornecedor', 4: 'admin' };
const ADMIN = 4;
const ORGANIZADOR = 2;

function criarAdministracao({
  db,
  falhar,
  inteiroPositivo,
  travarEvento,
  executarIdempotente,
  rotaComPerfis,
  atualizarSituacaoEstorno,
}) {
  const centavos = (valor) => Math.round(Number(valor || 0) * 100);
  const reaisDeCentavos = (valor) => Number((valor / 100).toFixed(2));

  // ---------- contas ----------

  const SELECT_CONTA = `
    SELECT u.id, u.nome, u.email, u.tipo_perfil, u.status_aprovacao,
           DATE_FORMAT(u.data_cadastro, ${DATA_ISO}) AS cadastro,
           COALESCE(o.nome_organizacao, f.nome_fantasia) AS organizacao,
           COALESCE(o.cnpj, o.cpf, f.cnpj, f.cpf) AS documento,
           ac.situacao AS decisao, ac.motivo AS motivo, DATE_FORMAT(ac.criado_em, ${DATA_ISO}) AS decidido,
           adm.nome AS decidido_por
      FROM usuario u
      LEFT JOIN organizador_detalhes o ON o.usuario_id = u.id
      LEFT JOIN fornecedor_detalhes f ON f.usuario_id = u.id
      LEFT JOIN aprovacao_conta ac ON ac.id = (SELECT MAX(id) FROM aprovacao_conta WHERE usuario_id = u.id)
      LEFT JOIN usuario adm ON adm.id = ac.admin_id`;

  function contaParaResposta(c) {
    return {
      id: Number(c.id),
      name: c.nome,
      email: c.email,
      profile: PERFIS[c.tipo_perfil] || 'comprador',
      approval: c.status_aprovacao,
      createdAt: c.cadastro,
      organization: c.organizacao || null,
      document: c.documento || null,
      lastDecision: c.decidido
        ? { approval: c.decisao, reason: c.motivo || null, at: c.decidido, by: c.decidido_por || null }
        : null,
    };
  }

  // ---------- eventos ----------

  const METRICAS_EVENTO = `
    SELECT e.id, e.titulo, e.status, e.capacidade, e.preco_base, e.\`local\` AS local_evento,
           e.imagem_capa_url, DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS inicio,
           DATE_FORMAT(e.data_fim, '%Y-%m-%d') AS fim, e.motivo_cancelamento,
           DATE_FORMAT(e.cancelado_em, ${DATA_ISO}) AS cancelado,
           org.nome AS organizador_nome, COALESCE(od.nome_organizacao, org.nome) AS organizacao,
           (SELECT COUNT(*) FROM ingresso i WHERE i.evento_id = e.id AND i.status = 'A') AS ativos,
           (SELECT COUNT(*) FROM ingresso i WHERE i.evento_id = e.id AND i.status = 'V') AS utilizados,
           (SELECT COUNT(*) FROM ingresso i WHERE i.evento_id = e.id AND i.status = 'C') AS cancelados,
           (SELECT COALESCE(SUM(p.valor_total), 0) FROM pedido p
             WHERE p.evento_id = e.id AND p.anuncio_id IS NULL
               AND p.status IN ('pago', 'estornado', 'estornado_parcial')) AS receita_bruta,
           (SELECT COALESCE(SUM(s.valor), 0) FROM estorno s JOIN pedido p ON p.id = s.pedido_id
             WHERE p.evento_id = e.id AND p.anuncio_id IS NULL) AS estornos_venda,
           (SELECT COALESCE(SUM(s.valor), 0) FROM estorno s JOIN pedido p ON p.id = s.pedido_id
             WHERE p.evento_id = e.id AND p.anuncio_id IS NOT NULL) AS estornos_revenda,
           (SELECT COUNT(*) FROM anuncio_ingresso a JOIN ingresso i ON i.id = a.ingresso_id
             WHERE i.evento_id = e.id AND a.status = 'sold') AS revendas,
           (SELECT COALESCE(SUM(p.valor_total), 0) FROM pedido p
             WHERE p.evento_id = e.id AND p.anuncio_id IS NOT NULL AND p.status IN ('pago', 'estornado')) AS volume_revenda,
           (SELECT COUNT(*) FROM convite_ingresso c JOIN ingresso i ON i.id = c.ingresso_id
             WHERE i.evento_id = e.id AND c.status = 'accepted') AS transferencias,
           (SELECT COUNT(*) FROM troca_ingresso t JOIN ingresso i ON i.id = t.ingresso_solicitado_id
             WHERE i.evento_id = e.id AND t.status = 'Aceita') AS trocas,
           (SELECT COUNT(*) FROM atendimento a WHERE a.evento_id = e.id AND a.status <> 'encerrado') AS atendimentos_abertos
      FROM evento e
      JOIN usuario org ON org.id = e.organizador_id
      LEFT JOIN organizador_detalhes od ON od.usuario_id = e.organizador_id`;

  function eventoParaResposta(e) {
    const vendidos = Number(e.ativos) + Number(e.utilizados);
    const capacidade = e.capacidade === null ? null : Number(e.capacidade);
    return {
      id: Number(e.id),
      title: e.titulo,
      status: e.status,
      startDate: e.inicio,
      endDate: e.fim,
      location: e.local_evento,
      image: e.imagem_capa_url || '/images/asset-5.jpg',
      basePrice: Number(e.preco_base),
      capacity: capacidade,
      organizer: e.organizacao,
      organizerName: e.organizador_nome,
      cancelledAt: e.cancelado,
      cancelReason: e.motivo_cancelamento,
      tickets: {
        active: Number(e.ativos),
        used: Number(e.utilizados),
        cancelled: Number(e.cancelados),
        sold: vendidos,
      },
      occupancy: capacidade ? Math.round((vendidos / capacidade) * 1000) / 10 : null,
      grossRevenue: Number(e.receita_bruta),
      refunds: { sales: Number(e.estornos_venda), resales: Number(e.estornos_revenda) },
      resales: { count: Number(e.revendas), volume: Number(e.volume_revenda) },
      transfers: Number(e.transferencias),
      exchanges: Number(e.trocas),
      openSupport: Number(e.atendimentos_abertos),
    };
  }

  // ---------- cancelamento de evento ----------

  async function cancelarEvento(conexao, eventoId, usuario, motivo) {
    const [[dono]] = await conexao.execute('SELECT organizador_id FROM evento WHERE id = ?', [eventoId]);
    if (!dono || (usuario.tipo_perfil === ORGANIZADOR && dono.organizador_id !== usuario.id)) {
      falhar(404, 'Evento não encontrado entre os seus.');
    }
    const evento = await travarEvento(conexao, eventoId, { vendas: false });
    if (evento.status === 'Cancelado') falhar(409, 'Este evento já foi cancelado.');
    const motivoEstorno = `Cancelamento do evento: ${motivo}`.slice(0, 255);

    await conexao.execute(
      `UPDATE evento SET status = 'Cancelado', cancelado_em = UTC_TIMESTAMP(), motivo_cancelamento = ?,
              cancelado_por = ? WHERE id = ?`,
      [motivo, usuario.id, eventoId],
    );
    const [reservas] = await conexao.execute(
      "UPDATE pedido SET status = 'cancelado', motivo = ?, atualizado_em = UTC_TIMESTAMP() WHERE evento_id = ? AND status = 'reservado'",
      ['Reserva cancelada: o evento foi cancelado', eventoId],
    );
    await conexao.execute(
      `UPDATE anuncio_ingresso a JOIN ingresso i ON i.id = a.ingresso_id SET a.status = 'cancelled'
        WHERE i.evento_id = ? AND a.status IN ('active', 'reserved')`,
      [eventoId],
    );
    await conexao.execute(
      "UPDATE fila_repasse SET status = 'left' WHERE evento_id = ? AND status IN ('queued', 'reserved')",
      [eventoId],
    );
    await conexao.execute(
      `UPDATE convite_ingresso c JOIN ingresso i ON i.id = c.ingresso_id SET c.status = 'cancelled'
        WHERE i.evento_id = ? AND c.status = 'pending'`,
      [eventoId],
    );
    await conexao.execute(
      `UPDATE troca_ingresso t SET t.status = 'Cancelada', t.data_resposta = CURRENT_TIMESTAMP
        WHERE t.status = 'Pendente'
          AND (t.ingresso_solicitado_id IN (SELECT id FROM ingresso WHERE evento_id = ?)
               OR t.ingresso_ofertado_id IN (SELECT id FROM ingresso WHERE evento_id = ?))`,
      [eventoId, eventoId],
    );

    const [ativos] = await conexao.execute(
      "SELECT id, pedido_id FROM ingresso WHERE evento_id = ? AND status = 'A' ORDER BY id FOR UPDATE",
      [eventoId],
    );
    const pedidosVenda = new Set();
    const pedidosRevenda = new Set();
    let estornos = 0;
    let totalCentavos = 0;
    for (const ingresso of ativos) {
      // Quem pagou por último: o comprador da revenda mais recente ou, sem revenda, o da venda original.
      const [[revenda]] = await conexao.execute(
        `SELECT p.id, p.valor_unitario FROM pedido p JOIN anuncio_ingresso a ON a.id = p.anuncio_id
          WHERE a.ingresso_id = ? AND a.status = 'sold' AND p.status = 'pago'
          ORDER BY p.id DESC LIMIT 1`,
        [ingresso.id],
      );
      let pago = null;
      if (revenda) {
        pago = revenda;
        pedidosRevenda.add(revenda.id);
      } else if (ingresso.pedido_id) {
        const [[original]] = await conexao.execute(
          'SELECT id, status, valor_unitario FROM pedido WHERE id = ? FOR UPDATE',
          [ingresso.pedido_id],
        );
        if (original && ['pago', 'estornado_parcial'].includes(original.status)) {
          pago = original;
          pedidosVenda.add(original.id);
        }
      }
      if (pago && centavos(pago.valor_unitario) > 0) {
        await conexao.execute(
          `INSERT INTO estorno (pedido_id, ingresso_id, valor, motivo, criado_em)
           VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
          [pago.id, ingresso.id, pago.valor_unitario, motivoEstorno],
        );
        estornos += 1;
        totalCentavos += centavos(pago.valor_unitario);
      }
      await conexao.execute("UPDATE ingresso SET status = 'C', disponivel_troca = FALSE WHERE id = ?", [ingresso.id]);
    }
    for (const pedidoId of pedidosVenda) await atualizarSituacaoEstorno(conexao, pedidoId);
    for (const pedidoId of pedidosRevenda) {
      await conexao.execute(
        "UPDATE pedido SET status = 'estornado', motivo = ?, atualizado_em = UTC_TIMESTAMP() WHERE id = ?",
        [motivoEstorno, pedidoId],
      );
    }
    return {
      eventId: eventoId,
      status: 'Cancelado',
      reason: motivo,
      ticketsCancelled: ativos.length,
      refunds: estornos,
      refundedAmount: reaisDeCentavos(totalCentavos),
      reservationsCancelled: reservas.affectedRows,
    };
  }

  // ---------- rotas ----------

  function registrarRotas(app) {
    // A própria conta consulta a situação e a última decisão (motivo da recusa, por exemplo).
    app.get('/api/conta/aprovacao', rotaComPerfis([1, 2, 3, ADMIN], async (req, res) => {
      const [[linha]] = await db.execute(`${SELECT_CONTA} WHERE u.id = ?`, [req.user.id]);
      if (!linha) falhar(404, 'Conta não encontrada.');
      const { approval, profile, lastDecision } = contaParaResposta(linha);
      // A conta vê a decisão e o motivo, mas não o nome de quem decidiu.
      res.json({
        approval,
        profile,
        lastDecision: lastDecision && { approval: lastDecision.approval, reason: lastDecision.reason, at: lastDecision.at },
      });
    }));

    app.get('/api/admin/resumo', rotaComPerfis([ADMIN], async (req, res) => {
      const [[resumo]] = await db.execute(
        `SELECT
           (SELECT COUNT(*) FROM usuario WHERE status_aprovacao = 'P') AS pendentes,
           (SELECT COUNT(*) FROM usuario WHERE status_aprovacao = 'R') AS recusadas,
           (SELECT COUNT(*) FROM evento WHERE status = 'Publicado' AND data_fim >= CURRENT_DATE) AS publicados,
           (SELECT COUNT(*) FROM evento WHERE status = 'Cancelado') AS cancelados,
           (SELECT COUNT(*) FROM ingresso WHERE status = 'A') AS ingressos_ativos,
           (SELECT COUNT(*) FROM atendimento WHERE status <> 'encerrado') AS atendimentos_abertos`,
      );
      res.json({
        pendingAccounts: Number(resumo.pendentes),
        rejectedAccounts: Number(resumo.recusadas),
        publishedEvents: Number(resumo.publicados),
        cancelledEvents: Number(resumo.cancelados),
        activeTickets: Number(resumo.ingressos_ativos),
        openSupport: Number(resumo.atendimentos_abertos),
      });
    }));

    app.get('/api/admin/contas', rotaComPerfis([ADMIN], async (req, res) => {
      const situacao = String(req.query.situacao || '');
      const perfil = Number(req.query.perfil || 0);
      const busca = String(req.query.busca || '').trim().slice(0, 100);
      if (situacao && !SITUACOES.includes(situacao)) falhar(400, 'Situação inválida.');
      if (perfil && !PERFIS[perfil]) falhar(400, 'Perfil inválido.');
      const filtros = [];
      const valores = [];
      if (situacao) {
        filtros.push('u.status_aprovacao = ?');
        valores.push(situacao);
      }
      if (perfil) {
        filtros.push('u.tipo_perfil = ?');
        valores.push(perfil);
      }
      if (busca) {
        filtros.push('(u.nome LIKE ? OR u.email LIKE ? OR COALESCE(o.nome_organizacao, f.nome_fantasia, \'\') LIKE ?)');
        const termo = `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        valores.push(termo, termo, termo);
      }
      const [linhas] = await db.execute(
        `${SELECT_CONTA}${filtros.length ? ` WHERE ${filtros.join(' AND ')}` : ''}
          ORDER BY (u.status_aprovacao = 'P') DESC, u.data_cadastro DESC, u.id DESC LIMIT 200`,
        valores,
      );
      res.json(linhas.map(contaParaResposta));
    }));

    app.post('/api/admin/contas/:id/aprovacao', rotaComPerfis([ADMIN], async (req, res) => {
      const contaId = inteiroPositivo(req.params.id);
      if (!contaId) falhar(400, 'Informe uma conta válida.');
      const { situacao } = req.body || {};
      const motivo = String(req.body?.motivo ?? '').trim();
      if (!SITUACOES.includes(situacao)) falhar(400, 'Escolha aprovar, recusar ou voltar para análise.');
      if (motivo.length > 500) falhar(400, 'O motivo deve ter até 500 caracteres.');
      if (situacao === 'R' && motivo.length < 3) falhar(400, 'Informe o motivo da recusa (ele aparece no histórico).');
      const resultado = await executarIdempotente(
        req,
        `aprovacao:${contaId}`,
        { situacao, motivo },
        async (conexao) => {
          const [[conta]] = await conexao.execute(
            'SELECT id, tipo_perfil, status_aprovacao FROM usuario WHERE id = ? FOR UPDATE',
            [contaId],
          );
          if (!conta) falhar(404, 'Conta não encontrada.');
          if (conta.id === req.user.id) falhar(409, 'Você não pode mudar a situação da sua própria conta.');
          if (conta.tipo_perfil === ADMIN) {
            falhar(409, 'Contas de administração são gerenciadas pelo script do servidor, não por aqui.');
          }
          if (conta.status_aprovacao !== situacao || motivo) {
            await conexao.execute('UPDATE usuario SET status_aprovacao = ? WHERE id = ?', [situacao, contaId]);
            await conexao.execute(
              `INSERT INTO aprovacao_conta (usuario_id, admin_id, situacao, motivo, criado_em)
               VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
              [contaId, req.user.id, situacao, motivo || null],
            );
          }
          const [[linha]] = await conexao.execute(`${SELECT_CONTA} WHERE u.id = ?`, [contaId]);
          return { status: 200, corpo: contaParaResposta(linha) };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.get('/api/admin/eventos', rotaComPerfis([ADMIN], async (req, res) => {
      const [linhas] = await db.execute(
        `${METRICAS_EVENTO}
          ORDER BY (e.status = 'Publicado' AND e.data_fim >= CURRENT_DATE) DESC, e.data_inicio, e.id LIMIT 500`,
      );
      res.json(linhas.map(eventoParaResposta));
    }));

    app.get('/api/admin/eventos/:id', rotaComPerfis([ADMIN], async (req, res) => {
      const eventoId = inteiroPositivo(req.params.id);
      if (!eventoId) falhar(400, 'Informe um evento válido.');
      const [[linha]] = await db.execute(`${METRICAS_EVENTO} WHERE e.id = ?`, [eventoId]);
      if (!linha) falhar(404, 'Evento não encontrado.');
      const [tipos] = await db.execute(
        `SELECT tipo_ingresso, COUNT(*) AS total, SUM(status = 'A') AS ativos, SUM(status = 'V') AS utilizados,
                SUM(status = 'C') AS cancelados
           FROM ingresso WHERE evento_id = ? GROUP BY tipo_ingresso ORDER BY tipo_ingresso`,
        [eventoId],
      );
      const [pedidos] = await db.execute(
        `SELECT p.id, p.tipo_ingresso, p.quantidade, p.valor_total, p.status, p.anuncio_id,
                DATE_FORMAT(p.criado_em, ${DATA_ISO}) AS criado, u.nome
           FROM pedido p JOIN usuario u ON u.id = p.usuario_id
          WHERE p.evento_id = ? ORDER BY p.id DESC LIMIT 50`,
        [eventoId],
      );
      res.json({
        ...eventoParaResposta(linha),
        byType: tipos.map((t) => ({
          type: t.tipo_ingresso,
          total: Number(t.total),
          active: Number(t.ativos),
          used: Number(t.utilizados),
          cancelled: Number(t.cancelados),
        })),
        orders: pedidos.map((p) => ({
          id: Number(p.id),
          type: p.tipo_ingresso,
          quantity: Number(p.quantidade),
          total: Number(p.valor_total),
          status: p.status,
          resale: Boolean(p.anuncio_id),
          createdAt: p.criado,
          buyer: p.nome,
        })),
      });
    }));

    // Cancelamento: organizador dono do evento ou administração.
    app.post('/api/eventos/:id/cancelar', rotaComPerfis([ORGANIZADOR, ADMIN], async (req, res) => {
      const eventoId = inteiroPositivo(req.params.id);
      if (!eventoId) falhar(400, 'Informe um evento válido.');
      const motivo = String(req.body?.motivo ?? '').trim();
      if (motivo.length < 5 || motivo.length > 500) {
        falhar(400, 'Informe o motivo do cancelamento (de 5 a 500 caracteres). Ele aparece para quem comprou.');
      }
      const resultado = await executarIdempotente(req, `cancelar-evento:${eventoId}`, { motivo }, async (conexao) => ({
        status: 200,
        corpo: await cancelarEvento(conexao, eventoId, req.user, motivo),
      }));
      res.status(resultado.status).json(resultado.corpo);
    }));
  }

  return { registrarRotas };
}

module.exports = { criarAdministracao };
