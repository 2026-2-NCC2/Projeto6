const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Garante que o diretório de uploads exista no projeto
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Disponibiliza as imagens publicamente via URL
app.use('/uploads', express.static(uploadsDir));

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

// Upload da foto de perfil: salva o arquivo em server/uploads/ e grava a URL no banco de dados
app.post('/api/usuarios/:id/foto', async (req, res) => {
  try {
    const { id } = req.params;
    const { fotoBase64 } = req.body;

    if (!fotoBase64) {
      return res.status(400).json({ error: 'Nenhuma foto fornecida.' });
    }

    // 1. Verifica se o usuário existe
    const [usuarios] = await db.execute('SELECT id, url_foto_perfil FROM usuario WHERE id = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const usuarioAtual = usuarios[0];

    // 2. Extrai dados binários da imagem Base64
    const matches = fotoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Formato de imagem inválido.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let extension = 'png';
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') extension = 'jpg';
    else if (mimeType === 'image/webp') extension = 'webp';
    else if (mimeType === 'image/png') extension = 'png';

    // 3. Remove a foto anterior do disco se existir
    if (usuarioAtual.url_foto_perfil) {
      try {
        const nomeArquivoAntigo = path.basename(usuarioAtual.url_foto_perfil);
        const caminhoAntigo = path.join(uploadsDir, nomeArquivoAntigo);
        if (fs.existsSync(caminhoAntigo)) {
          fs.unlinkSync(caminhoAntigo);
        }
      } catch (err) {
        console.warn('Erro ao remover foto antiga do disco:', err);
      }
    }

    // 4. Salva a nova foto na pasta de uploads
    const nomeArquivo = `foto-usuario-${id}-${Date.now()}.${extension}`;
    const caminhoCompleto = path.join(uploadsDir, nomeArquivo);
    fs.writeFileSync(caminhoCompleto, buffer);

    // 5. Monta a URL de acesso público
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urlFoto = `${baseUrl}/uploads/${nomeArquivo}`;

    // 6. Atualiza o banco de dados
    await db.execute('UPDATE usuario SET url_foto_perfil = ? WHERE id = ?', [urlFoto, id]);

    res.json({
      message: 'Foto de perfil atualizada com sucesso!',
      url_foto_perfil: urlFoto
    });

  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    res.status(500).json({ error: 'Erro interno ao salvar a foto de perfil.' });
  }
});

// Exclusão da foto de perfil: apaga o arquivo da pasta e define url_foto_perfil como NULL no banco
app.delete('/api/usuarios/:id/foto', async (req, res) => {
  try {
    const { id } = req.params;

    const [usuarios] = await db.execute('SELECT id, url_foto_perfil FROM usuario WHERE id = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const usuarioAtual = usuarios[0];

    // Remove arquivo do disco se existir
    if (usuarioAtual.url_foto_perfil) {
      try {
        const nomeArquivo = path.basename(usuarioAtual.url_foto_perfil);
        const caminhoArquivo = path.join(uploadsDir, nomeArquivo);
        if (fs.existsSync(caminhoArquivo)) {
          fs.unlinkSync(caminhoArquivo);
        }
      } catch (err) {
        console.warn('Erro ao deletar arquivo de foto do disco:', err);
      }
    }

    // Limpa a URL no banco de dados
    await db.execute('UPDATE usuario SET url_foto_perfil = NULL WHERE id = ?', [id]);

    res.json({
      message: 'Foto de perfil removida com sucesso!',
      url_foto_perfil: null
    });

  } catch (error) {
    console.error('Erro ao excluir foto de perfil:', error);
    res.status(500).json({ error: 'Erro interno ao excluir foto de perfil.' });
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
      `SELECT id, nome, email, senha_hash, tipo_perfil, url_foto_perfil FROM usuario WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const usuario = rows[0];

    // Permite comparar senha com hash bcrypt ou texto plano (caso registros tenham sido inseridos manualmente no banco)
    const senhaValida =
      usuario.senha_hash === senha ||
      (await bcrypt.compare(senha, usuario.senha_hash).catch(() => false));

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
        foto: usuario.url_foto_perfil || null,
        tipo_perfil: usuario.tipo_perfil,
        role: tiposMap[usuario.tipo_perfil] || 'comprador'
      }
    });

  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
});