// Portaria e atendimento — etapa 5 da integração com a TrocaTicket 2.0.
//
// Adaptado de documentos/Site/TrocaTicket 2.0/server/src/transacoes (carteira-portaria.js:
// leitura única; atendimento-configuracao.js: solicitações com histórico) para o banco da main
// (MIGRACAO_PORTARIA_ATENDIMENTO.sql) e para a transação idempotente dos pedidos (pedidos.js).
//
// Portaria (organizador do evento):
// - Valida o código do ingresso mostrado em Meus ingressos. Cada ingresso entra uma vez só: a
//   entrada fica registrada (entrada_portaria) e o ingresso passa a "Utilizado".
// - O código muda a cada revenda, transferência ou troca, então o código antigo não entra.
// - Anúncio ativo do ingresso é encerrado e ofertas de troca pendentes são canceladas na entrada.
//   Ingresso reservado para revenda ou com convite pendente não entra até a operação terminar.
// - O evento precisa estar publicado e não pode ter terminado.
// Atendimento:
// - A conta de usuário abre uma solicitação ligada a um pedido seu ou a um anúncio que pode ver
//   (inclusive para denunciar), com assunto e mensagem.
// - Quem responde e muda a situação (aberto, em análise, encerrado) é o organizador do evento ou
//   a administração (etapa 6), que vê os atendimentos de todos os eventos.
// - Quem pediu acompanha o histórico e pode responder enquanto não estiver encerrado.

const DATA_ISO = "'%Y-%m-%dT%H:%i:%sZ'";
const CODIGO = /^[A-Z0-9][A-Z0-9-]{3,99}$/;
const SITUACOES = ['aberto', 'em_analise', 'encerrado'];
const MAX_ABERTOS = 10;

