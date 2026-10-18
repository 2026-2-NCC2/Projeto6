// A conexão recebida pode ser o pool (leitura) ou a conexão da transação.
// O repositório conhece SQL; autorização e decisões de negócio ficam nas rotas.
const consultaEvento = `SELECT e.*,m.status,m.description,m.category,m.ends_at,
 (SELECT f.url_foto FROM foto_evento f WHERE f.evento_id=e.id ORDER BY f.id LIMIT 1) AS image
 FROM evento e JOIN mvp_evento m ON m.evento_id=e.id`;

const consultaDisponibilidade = `SELECT c.*,
 c.stock-(SELECT COUNT(*) FROM mvp_unidade u WHERE u.category_id=c.id AND u.state<>'cancelled')
 -COALESCE((SELECT SUM(p.quantity) FROM mvp_pedido p WHERE p.category_id=c.id AND p.kind='primary'
 AND (p.delivery_state='pending' OR (p.delivery_state='reserved' AND p.expires_at>UTC_TIMESTAMP(3)))),0) AS available
 FROM mvp_categoria c WHERE c.event_id=? ORDER BY c.id`;

export function criarCatalogoRepositorio(banco) {
  return {
    async listarEventosPublicos() {
      const [linhas] = await banco.execute(
        `${consultaEvento} WHERE m.status IN ('published','closed','cancelled') ORDER BY e.data_hora,e.id`,
      );
      return linhas;
    },
    async listarEventosDoOrganizador(organizadorId) {
      const [linhas] = await banco.execute(
        `${consultaEvento} WHERE e.organizador_id=? ORDER BY e.id DESC`,
        [organizadorId],
      );
      return linhas;
    },
    async buscarEvento(id, bloquear = false) {
      const [[evento]] = await banco.execute(
        `${consultaEvento} WHERE e.id=?${bloquear ? ' FOR UPDATE' : ''}`,
        [id],
      );
      return evento;
    },
    async listarCategoriasDisponiveis(eventoId) {
      const [linhas] = await banco.execute(consultaDisponibilidade, [eventoId]);
      return linhas;
    },
    async bloquearEvento(id) {
      const [[evento]] = await banco.execute(
        'SELECT id,organizador_id FROM evento WHERE id=? FOR UPDATE',
        [id],
      );
      return evento;
    },
    async inserirEvento(organizadorId, dados) {
      const [resultado] = await banco.execute(
        'INSERT INTO evento(organizador_id,titulo,publico_max,data_hora,`local`) VALUES(?,?,?,?,?)',
        [organizadorId, dados.title, dados.capacity, dados.start, dados.venue],
      );
      const id = resultado.insertId;
      await banco.execute(
        'INSERT INTO mvp_evento(evento_id,status,description,category,ends_at) VALUES(?,?,?,?,?)',
        [id, dados.status, dados.description, dados.category, dados.end],
      );
      return id;
    },
    async atualizarEvento(id, dados) {
      await banco.execute(
        'UPDATE evento SET titulo=?,publico_max=?,data_hora=?,`local`=? WHERE id=?',
        [dados.title, dados.capacity, dados.start, dados.venue, id],
      );
      await banco.execute(
        'UPDATE mvp_evento SET status=?,description=?,category=?,ends_at=? WHERE evento_id=?',
        [dados.status, dados.description, dados.category, dados.end, id],
      );
    },
    async buscarPrimeiraFoto(eventoId) {
      const [[foto]] = await banco.execute(
        'SELECT id FROM foto_evento WHERE evento_id=? ORDER BY id LIMIT 1',
        [eventoId],
      );
      return foto;
    },
    async atualizarFoto(id, imagem) {
      await banco.execute('UPDATE foto_evento SET url_foto=? WHERE id=?', [imagem, id]);
    },
    async inserirFoto(eventoId, imagem) {
      await banco.execute('INSERT INTO foto_evento(evento_id,url_foto) VALUES(?,?)', [
        eventoId,
        imagem,
      ]);
    },
    async buscarCategoria(id, eventoId) {
      const [[categoria]] = await banco.execute(
        'SELECT * FROM mvp_categoria WHERE id=? AND event_id=?',
        [id, eventoId],
      );
      return categoria;
    },
    async contarUnidadesDaCategoria(id) {
      const [[resultado]] = await banco.execute(
        'SELECT COUNT(*) AS used FROM mvp_unidade WHERE category_id=?',
        [id],
      );
      return resultado.used;
    },
    async contarOcupacaoDaCategoria(id) {
      const [[resultado]] = await banco.execute(
        `SELECT (SELECT COUNT(*) FROM mvp_unidade WHERE category_id=? AND state<>'cancelled')
        +COALESCE((SELECT SUM(quantity) FROM mvp_pedido WHERE category_id=? AND kind='primary'
        AND (delivery_state='pending' OR (delivery_state='reserved' AND expires_at>UTC_TIMESTAMP(3)))),0) AS total`,
        [id, id],
      );
      return Number(resultado.total);
    },
    async atualizarCategoria(id, dados) {
      await banco.execute(
        'UPDATE mvp_categoria SET name=?,kind=?,price_cents=?,stock=?,sales_open=? WHERE id=?',
        [dados.name, dados.kind, dados.priceCents, dados.stock, dados.salesOpen ? 1 : 0, id],
      );
    },
    async inserirCategoria(eventoId, dados) {
      await banco.execute(
        'INSERT INTO mvp_categoria(event_id,name,kind,price_cents,stock,sales_open) VALUES(?,?,?,?,?,?)',
        [eventoId, dados.name, dados.kind, dados.priceCents, dados.stock, dados.salesOpen ? 1 : 0],
      );
    },
    async resumirEstoqueDoEvento(eventoId) {
      const [[resultado]] = await banco.execute(
        'SELECT COALESCE(SUM(stock),0) AS total,COUNT(*) AS categories FROM mvp_categoria WHERE event_id=?',
        [eventoId],
      );
      return resultado;
    },
    async listarAvaliacoes(eventoId) {
      const [linhas] = await banco.execute(
        'SELECT a.id,a.usuario_id AS userId,u.nome AS name,a.nota AS rating,a.comentario AS comment FROM avaliacao a JOIN usuario u ON u.id=a.usuario_id WHERE a.evento_id=? ORDER BY a.id',
        [eventoId],
      );
      return linhas;
    },
    async buscarElegibilidadeDaAvaliacao(eventoId, usuarioId) {
      const [[resultado]] = await banco.execute(
        `SELECT e.id FROM evento e JOIN mvp_evento m ON m.evento_id=e.id
        WHERE e.id=? AND m.ends_at IS NOT NULL AND m.ends_at<UTC_TIMESTAMP(3)
        AND EXISTS(SELECT 1 FROM mvp_entrada en JOIN mvp_historico h ON h.ticket_id=en.ticket_id AND h.kind='entered' AND h.to_user_id=?
        JOIN ingresso i ON i.id=en.ticket_id WHERE i.evento_id=e.id)`,
        [eventoId, usuarioId],
      );
      return resultado;
    },
    async inserirAvaliacao(eventoId, usuarioId, nota, comentario) {
      await banco.execute(
        'INSERT INTO avaliacao(evento_id,usuario_id,nota,comentario) VALUES(?,?,?,?)',
        [eventoId, usuarioId, nota, comentario],
      );
    },
  };
}
