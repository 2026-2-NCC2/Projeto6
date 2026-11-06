// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require('./db');

// GET /api/organizadores - Listar todos os organizadores
app.get('/api/organizadores', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, u.nome, u.email, u.url_foto_perfil, u.status_aprovacao, u.dois_fatores_ativo, u.data_cadastro,
        o.id AS organizador_detalhe_id, o.nome_empresa, o.razao_social, o.tipo_eventos_principais,
        o.descricao_organizacao, o.website, o.telefone, o.cpf, o.cnpj
      FROM usuario u
      INNER JOIN organizador_detalhes o ON u.id = o.usuario_id
      ORDER BY u.id DESC;
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar organizadores:', error);
    res.status(500).json({ error: 'Falha ao carregar a lista de organizadores.' });
  }
});

// GET /api/organizadores/:id - Obter organizador por ID
app.get('/api/organizadores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        u.id, u.nome, u.email, u.url_foto_perfil, u.status_aprovacao, u.dois_fatores_ativo, u.data_cadastro,
        o.id AS organizador_detalhe_id, o.nome_empresa, o.razao_social, o.tipo_eventos_principais,
        o.descricao_organizacao, o.website, o.telefone, o.cpf, o.cnpj
      FROM usuario u
      INNER JOIN organizador_detalhes o ON u.id = o.usuario_id
      WHERE u.id = ?;
    `;
    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Organizador não encontrado.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar organizador:', error);
    res.status(500).json({ error: 'Falha ao carregar detalhes do organizador.' });
  }
});

// POST /api/organizadores - Criar novo organizador
app.post('/api/organizadores', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      nome,
      email,
      senha_hash,
      url_foto_perfil,
      nome_empresa,
      razao_social,
      tipo_eventos_principais,
      descricao_organizacao,
      website,
      telefone,
      cpf,
      cnpj
    } = req.body;

    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }

    await connection.beginTransaction();

    // Inserção na tabela `usuario` (tipo_perfil = 2 para Organizador)
    const [userResult] = await connection.query(
      `INSERT INTO usuario (nome, email, senha_hash, url_foto_perfil, tipo_perfil, status_aprovacao)
       VALUES (?, ?, ?, ?, 2, 'A')`,
      [nome, email, senha_hash || 'hash_demonstracao', url_foto_perfil || null]
    );

    const usuario_id = userResult.insertId;

    // Inserção na tabela `organizador_detalhes`
    await connection.query(
      `INSERT INTO organizador_detalhes 
       (usuario_id, nome_empresa, razao_social, tipo_eventos_principais, descricao_organizacao, website, telefone, cpf, cnpj)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario_id,
        nome_empresa || nome,
        razao_social || nome,
        tipo_eventos_principais || 'Shows & Festivais',
        descricao_organizacao || '',
        website || '',
        telefone || '',
        cpf || null,
        cnpj || null
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Organizador cadastrado com sucesso!',
      id: usuario_id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao criar organizador:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'E-mail ou documento já cadastrado.' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar organizador no banco de dados.' });
  } finally {
    connection.release();
  }
});

// PUT /api/organizadores/:id - Atualizar organizador
app.put('/api/organizadores/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      nome,
      email,
      url_foto_perfil,
      nome_empresa,
      razao_social,
      tipo_eventos_principais,
      descricao_organizacao,
      website,
      telefone,
      cpf,
      cnpj
    } = req.body;

    await connection.beginTransaction();

    const [userCheck] = await connection.query('SELECT id FROM usuario WHERE id = ?', [id]);
    if (userCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Organizador não encontrado.' });
    }

    await connection.query(
      `UPDATE usuario SET nome = ?, email = ?, url_foto_perfil = ? WHERE id = ?`,
      [nome, email, url_foto_perfil || null, id]
    );

    await connection.query(
      `UPDATE organizador_detalhes 
       SET nome_empresa = ?, razao_social = ?, tipo_eventos_principais = ?,
           descricao_organizacao = ?, website = ?, telefone = ?, cpf = ?, cnpj = ?
       WHERE usuario_id = ?`,
      [
        nome_empresa,
        razao_social,
        tipo_eventos_principais,
        descricao_organizacao,
        website,
        telefone,
        cpf || null,
        cnpj || null,
        id
      ]
    );

    await connection.commit();
    res.json({ message: 'Organizador atualizado com sucesso!' });
  } catch (error) {
    await connection.rollback();
    console.error('Erro ao atualizar organizador:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados do organizador.' });
  } finally {
    connection.release();
  }
});

// DELETE /api/organizadores/:id - Remover registro
app.delete('/api/organizadores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM usuario WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Organizador não encontrado.' });
    }

    res.json({ message: 'Organizador removido com sucesso!' });
  } catch (error) {
    console.error('Erro ao remover organizador:', error);
    res.status(500).json({ error: 'Falha ao remover o organizador.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor API TrocaTicket rodando na porta ${PORT}`);
});