function criarPortaria({ db, falhar, inteiroPositivo, travarEvento, executarIdempotente, rotaComPerfis }) {
  const ORGANIZADOR = 2;
  const USUARIO = 1;
  const ADMIN = 4;
  // Quem responde pela organização: o organizador dono do evento ou a administração (etapa 6).
  const respondePeloEvento = (organizadorId, usuario) =>
    usuario.tipo_perfil === ADMIN || (usuario.tipo_perfil === ORGANIZADOR && organizadorId === usuario.id);

  const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || 'Titular';
  const horarioBrasilia = (iso) =>
    new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  function textoLimpo(valor, nome, minimo, maximo) {
    const texto = String(valor ?? '').trim();
    if (texto.length < minimo || texto.length > maximo) {
      falhar(400, `${nome} deve ter de ${minimo} a ${maximo} caracteres.`);
    }
    return texto;
  }

  // ---------- portaria ----------

  async function eventoDoOrganizador(conexao, eventoId, organizadorId) {
    const [[evento]] = await conexao.execute(
      'SELECT id, organizador_id, titulo FROM evento WHERE id = ?',
      [eventoId],
    );
    if (!evento || evento.organizador_id !== organizadorId) {
      falhar(404, 'Evento não encontrado entre os seus.');
    }
    return evento;
  }

  async function resumoDaPortaria(conexao, eventoId) {
    const [[contagem]] = await conexao.execute(
      `SELECT
         (SELECT COUNT(*) FROM ingresso WHERE evento_id = ? AND status = 'A') AS ativos,
         (SELECT COUNT(*) FROM entrada_portaria WHERE evento_id = ?) AS entradas`,
      [eventoId, eventoId],
    );
    const [ultimas] = await conexao.execute(
      `SELECT ep.ingresso_id, i.tipo_ingresso, u.nome, DATE_FORMAT(ep.entrou_em, ${DATA_ISO}) AS entrou
         FROM entrada_portaria ep
         JOIN ingresso i ON i.id = ep.ingresso_id
         JOIN usuario u ON u.id = i.dono_atual_id
        WHERE ep.evento_id = ?
        ORDER BY ep.entrou_em DESC, ep.ingresso_id DESC LIMIT 20`,
      [eventoId],
    );
    return {
      waiting: Number(contagem.ativos),
      entered: Number(contagem.entradas),
      lastEntries: ultimas.map((linha) => ({
        ticketId: Number(linha.ingresso_id),
        type: linha.tipo_ingresso,
        holderName: primeiroNome(linha.nome),
        enteredAt: linha.entrou,
      })),
    };
  }

  // ---------- atendimento ----------

  const SELECT_ATENDIMENTO = `
    SELECT a.id, a.usuario_id, a.evento_id, a.pedido_id, a.anuncio_id, a.assunto, a.status,
           DATE_FORMAT(a.criado_em, ${DATA_ISO}) AS criado, DATE_FORMAT(a.atualizado_em, ${DATA_ISO}) AS atualizado,
           e.titulo, e.organizador_id, u.nome AS solicitante
      FROM atendimento a
      JOIN evento e ON e.id = a.evento_id
      JOIN usuario u ON u.id = a.usuario_id`;

  async function atendimentosParaResposta(conexao, linhas, usuario) {
    if (!linhas.length) return [];
    const ids = linhas.map((linha) => linha.id);
    const [mensagens] = await conexao.query(
      `SELECT m.id, m.atendimento_id, m.usuario_id, m.mensagem, DATE_FORMAT(m.criado_em, ${DATA_ISO}) AS criada,
              u.nome, u.tipo_perfil
         FROM atendimento_mensagem m JOIN usuario u ON u.id = m.usuario_id
        WHERE m.atendimento_id IN (?) ORDER BY m.id`,
      [ids],
    );
    return linhas.map((a) => ({
      id: Number(a.id),
      eventId: Number(a.evento_id),
      eventTitle: a.titulo,
      orderId: a.pedido_id ? Number(a.pedido_id) : null,
      listingId: a.anuncio_id ? Number(a.anuncio_id) : null,
      subject: a.assunto,
      status: a.status,
      createdAt: a.criado,
      updatedAt: a.atualizado,
      requesterName: a.solicitante,
      mine: a.usuario_id === usuario.id,
      canReply: a.usuario_id === usuario.id ? a.status !== 'encerrado' : respondePeloEvento(a.organizador_id, usuario),
      canChangeStatus: respondePeloEvento(a.organizador_id, usuario),
      messages: mensagens
        .filter((m) => m.atendimento_id === a.id)
        .map((m) => ({
          id: Number(m.id),
          author:
            m.usuario_id === a.usuario_id ? 'solicitante' : m.tipo_perfil === ADMIN ? 'administracao' : 'organizacao',
          authorName: m.usuario_id === a.usuario_id ? a.solicitante : primeiroNome(m.nome),
          message: m.mensagem,
          createdAt: m.criada,
        })),
    }));
  }

  async function lerAtendimento(conexao, atendimentoId, usuario) {
    const [linhas] = await conexao.execute(`${SELECT_ATENDIMENTO} WHERE a.id = ?`, [atendimentoId]);
    return (await atendimentosParaResposta(conexao, linhas, usuario))[0];
  }

  // Pedido da própria conta ou anúncio que a conta pode ver: vendido por ela, reservado/comprado
  // por ela ou ainda à venda (denúncia). Devolve o evento ligado.
  async function eventoDaReferencia(conexao, { pedidoId, anuncioId }, usuarioId) {
    if (pedidoId) {
      const [[pedido]] = await conexao.execute('SELECT usuario_id, evento_id FROM pedido WHERE id = ?', [pedidoId]);
      if (!pedido || pedido.usuario_id !== usuarioId) falhar(404, 'Pedido não encontrado nesta conta.');
      return pedido.evento_id;
    }
    const [[anuncio]] = await conexao.execute(
      `SELECT a.vendedor_id, a.status, i.evento_id,
              EXISTS (SELECT 1 FROM pedido p WHERE p.anuncio_id = a.id AND p.usuario_id = ?) AS comprador
         FROM anuncio_ingresso a JOIN ingresso i ON i.id = a.ingresso_id
        WHERE a.id = ?`,
      [usuarioId, anuncioId],
    );
    const visivel =
      anuncio &&
      (anuncio.vendedor_id === usuarioId || Number(anuncio.comprador) || ['active', 'reserved'].includes(anuncio.status));
    if (!visivel) falhar(404, 'Anúncio não encontrado.');
    return anuncio.evento_id;
  }

  // ---------- rotas ----------

  function registrarRotas(app) {
    // Eventos do organizador com o resumo da portaria (para escolher onde validar).
    app.get('/api/portaria/eventos', rotaComPerfis([ORGANIZADOR], async (req, res) => {
      const [eventos] = await db.execute(
        `SELECT e.id, e.titulo, e.status, DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS data_inicio,
                DATE_FORMAT(e.data_fim, '%Y-%m-%d') AS data_fim, (e.data_fim >= CURRENT_DATE) AS vigente,
                (SELECT COUNT(*) FROM ingresso i WHERE i.evento_id = e.id AND i.status = 'A') AS ativos,
                (SELECT COUNT(*) FROM entrada_portaria ep WHERE ep.evento_id = e.id) AS entradas
           FROM evento e
          WHERE e.organizador_id = ?
          ORDER BY (e.status = 'Publicado' AND e.data_fim >= CURRENT_DATE) DESC, e.data_inicio, e.id`,
        [req.user.id],
      );
      res.json(
        eventos.map((e) => ({
          id: Number(e.id),
          title: e.titulo,
          status: e.status,
          startDate: e.data_inicio,
          endDate: e.data_fim,
          open: e.status === 'Publicado' && Boolean(Number(e.vigente)),
          waiting: Number(e.ativos),
          entered: Number(e.entradas),
        })),
      );
    }));

    app.get('/api/portaria/eventos/:id', rotaComPerfis([ORGANIZADOR], async (req, res) => {
      const eventoId = inteiroPositivo(req.params.id);
      if (!eventoId) falhar(400, 'Informe um evento válido.');
      const evento = await eventoDoOrganizador(db, eventoId, req.user.id);
      res.json({ eventId: eventoId, eventTitle: evento.titulo, ...(await resumoDaPortaria(db, eventoId)) });
    }));

    app.post('/api/portaria/entradas', rotaComPerfis([ORGANIZADOR], async (req, res) => {
      const { eventId, code } = req.body || {};
      const eventoId = inteiroPositivo(eventId);
      const codigo = String(code ?? '').trim().toUpperCase();
      if (!eventoId || !CODIGO.test(codigo)) falhar(400, 'Escolha o evento e digite o código do ingresso.');
      const resultado = await executarIdempotente(req, 'portaria', { eventId: eventoId, code: codigo }, async (conexao) => {
        const dados = await eventoDoOrganizador(conexao, eventoId, req.user.id);
        const evento = await travarEvento(conexao, eventoId, { vendas: false });
        if (evento.status !== 'Publicado') falhar(409, 'Este evento não está publicado; a portaria está fechada.');
        if (!Number(evento.vigente)) falhar(409, 'Este evento já terminou; a portaria está fechada.');
        const [[ingresso]] = await conexao.execute(
          `SELECT i.id, i.evento_id, i.status, i.tipo_ingresso, u.nome
             FROM ingresso i JOIN usuario u ON u.id = i.dono_atual_id
            WHERE i.codigo_ingresso = ? FOR UPDATE`,
          [codigo],
        );
        if (!ingresso) {
          falhar(404, 'Código não encontrado. Confira o código em Meus ingressos: ele muda a cada repasse ou troca.');
        }
        if (ingresso.evento_id !== eventoId) falhar(409, 'Este ingresso é de outro evento.');
        if (ingresso.status === 'V') {
          const [[entrada]] = await conexao.execute(
            `SELECT DATE_FORMAT(entrou_em, ${DATA_ISO}) AS entrou FROM entrada_portaria WHERE ingresso_id = ?`,
            [ingresso.id],
          );
          falhar(
            409,
            `Este ingresso já foi utilizado${entrada ? ` (entrada em ${horarioBrasilia(entrada.entrou)}, horário de Brasília)` : ''}.`,
          );
        }
        if (ingresso.status !== 'A') falhar(409, 'Este ingresso foi cancelado.');
        const [[pendencias]] = await conexao.execute(
          `SELECT
             (SELECT id FROM anuncio_ingresso WHERE ingresso_id = ? AND status = 'reserved' LIMIT 1) AS reservado,
             (SELECT id FROM convite_ingresso WHERE ingresso_id = ? AND status = 'pending'
                 AND expira_em > UTC_TIMESTAMP() LIMIT 1) AS convite`,
          [ingresso.id, ingresso.id],
        );
        if (pendencias.reservado) {
          falhar(409, 'Este ingresso está reservado para revenda. A entrada fica bloqueada até o fim do pagamento ou do prazo.');
        }
        if (pendencias.convite) {
          falhar(409, 'Este ingresso tem uma transferência pendente. Quem enviou precisa cancelar o convite antes de entrar.');
        }
        await conexao.execute(
          "UPDATE anuncio_ingresso SET status = 'cancelled' WHERE ingresso_id = ? AND status = 'active'",
          [ingresso.id],
        );
        await conexao.execute(
          `UPDATE troca_ingresso SET status = 'Cancelada', data_resposta = CURRENT_TIMESTAMP
            WHERE status = 'Pendente' AND (ingresso_solicitado_id = ? OR ingresso_ofertado_id = ?)`,
          [ingresso.id, ingresso.id],
        );
        await conexao.execute("UPDATE ingresso SET status = 'V', disponivel_troca = FALSE WHERE id = ?", [ingresso.id]);
        await conexao.execute(
          `INSERT INTO entrada_portaria (ingresso_id, evento_id, operador_id, entrou_em)
           VALUES (?, ?, ?, UTC_TIMESTAMP())`,
          [ingresso.id, eventoId, req.user.id],
        );
        const [[entrada]] = await conexao.execute(
          `SELECT DATE_FORMAT(entrou_em, ${DATA_ISO}) AS entrou FROM entrada_portaria WHERE ingresso_id = ?`,
          [ingresso.id],
        );
        return {
          status: 201,
          corpo: {
            accepted: true,
            ticketId: Number(ingresso.id),
            eventId: eventoId,
            eventTitle: dados.titulo,
            type: ingresso.tipo_ingresso,
            holderName: primeiroNome(ingresso.nome),
            enteredAt: entrada.entrou,
            academic: true,
          },
        };
      });
      res.status(resultado.status).json(resultado.corpo);
    }));

    // A conta de usuário vê os próprios; o organizador, os dos seus eventos; a administração, todos.
    app.get('/api/atendimentos', rotaComPerfis([USUARIO, ORGANIZADOR, ADMIN], async (req, res) => {
      const filtro =
        req.user.tipo_perfil === ADMIN
          ? '1 = 1'
          : req.user.tipo_perfil === ORGANIZADOR
            ? 'e.organizador_id = ?'
            : 'a.usuario_id = ?';
      const [linhas] = await db.execute(
        `${SELECT_ATENDIMENTO} WHERE ${filtro}
          ORDER BY (a.status = 'encerrado'), a.atualizado_em DESC, a.id DESC LIMIT 100`,
        req.user.tipo_perfil === ADMIN ? [] : [req.user.id],
      );
      res.json(await atendimentosParaResposta(db, linhas, req.user));
    }));

    app.post('/api/atendimentos', rotaComPerfis([USUARIO], async (req, res) => {
      const { orderId, listingId, subject, message } = req.body || {};
      const informado = (valor) => valor !== undefined && valor !== null && valor !== '';
      if (informado(orderId) === informado(listingId)) {
        falhar(400, 'Ligue a solicitação a um pedido ou a um anúncio.');
      }
      const pedidoId = informado(orderId) ? inteiroPositivo(orderId) : null;
      const anuncioId = informado(listingId) ? inteiroPositivo(listingId) : null;
      if (!pedidoId && !anuncioId) falhar(400, 'Informe um número de pedido ou de anúncio válido.');
      const assunto = textoLimpo(subject, 'O assunto', 3, 150);
      const mensagem = textoLimpo(message, 'A mensagem', 3, 2000);
      const resultado = await executarIdempotente(
        req,
        'atendimento',
        { orderId: pedidoId, listingId: anuncioId, subject: assunto, message: mensagem },
        async (conexao) => {
          const eventoId = await eventoDaReferencia(conexao, { pedidoId, anuncioId }, req.user.id);
          const [[{ abertos }]] = await conexao.execute(
            "SELECT COUNT(*) AS abertos FROM atendimento WHERE usuario_id = ? AND status <> 'encerrado'",
            [req.user.id],
          );
          if (Number(abertos) >= MAX_ABERTOS) {
            falhar(429, `Você já tem ${MAX_ABERTOS} atendimentos em aberto. Aguarde uma resposta antes de abrir outro.`);
          }
          const [inserido] = await conexao.execute(
            `INSERT INTO atendimento (usuario_id, evento_id, pedido_id, anuncio_id, assunto, status, criado_em, atualizado_em)
             VALUES (?, ?, ?, ?, ?, 'aberto', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
            [req.user.id, eventoId, pedidoId, anuncioId, assunto],
          );
          await conexao.execute(
            `INSERT INTO atendimento_mensagem (atendimento_id, usuario_id, mensagem, criado_em)
             VALUES (?, ?, ?, UTC_TIMESTAMP())`,
            [inserido.insertId, req.user.id, mensagem],
          );
          return { status: 201, corpo: await lerAtendimento(conexao, inserido.insertId, req.user) };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));

    app.post('/api/atendimentos/:id/mensagens', rotaComPerfis([USUARIO, ORGANIZADOR, ADMIN], async (req, res) => {
      const atendimentoId = inteiroPositivo(req.params.id);
      if (!atendimentoId) falhar(400, 'Informe um atendimento válido.');
      const { message, status } = req.body || {};
      const mensagem = textoLimpo(message, 'A mensagem', 2, 2000);
      if (status !== undefined && !SITUACOES.includes(status)) falhar(400, 'Situação de atendimento inválida.');
      const resultado = await executarIdempotente(
        req,
        `atendimento-msg:${atendimentoId}`,
        { message: mensagem, status: status ?? null },
        async (conexao) => {
          const [[atendimento]] = await conexao.execute(
            `SELECT a.id, a.usuario_id, a.status, e.organizador_id
               FROM atendimento a JOIN evento e ON e.id = a.evento_id
              WHERE a.id = ? FOR UPDATE`,
            [atendimentoId],
          );
          const solicitante = atendimento?.usuario_id === req.user.id;
          const organizacao = Boolean(atendimento) && respondePeloEvento(atendimento.organizador_id, req.user);
          if (!solicitante && !organizacao) falhar(404, 'Atendimento não encontrado.');
          if (status !== undefined && !organizacao) falhar(403, 'Só a organização do evento muda a situação do atendimento.');
          if (!organizacao && atendimento.status === 'encerrado') {
            falhar(409, 'Este atendimento foi encerrado. Abra um novo se precisar.');
          }
          await conexao.execute(
            `INSERT INTO atendimento_mensagem (atendimento_id, usuario_id, mensagem, criado_em)
             VALUES (?, ?, ?, UTC_TIMESTAMP())`,
            [atendimentoId, req.user.id, mensagem],
          );
          await conexao.execute('UPDATE atendimento SET status = ?, atualizado_em = UTC_TIMESTAMP() WHERE id = ?', [
            status ?? atendimento.status,
            atendimentoId,
          ]);
          return { status: 200, corpo: await lerAtendimento(conexao, atendimentoId, req.user) };
        },
      );
      res.status(resultado.status).json(resultado.corpo);
    }));
  }

  return { registrarRotas };
}

module.exports = { criarPortaria };
