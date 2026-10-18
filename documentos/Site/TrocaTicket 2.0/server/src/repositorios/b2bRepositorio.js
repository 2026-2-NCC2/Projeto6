const consultaProduto = `SELECT p.id,p.fornecedor_id AS supplierId,p.nome AS name,p.descricao AS description,p.tipo AS type,
 m.price_cents AS priceCents,m.stock,m.active,
 m.stock-COALESCE((SELECT SUM(mp.quantity) FROM oferta o JOIN mvp_proposta mp ON mp.oferta_id=o.id WHERE o.produto_servico_id=p.id AND o.status='A'),0) AS available
 FROM produto_servico p JOIN mvp_produto m ON m.produto_id=p.id JOIN usuario u ON u.id=p.fornecedor_id`;

const consultaProposta = `SELECT o.id,o.evento_id AS eventId,e.titulo AS eventTitle,o.produto_servico_id AS productId,
 p.nome AS productName,o.fornecedor_id AS supplierId,u.nome AS supplierName,o.status,
 m.quantity,m.unit_cents AS unitCents,m.quantity*m.unit_cents AS totalCents,m.description,e.organizador_id AS organizerId
 FROM oferta o JOIN mvp_proposta m ON m.oferta_id=o.id JOIN evento e ON e.id=o.evento_id
 JOIN produto_servico p ON p.id=o.produto_servico_id JOIN usuario u ON u.id=o.fornecedor_id`;

export function criarB2BRepositorio(banco) {
  async function buscarProduto(id) {
    const [[produto]] = await banco.execute(`${consultaProduto} WHERE p.id=?`, [id]);
    return produto;
  }

  return {
    buscarProduto,
    async listarFornecedoresAprovados() {
      const [linhas] =
        await banco.execute(`SELECT u.id,u.nome AS name,COALESCE(m.description,f.descricao_servicos,'') AS description
        FROM usuario u JOIN fornecedor_detalhes f ON f.usuario_id=u.id LEFT JOIN mvp_perfil m ON m.usuario_id=u.id
        WHERE u.tipo_perfil=3 AND u.status_aprovacao='A' ORDER BY u.nome,u.id`);
      return linhas;
    },
    async listarProdutosPublicos() {
      const [linhas] = await banco.execute(
        `${consultaProduto} WHERE u.status_aprovacao='A' AND m.active=1 ORDER BY p.id`,
      );
      return linhas;
    },
    async listarProdutosDoFornecedor(fornecedorId) {
      const [linhas] = await banco.execute(
        `${consultaProduto} WHERE p.fornecedor_id=? ORDER BY p.id`,
        [fornecedorId],
      );
      return linhas;
    },
    async bloquearProduto(id) {
      // Primeiro espera o lock; a leitura seguinte já vê a contratação confirmada.
      // A subconsulta não pode obter seu snapshot antes dessa espera.
      await banco.execute('SELECT produto_id FROM mvp_produto WHERE produto_id=? FOR UPDATE', [id]);
      return buscarProduto(id);
    },
    async atualizarProduto(id, dados) {
      await banco.execute('UPDATE produto_servico SET nome=?,descricao=?,tipo=? WHERE id=?', [
        dados.name,
        dados.description,
        dados.type,
        id,
      ]);
      await banco.execute(
        'UPDATE mvp_produto SET price_cents=?,stock=?,active=? WHERE produto_id=?',
        [dados.priceCents, dados.stock, dados.active ? 1 : 0, id],
      );
    },
    async inserirProduto(fornecedorId, dados) {
      const [resultado] = await banco.execute(
        'INSERT INTO produto_servico(fornecedor_id,nome,descricao,tipo) VALUES(?,?,?,?)',
        [fornecedorId, dados.name, dados.description, dados.type],
      );
      const id = resultado.insertId;
      await banco.execute(
        'INSERT INTO mvp_produto(produto_id,price_cents,stock,active) VALUES(?,?,?,?)',
        [id, dados.priceCents, dados.stock, dados.active ? 1 : 0],
      );
      return id;
    },
    async listarPropostasDaConta(usuarioId) {
      const [linhas] = await banco.execute(
        `${consultaProposta} WHERE o.fornecedor_id=? OR e.organizador_id=? ORDER BY o.id DESC`,
        [usuarioId, usuarioId],
      );
      return linhas;
    },
    async buscarProposta(id, bloquear = false) {
      const [[proposta]] = await banco.execute(
        `${consultaProposta} WHERE o.id=?${bloquear ? ' FOR UPDATE' : ''}`,
        [id],
      );
      return proposta;
    },
    async bloquearEventoParaProposta(eventoId) {
      const [[evento]] = await banco.execute(
        'SELECT m.status FROM evento e JOIN mvp_evento m ON m.evento_id=e.id WHERE e.id=? FOR UPDATE',
        [eventoId],
      );
      return evento;
    },
    async inserirProposta(fornecedorId, dados) {
      // DECIMAL de compatibilidade deriva do total inteiro, sem cálculo com float.
      const total = dados.quantity * dados.unitCents;
      const decimal = `${Math.trunc(total / 100)}.${String(total % 100).padStart(2, '0')}`;
      const [resultado] = await banco.execute(
        'INSERT INTO oferta(valor,evento_id,produto_servico_id,fornecedor_id) VALUES(?,?,?,?)',
        [decimal, dados.eventId, dados.productId, fornecedorId],
      );
      const id = resultado.insertId;
      await banco.execute(
        'INSERT INTO mvp_proposta(oferta_id,quantity,unit_cents,description) VALUES(?,?,?,?)',
        [id, dados.quantity, dados.unitCents, dados.description],
      );
      return id;
    },
    async buscarReferenciasDaProposta(id) {
      const [[referencias]] = await banco.execute(
        'SELECT evento_id,produto_servico_id FROM oferta WHERE id=?',
        [id],
      );
      return referencias;
    },
    async bloquearEvento(eventoId) {
      await banco.execute('SELECT id FROM evento WHERE id=? FOR UPDATE', [eventoId]);
    },
    async buscarEstadoDoEvento(eventoId) {
      const [[evento]] = await banco.execute('SELECT status FROM mvp_evento WHERE evento_id=?', [
        eventoId,
      ]);
      return evento;
    },
    async buscarAprovacaoDoFornecedor(fornecedorId) {
      const [[fornecedor]] = await banco.execute(
        'SELECT status_aprovacao FROM usuario WHERE id=?',
        [fornecedorId],
      );
      return fornecedor;
    },
    async atualizarEstadoDaProposta(id, status) {
      await banco.execute('UPDATE oferta SET status=? WHERE id=?', [status, id]);
    },
    async buscarOrganizadorDoEvento(eventoId) {
      const [[evento]] = await banco.execute('SELECT organizador_id FROM evento WHERE id=?', [
        eventoId,
      ]);
      return evento;
    },
    async listarPropostasAceitas(eventoId) {
      const [linhas] = await banco.execute(
        `${consultaProposta} WHERE o.evento_id=? AND o.status='A' ORDER BY o.id`,
        [eventoId],
      );
      return linhas;
    },
  };
}
