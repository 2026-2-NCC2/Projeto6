const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require('./db');

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

app.get('/api/testar-conexao', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ status: 'Conectado com sucesso!', resultado: rows[0].solution });
  } catch (error) {
    console.error('Erro ao conectar ao MySQL:', error);
    res.status(500).json({ error: 'Erro interno ao conectar ao banco de dados' });
  }
});

app.get('/api/usuarios/:id', async (req, res) => {
  try {
      const { id } = req.params;

      const [rows] = await db.execute(
          `SELECT
              id,
              nome,
              email,
              url_foto_perfil,
              status_aprovacao,
              tipo_perfil,
              dois_fatores_ativo,
              data_cadastro
           FROM usuario
           WHERE id = ?`,
          [id]
      );

      if (rows.length === 0) {
          return res.status(404).json({
              error: 'Usuário não encontrado'
          });
      }

      res.json(rows[0]);

  } catch (error) {
      console.error('Erro ao buscar usuário:', error);

      res.status(500).json({
          error: 'Erro interno ao buscar usuário'
      });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { nome, email } = req.body;

      if (!nome || !email) {
          return res.status(400).json({
              error: 'Nome e e-mail são obrigatórios'
          });
      }

      await db.execute(
          `UPDATE usuario
           SET nome = ?, email = ?
           WHERE id = ?`,
          [nome, email, id]
      );

      res.json({
          message: 'Dados atualizados com sucesso!'
      });

  } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
              error: 'Este e-mail já está cadastrado'
          });
      }

      console.error('Erro ao atualizar usuário:', error);

      res.status(500).json({
          error: 'Erro interno ao atualizar usuário'
      });
  }
});

app.post('/api/usuarios', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { nome, email, senha, tipo_perfil, documento, nome_organizacao, telefone } = req.body;

    if (!nome || !email || !senha || !tipo_perfil) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const saltRounds = 10;
    const senha_hash = await bcrypt.hash(senha, saltRounds);

    const [userResult] = await connection.execute(
      `INSERT INTO usuario (nome, email, senha_hash, tipo_perfil, status_aprovacao) 
       VALUES (?, ?, ?, ?, 'P')`,
      [nome, email, senha_hash, tipo_perfil]
    );

    const usuarioId = userResult.insertId;

    if (tipo_perfil === 2 || tipo_perfil === '2') {
      const isCnpj = documento && documento.length > 11;
      await connection.execute(
        `INSERT INTO organizador_detalhes (usuario_id, nome_organizacao, telefone, cpf, cnpj) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          usuarioId, 
          nome_organizacao || nome, 
          telefone || null, 
          isCnpj ? null : documento, 
          isCnpj ? documento : null
        ]
      );
    } else if (tipo_perfil === 3 || tipo_perfil === '3') {
      const isCnpj = documento && documento.length > 11;
      await connection.execute(
        `INSERT INTO fornecedor_detalhes (usuario_id, nome_fantasia, telefone, cpf, cnpj) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          usuarioId, 
          nome_organizacao || nome, 
          telefone || null, 
          isCnpj ? null : documento, 
          isCnpj ? documento : null
        ]
      );
    }

    await connection.commit();
    connection.release();

    res.status(201).json({ 
      message: 'Usuário cadastrado com sucesso!', 
      usuarioId 
    });

  } catch (error) {
    await connection.rollback();
    connection.release();

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este e-mail ou documento já está cadastrado.' });
    }

    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ error: 'Erro interno ao realizar o cadastro.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    // 1. Buscar o utilizador pelo e-mail
    const [rows] = await db.execute(
      `SELECT id, nome, email, senha_hash, tipo_perfil FROM usuario WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const usuario = rows[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const tiposMap = {
      1: 'comprador',
      2: 'organizador',
      3: 'fornecedor',
      4: 'admin'
    };

    res.json({
      message: 'Login realizado com sucesso!',
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: tiposMap[usuario.tipo_perfil] || 'comprador'
      }
    });

  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});