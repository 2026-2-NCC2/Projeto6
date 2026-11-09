require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
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

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function eventInputError(body) {
  const {
    title,
    category,
    format = 'Presencial',
    date,
    endDate,
    time,
    endTime,
    location,
    capacity,
    price,
    status = 'Rascunho',
    description = '',
    image,
  } = body;

  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 255) {
    return 'Informe um nome de evento com 3 a 255 caracteres.';
  }
  if (typeof category !== 'string' || !category.trim() || category.length > 100) {
    return 'Informe uma categoria válida.';
  }
  if (typeof format !== 'string' || !format.trim() || format.length > 50) {
    return 'Informe um formato válido.';
  }
  if (!isValidDate(date) || !isValidDate(endDate)) {
    return 'Informe datas válidas para o evento.';
  }
  if (
    typeof time !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    typeof endTime !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    `${endDate}T${endTime}` <= `${date}T${time}`
  ) {
    return 'O término deve ser posterior ao início.';
  }
  if (typeof location !== 'string' || !location.trim() || location.length > 255) {
    return 'Informe um local ou link de acesso válido.';
  }
  if (capacity !== null && capacity !== '' && (!Number.isSafeInteger(Number(capacity)) || Number(capacity) < 1)) {
    return 'A capacidade deve ser um número inteiro maior que zero.';
  }
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 99999999.99) {
    return 'Informe um preço válido.';
  }
  if (typeof status !== 'string' || !status.trim() || status.length > 50) {
    return 'Informe um status válido.';
  }
  if (typeof description !== 'string' || description.length > 10000) {
    return 'A descrição deve ter no máximo 10.000 caracteres.';
  }
  if (image !== undefined && image !== null && typeof image !== 'string') {
    return 'A imagem de capa é inválida.';
  }
  return null;
}

async function requireOrganizer(organizerId, res) {
  const [rows] = await db.execute(
    'SELECT id FROM usuario WHERE id = ? AND tipo_perfil = 2',
    [organizerId],
  );
  if (!rows.length) {
    res.status(403).json({ error: 'É necessário usar uma conta de organizador cadastrada.' });
    return false;
  }
  return true;
}

function saveEventImage(image, eventId, req) {
  if (!image || !image.startsWith('data:')) {
    if (image && image.length > 255) {
      const error = new Error('A URL da imagem de capa é muito longa.');
      error.status = 400;
      throw error;
    }
    return { url: image || null, filePath: null };
  }

  const matches = image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!matches) {
    const error = new Error('A imagem deve ser JPG, PNG ou WEBP.');
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(matches[2], 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    const error = new Error('A imagem de capa deve ter no máximo 2 MB.');
    error.status = 400;
    throw error;
  }

  const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const filename = `evento-${eventId}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    url: `${req.protocol}://${req.get('host')}/uploads/${filename}`,
    filePath,
  };
}

function removeUploadedEventImage(imageUrl) {
  if (!imageUrl) return;
  const filename = path.basename(imageUrl);
  if (!filename.startsWith('evento-')) return;
  const filePath = path.join(uploadsDir, filename);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.warn('Não foi possível remover a imagem de capa anterior:', error);
  }
}

function discardUploadedEventImage(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Não foi possível limpar a imagem de capa temporária:', error);
  }
}

async function rollbackTransaction(connection) {
  if (!connection) return;
  try {
    await connection.rollback();
  } catch (error) {
    console.error('Não foi possível reverter a transação do evento:', error);
  }
}

function eventFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    format: row.format,
    date: row.date,
    endDate: row.endDate,
    time: row.time,
    endTime: row.endTime,
    location: row.location,
    capacity: row.capacity,
    price: Number(row.price),
    status: row.status,
    image: row.image || '/images/asset-5.jpg',
    description: row.description || '',
    suppliers: [],
  };
}

async function eventsWithSuppliers(rows) {
  const events = rows.map(eventFromRow);
  if (!events.length) return events;
  const placeholders = events.map(() => '?').join(', ');
  const [links] = await db.execute(
    `SELECT evento_id AS eventId, fornecedor_id AS supplierId
       FROM evento_fornecedor WHERE evento_id IN (${placeholders})`,
    events.map((event) => event.id),
  );
  const suppliersByEvent = new Map();
  for (const link of links) {
    const suppliers = suppliersByEvent.get(link.eventId) || [];
    suppliers.push(Number(link.supplierId));
    suppliersByEvent.set(link.eventId, suppliers);
  }
  return events.map((event) => ({
    ...event,
    suppliers: suppliersByEvent.get(event.id) || [],
  }));
}

const eventSelect = `
  SELECT id,
         titulo AS title,
         categoria AS category,
         formato AS format,
         DATE_FORMAT(data_inicio, '%Y-%m-%d') AS \`date\`,
         DATE_FORMAT(data_fim, '%Y-%m-%d') AS endDate,
         TIME_FORMAT(horario_inicio, '%H:%i') AS \`time\`,
         TIME_FORMAT(horario_termino, '%H:%i') AS endTime,
         \`local\` AS location,
         capacidade AS capacity,
         preco_base AS price,
         status,
         imagem_capa_url AS image,
         descricao AS description
    FROM evento`;

app.get('/api/eventos', async (req, res) => {
  const organizerId = positiveInteger(req.query.organizadorId);
  if (!organizerId) {
    return res.status(400).json({ error: 'Informe um ID de organizador válido.' });
  }

  try {
    if (!(await requireOrganizer(organizerId, res))) return;
    const [rows] = await db.execute(
      `${eventSelect} WHERE organizador_id = ? ORDER BY data_inicio, id`,
      [organizerId],
    );
    res.json(await eventsWithSuppliers(rows));
  } catch (error) {
    console.error('Erro ao listar eventos do organizador:', error);
    res.status(500).json({ error: 'Erro interno ao listar eventos.' });
  }
});

app.get('/api/eventos/publicados', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `${eventSelect} WHERE status = 'Publicado' AND data_fim >= CURRENT_DATE
       ORDER BY data_inicio, id`,
    );
    res.json(rows.map(eventFromRow));
  } catch (error) {
    console.error('Erro ao listar eventos publicados:', error);
    res.status(500).json({ error: 'Erro interno ao listar eventos publicados.' });
  }
});

app.post('/api/eventos', async (req, res) => {
  const organizerId = positiveInteger(req.body.organizadorId);
  if (!organizerId) {
    return res.status(400).json({ error: 'Informe um ID de organizador válido.' });
  }
  const validationError = eventInputError(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  let connection;
  let uploadedImage;
  try {
    if (!(await requireOrganizer(organizerId, res))) return;
    connection = await db.getConnection();
    await connection.beginTransaction();
    const {
      title, category, format = 'Presencial', date, endDate, time, endTime,
      location, capacity, price, status = 'Rascunho', description = '', image,
    } = req.body;
    const [result] = await connection.execute(
      `INSERT INTO evento
        (organizador_id, titulo, descricao, categoria, formato, data_inicio, data_fim,
         horario_inicio, horario_termino, \`local\`, capacidade, preco_base, status, imagem_capa_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        organizerId, title.trim(), description, category.trim(), format.trim(), date, endDate,
        time, endTime, location.trim(), capacity === '' ? null : capacity, Number(price), status,
      ],
    );
    const savedImage = saveEventImage(image, result.insertId, req);
    uploadedImage = savedImage.filePath;
    await connection.execute(
      'UPDATE evento SET imagem_capa_url = ? WHERE id = ? AND organizador_id = ?',
      [savedImage.url, result.insertId, organizerId],
    );
    const [rows] = await connection.execute(`${eventSelect} WHERE id = ? AND organizador_id = ?`, [
      result.insertId,
      organizerId,
    ]);
    await connection.commit();
    res.status(201).json(eventFromRow(rows[0]));
  } catch (error) {
    await rollbackTransaction(connection);
    discardUploadedEventImage(uploadedImage);
    console.error('Erro ao cadastrar evento:', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Erro interno ao cadastrar evento.',
    });
  } finally {
    connection?.release();
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  const eventId = positiveInteger(req.params.id);
  const organizerId = positiveInteger(req.body.organizadorId);
  if (!eventId || !organizerId) {
    return res.status(400).json({ error: 'Informe IDs válidos para o evento e organizador.' });
  }
  const validationError = eventInputError(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  let connection;
  let uploadedImage;
  let previousImage;
  try {
    if (!(await requireOrganizer(organizerId, res))) return;
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [events] = await connection.execute(
      'SELECT imagem_capa_url AS image FROM evento WHERE id = ? AND organizador_id = ? FOR UPDATE',
      [eventId, organizerId],
    );
    if (!events.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Evento não encontrado para este organizador.' });
    }
    previousImage = events[0].image;
    const {
      title, category, format = 'Presencial', date, endDate, time, endTime,
      location, capacity, price, status = 'Rascunho', description = '', image,
    } = req.body;
    const savedImage = saveEventImage(image, eventId, req);
    uploadedImage = savedImage.filePath;
    await connection.execute(
      `UPDATE evento
          SET titulo = ?, descricao = ?, categoria = ?, formato = ?, data_inicio = ?, data_fim = ?,
              horario_inicio = ?, horario_termino = ?, \`local\` = ?, capacidade = ?, preco_base = ?,
              status = ?, imagem_capa_url = ?
        WHERE id = ? AND organizador_id = ?`,
      [
        title.trim(), description, category.trim(), format.trim(), date, endDate, time, endTime,
        location.trim(), capacity === '' ? null : capacity, Number(price), status, savedImage.url,
        eventId, organizerId,
      ],
    );
    const [rows] = await connection.execute(`${eventSelect} WHERE id = ? AND organizador_id = ?`, [
      eventId,
      organizerId,
    ]);
    await connection.commit();
    if (previousImage !== savedImage.url) removeUploadedEventImage(previousImage);
    res.json(eventFromRow(rows[0]));
  } catch (error) {
    await rollbackTransaction(connection);
    discardUploadedEventImage(uploadedImage);
    console.error('Erro ao atualizar evento:', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Erro interno ao atualizar evento.',
    });
  } finally {
    connection?.release();
  }
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
  let uploadedPath;
  try {
    const id = positiveInteger(req.params.id);
    const { fotoBase64 } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
    }
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
    const matches = fotoBase64.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'A foto deve estar no formato PNG, JPG ou WEBP.' });
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'A foto deve ter no máximo 2 MB.' });
    }

    const filename = `foto-usuario-${id}-${Date.now()}.${extension}`;
    uploadedPath = path.join(uploadsDir, filename);
    fs.writeFileSync(uploadedPath, buffer);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urlFoto = `${baseUrl}/uploads/${filename}`;
    await db.execute('UPDATE usuario SET url_foto_perfil = ? WHERE id = ?', [urlFoto, id]);
    uploadedPath = null;

    const previousFilename = path.basename(usuarioAtual.url_foto_perfil || '');
    if (
      previousFilename.startsWith(`foto-usuario-${id}-`) &&
      previousFilename !== filename
    ) {
      const previousPath = path.join(uploadsDir, previousFilename);
      try {
        if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
      } catch (error) {
        console.warn('Não foi possível remover a foto de perfil anterior:', error);
      }
    }

    res.json({
      message: 'Foto de perfil atualizada com sucesso!',
      url_foto_perfil: urlFoto
    });

  } catch (error) {
    if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
    console.error('Erro ao fazer upload da foto:', error);
    res.status(500).json({ error: 'Erro interno ao salvar a foto de perfil.' });
  }
});

// Exclusão da foto de perfil: apaga o arquivo da pasta e define url_foto_perfil como NULL no banco
app.delete('/api/usuarios/:id/foto', async (req, res) => {
  try {
    const id = positiveInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
    }

    const [usuarios] = await db.execute('SELECT id, url_foto_perfil FROM usuario WHERE id = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const usuarioAtual = usuarios[0];

    await db.execute('UPDATE usuario SET url_foto_perfil = NULL WHERE id = ?', [id]);
    if (usuarioAtual.url_foto_perfil) {
      const filename = path.basename(usuarioAtual.url_foto_perfil);
      const filePath = path.join(uploadsDir, filename);
      try {
        if (filename.startsWith(`foto-usuario-${id}-`) && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn('Não foi possível remover o arquivo de foto de perfil:', error);
      }
    }

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

    function parseJson(value, fallback) {
      if (!value) return fallback;
      if (typeof value === 'object') return value;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }

    async function requireUserRole(userId, role, res) {
      const [users] = await db.execute(
        'SELECT id FROM usuario WHERE id = ? AND tipo_perfil = ?',
        [userId, role],
      );
      if (users.length) return true;
      res.status(403).json({ error: 'A conta não possui o perfil necessário para esta operação.' });
      return false;
    }

    function ticketFromRow(row) {
      return {
        id: Number(row.id),
        code: row.code,
        eventId: Number(row.eventId),
        eventTitle: row.eventTitle,
        image: row.image || '/images/asset-5.jpg',
        date: row.eventDate,
        location: row.location,
        type: row.type,
        price: Number(row.price),
        statusCode: row.status,
        status: row.status === 'A' ? 'Ativo' : row.status === 'V' ? 'Utilizado' : 'Cancelado',
        availableForExchange: Boolean(row.availableForExchange),
      };
    }

    function productFromRow(row) {
      return {
        id: row.id,
        sku: row.sku || `PRD-${row.id}`,
        name: row.name,
        version: row.version || '',
        category: row.category,
        type: row.type,
        unit: row.unit,
        price: Number(row.price),
        cost: Number(row.cost || 0),
        status: row.status,
        description: row.description || '',
        specs: parseJson(row.specs, []),
      };
    }

    const productSelect = `SELECT id, sku, nome AS name, versao AS version,
      categoria AS category, tipo AS type, unidade AS unit,
      preco_referencia AS price, custo_direto AS cost, status,
      descricao AS description, especificacoes AS specs
      FROM produto_servico`;

    function productInputError(body) {
      if (typeof body.name !== 'string' || body.name.trim().length < 3 || body.name.length > 255) {
        return 'Informe um nome com pelo menos 3 e no máximo 255 caracteres.';
      }
      if (typeof body.category !== 'string' || !body.category.trim() || body.category.length > 100) {
        return 'Informe uma categoria válida.';
      }
      if (typeof body.type !== 'string' || !body.type.trim() || body.type.length > 50) {
        return 'Informe um tipo válido.';
      }
      if (typeof body.unit !== 'string' || !body.unit.trim() || body.unit.length > 100) {
        return 'Informe uma unidade válida.';
      }
      if (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0 || Number(body.price) > 99999999.99) {
        return 'O preço de referência deve ser maior que zero.';
      }
      if (body.cost !== undefined && body.cost !== '' &&
          (!Number.isFinite(Number(body.cost)) || Number(body.cost) < 0 || Number(body.cost) > 99999999.99)) {
        return 'O custo direto deve ser um valor não negativo.';
      }
      if (!['Disponível', 'Alocado', 'Manutenção', 'Inativo'].includes(body.status || 'Disponível')) {
        return 'Informe um status válido.';
      }
      if (body.sku !== undefined && body.sku !== null &&
          (typeof body.sku !== 'string' || body.sku.length > 100)) {
        return 'O código SKU deve ter no máximo 100 caracteres.';
      }
      if (body.description !== undefined &&
          (typeof body.description !== 'string' || body.description.length > 10000)) {
        return 'A descrição deve ter no máximo 10.000 caracteres.';
      }
      if (body.specs !== undefined && !Array.isArray(body.specs)) {
        return 'As especificações do produto são inválidas.';
      }
      return null;
    }

    function supplierEventFromRow(row) {
      return {
        id: row.id,
        title: row.title,
        subtitle: row.format || 'Evento publicado',
        category: row.category,
        format: row.format,
        date: row.date,
        endDate: row.endDate,
        time: row.time,
        endTime: row.endTime,
        location: row.location,
        capacity: row.capacity,
        price: Number(row.price),
        status: 'Cotação aberta',
        description: row.description || '',
        organizer: row.organization || row.organizer,
        services: [row.category],
        proposal: row.proposalId && row.proposalStatus !== 'Rascunho'
          ? {
              id: row.proposalId,
              status: row.proposalStatus,
              value: Number(row.proposalTotal),
              protocol: row.protocol || `PRP-${row.proposalId}`,
              sentAt: row.proposalDate,
            }
          : null,
      };
    }

    function validProfileText(value, maxLength) {
      return typeof value === 'string' && value.length <= maxLength;
    }

    app.get('/api/fornecedores/:id/perfil', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        const [rows] = await db.execute(
          `SELECT u.id, u.nome AS name, u.email, u.url_foto_perfil AS photo,
                  fd.nome_fantasia AS tradeName, fd.razao_social AS legalName,
                  fd.categoria_principal AS category, fd.descricao_servicos AS description,
                  fd.website, fd.telefone AS phone, fd.cpf, fd.cnpj,
                  fd.endereco AS address, fd.notificacoes AS notifications,
                  fd.dois_fatores_ativo AS twoFactor
             FROM usuario u JOIN fornecedor_detalhes fd ON fd.usuario_id = u.id
            WHERE u.id = ?`,
          [supplierId],
        );
        if (!rows.length) return res.status(404).json({ error: 'Perfil do fornecedor não encontrado.' });
        const profile = rows[0];
        res.json({
          ...profile,
          document: profile.cnpj || profile.cpf || '',
          address: parseJson(profile.address, {}),
          notifications: parseJson(profile.notifications, {}),
          twoFactor: Boolean(profile.twoFactor),
          emailVerified: false,
        });
      } catch (error) {
        console.error('Erro ao carregar perfil do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao carregar o perfil do fornecedor.' });
      }
    });

    app.put('/api/fornecedores/:id/perfil', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      const {
        name, email, tradeName = '', legalName = '', category = '', website = '',
        description = '', phone = '', address = {}, notifications = {}, twoFactor = false,
      } = req.body;
      if (!validProfileText(name, 255) || name.trim().length < 2 ||
          !validProfileText(email, 191) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          !validProfileText(tradeName, 255) || !validProfileText(legalName, 255) ||
          !validProfileText(category, 100) || !validProfileText(website, 255) ||
          !validProfileText(description, 10000) || !validProfileText(phone, 20) ||
          !address || typeof address !== 'object' || Array.isArray(address) ||
          !notifications || typeof notifications !== 'object' || Array.isArray(notifications) ||
          typeof twoFactor !== 'boolean') {
        return res.status(400).json({ error: 'Revise os dados do perfil e tente novamente.' });
      }

      let connection;
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [suppliers] = await connection.execute(
          'SELECT usuario_id FROM fornecedor_detalhes WHERE usuario_id = ?',
          [supplierId],
        );
        if (!suppliers.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Perfil do fornecedor não encontrado.' });
        }
        await connection.execute(
          `UPDATE usuario SET nome = ?, email = ?, dois_fatores_ativo = ? WHERE id = ?`,
          [name.trim(), email.trim().toLowerCase(), twoFactor, supplierId],
        );
        await connection.execute(
          `UPDATE fornecedor_detalhes
              SET nome_fantasia = ?, razao_social = ?, categoria_principal = ?,
                  descricao_servicos = ?, website = ?, telefone = ?, endereco = ?, notificacoes = ?,
                  dois_fatores_ativo = ?
            WHERE usuario_id = ?`,
          [
            tradeName.trim(), legalName.trim(), category, description, website.trim(), phone,
            JSON.stringify(address), JSON.stringify(notifications), twoFactor, supplierId,
          ],
        );
        await connection.commit();
        res.json({ message: 'Perfil do fornecedor salvo.' });
      } catch (error) {
        await rollbackTransaction(connection);
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Este e-mail já está sendo usado por outra conta.' });
        }
        console.error('Erro ao salvar perfil do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao salvar o perfil do fornecedor.' });
      } finally {
        connection?.release();
      }
    });

    app.get('/api/organizadores/:id/fornecedores', async (req, res) => {
      const organizerId = positiveInteger(req.params.id);
      if (!organizerId) return res.status(400).json({ error: 'Informe um ID de organizador válido.' });
      try {
        if (!(await requireOrganizer(organizerId, res))) return;
        const [rows] = await db.execute(
          `SELECT u.id, u.nome AS contactName,
                  COALESCE(fd.nome_fantasia, u.nome) AS name,
                  fd.categoria_principal AS category, fd.telefone AS phone,
                  COUNT(ps.id) AS productCount, MIN(ps.preco_referencia) AS referencePrice
             FROM usuario u
             JOIN fornecedor_detalhes fd ON fd.usuario_id = u.id
             LEFT JOIN produto_servico ps
               ON ps.fornecedor_id = u.id AND ps.status <> 'Inativo'
            WHERE u.tipo_perfil = 3
            GROUP BY u.id, u.nome, fd.nome_fantasia, fd.categoria_principal, fd.telefone
            ORDER BY name, u.id`,
        );
        const supplierIds = rows.map((supplier) => supplier.id);
        const productsBySupplier = new Map();
        if (supplierIds.length) {
          const placeholders = supplierIds.map(() => '?').join(', ');
          const [products] = await db.execute(
            `SELECT id, fornecedor_id AS supplierId, nome AS name, categoria AS category,
                    tipo AS type, unidade AS unit, preco_referencia AS price,
                    status, descricao AS description
               FROM produto_servico
              WHERE fornecedor_id IN (${placeholders}) AND status <> 'Inativo'
              ORDER BY fornecedor_id, nome, id`,
            supplierIds,
          );
          for (const product of products) {
            const key = Number(product.supplierId);
            const list = productsBySupplier.get(key) || [];
            list.push({
              id: Number(product.id),
              name: product.name,
              category: product.category,
              type: product.type,
              unit: product.unit,
              price: Number(product.price),
              status: product.status,
              description: product.description || '',
            });
            productsBySupplier.set(key, list);
          }
        }
        res.json(rows.map((supplier) => ({
            ...supplier,
            id: Number(supplier.id),
            productCount: Number(supplier.productCount),
            price: supplier.referencePrice === null ? null : Number(supplier.referencePrice),
            status: 'Disponível',
            products: productsBySupplier.get(Number(supplier.id)) || [],
        })));
      } catch (error) {
        console.error('Erro ao listar fornecedores cadastrados:', error);
        res.status(500).json({ error: 'Erro interno ao listar fornecedores.' });
      }
    });

    app.get('/api/organizadores/:id/eventos/:eventoId/fornecedores', async (req, res) => {
      const organizerId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      if (!organizerId || !eventId) {
        return res.status(400).json({ error: 'Informe IDs válidos para organizador e evento.' });
      }
      try {
        if (!(await requireOrganizer(organizerId, res))) return;
        const [events] = await db.execute(
          'SELECT id FROM evento WHERE id = ? AND organizador_id = ?',
          [eventId, organizerId],
        );
        if (!events.length) return res.status(404).json({ error: 'Evento não encontrado para este organizador.' });
        const [rows] = await db.execute(
          `SELECT u.id, u.nome AS contactName, COALESCE(fd.nome_fantasia, u.nome) AS name,
                  fd.categoria_principal AS category, fd.telefone AS phone,
                  ef.data_vinculo AS linkedAt, COUNT(ps.id) AS productCount,
                  MIN(ps.preco_referencia) AS referencePrice
             FROM evento_fornecedor ef
             JOIN usuario u ON u.id = ef.fornecedor_id AND u.tipo_perfil = 3
             LEFT JOIN fornecedor_detalhes fd ON fd.usuario_id = u.id
             LEFT JOIN produto_servico ps
               ON ps.fornecedor_id = u.id AND ps.status <> 'Inativo'
            WHERE ef.evento_id = ?
            GROUP BY u.id, u.nome, fd.nome_fantasia, fd.categoria_principal,
                     fd.telefone, ef.data_vinculo
            ORDER BY name, u.id`,
          [eventId],
        );
        res.json(rows.map((supplier) => ({
          ...supplier,
          id: Number(supplier.id),
          productCount: Number(supplier.productCount),
          price: supplier.referencePrice === null ? null : Number(supplier.referencePrice),
        })));
      } catch (error) {
        console.error('Erro ao listar fornecedores vinculados:', error);
        res.status(500).json({ error: 'Erro interno ao listar fornecedores do evento.' });
      }
    });

    app.post('/api/organizadores/:id/eventos/:eventoId/fornecedores/:fornecedorId', async (req, res) => {
      const organizerId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      const supplierId = positiveInteger(req.params.fornecedorId);
      if (!organizerId || !eventId || !supplierId) {
        return res.status(400).json({ error: 'Informe IDs válidos para organizador, evento e fornecedor.' });
      }
      try {
        if (!(await requireOrganizer(organizerId, res))) return;
        const [events] = await db.execute(
          'SELECT id FROM evento WHERE id = ? AND organizador_id = ?',
          [eventId, organizerId],
        );
        if (!events.length) return res.status(404).json({ error: 'Evento não encontrado para este organizador.' });
        const [suppliers] = await db.execute(
          `SELECT u.id FROM usuario u JOIN fornecedor_detalhes fd ON fd.usuario_id = u.id
            WHERE u.id = ? AND u.tipo_perfil = 3`,
          [supplierId],
        );
        if (!suppliers.length) return res.status(404).json({ error: 'Fornecedor cadastrado não encontrado.' });
        await db.execute(
          'INSERT IGNORE INTO evento_fornecedor (evento_id, fornecedor_id) VALUES (?, ?)',
          [eventId, supplierId],
        );
        res.status(204).end();
      } catch (error) {
        console.error('Erro ao vincular fornecedor ao evento:', error);
        res.status(500).json({ error: 'Erro interno ao vincular fornecedor.' });
      }
    });

    app.delete('/api/organizadores/:id/eventos/:eventoId/fornecedores/:fornecedorId', async (req, res) => {
      const organizerId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      const supplierId = positiveInteger(req.params.fornecedorId);
      if (!organizerId || !eventId || !supplierId) {
        return res.status(400).json({ error: 'Informe IDs válidos para organizador, evento e fornecedor.' });
      }
      try {
        if (!(await requireOrganizer(organizerId, res))) return;
        const [events] = await db.execute(
          'SELECT id FROM evento WHERE id = ? AND organizador_id = ?',
          [eventId, organizerId],
        );
        if (!events.length) return res.status(404).json({ error: 'Evento não encontrado para este organizador.' });
        await db.execute(
          'DELETE FROM evento_fornecedor WHERE evento_id = ? AND fornecedor_id = ?',
          [eventId, supplierId],
        );
        res.status(204).end();
      } catch (error) {
        console.error('Erro ao remover fornecedor do evento:', error);
        res.status(500).json({ error: 'Erro interno ao remover fornecedor do evento.' });
      }
    });

    app.get('/api/fornecedores/:id/produtos', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        const [rows] = await db.execute(
          `${productSelect} WHERE fornecedor_id = ? ORDER BY id DESC`,
          [supplierId],
        );
        res.json(rows.map(productFromRow));
      } catch (error) {
        console.error('Erro ao listar produtos do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao listar o inventário.' });
      }
    });

    app.post('/api/fornecedores/:id/produtos', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      const validationError = productInputError(req.body);
      if (validationError) return res.status(400).json({ error: validationError });
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        const { name, version, category, type, unit, price, cost, status, description, specs } = req.body;
        const sku = (req.body.sku || `TT-${supplierId}-${Date.now()}`).trim();
        const [result] = await db.execute(
          `INSERT INTO produto_servico
            (fornecedor_id, sku, nome, versao, categoria, tipo, unidade, preco_referencia,
             custo_direto, status, descricao, especificacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            supplierId, sku, name.trim(), version || null, category.trim(), type.trim(), unit.trim(),
            Number(price), cost === '' || cost === undefined ? 0 : Number(cost),
            status || 'Disponível', description || '', JSON.stringify(specs || []),
          ],
        );
        const [rows] = await db.execute(`${productSelect} WHERE id = ? AND fornecedor_id = ?`, [
          result.insertId,
          supplierId,
        ]);
        res.status(201).json(productFromRow(rows[0]));
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Este SKU já está cadastrado.' });
        console.error('Erro ao cadastrar produto do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao cadastrar o item.' });
      }
    });

    app.put('/api/fornecedores/:id/produtos/:produtoId', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      const productId = positiveInteger(req.params.produtoId);
      if (!supplierId || !productId) {
        return res.status(400).json({ error: 'Informe IDs válidos para fornecedor e produto.' });
      }
      const validationError = productInputError(req.body);
      if (validationError) return res.status(400).json({ error: validationError });
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        const { name, version, category, type, unit, price, cost, status, description, specs } = req.body;
        const [result] = await db.execute(
          `UPDATE produto_servico
              SET sku = ?, nome = ?, versao = ?, categoria = ?, tipo = ?, unidade = ?,
                  preco_referencia = ?, custo_direto = ?, status = ?, descricao = ?, especificacoes = ?
            WHERE id = ? AND fornecedor_id = ?`,
          [
            (req.body.sku || `TT-${supplierId}-${productId}`).trim(), name.trim(), version || null,
            category.trim(), type.trim(), unit.trim(), Number(price),
            cost === '' || cost === undefined ? 0 : Number(cost), status || 'Disponível',
            description || '', JSON.stringify(specs || []), productId, supplierId,
          ],
        );
        if (!result.affectedRows) {
          const [existing] = await db.execute(
            'SELECT id FROM produto_servico WHERE id = ? AND fornecedor_id = ?',
            [productId, supplierId],
          );
          if (!existing.length) return res.status(404).json({ error: 'Item não encontrado neste inventário.' });
        }
        const [rows] = await db.execute(`${productSelect} WHERE id = ? AND fornecedor_id = ?`, [
          productId,
          supplierId,
        ]);
        res.json(productFromRow(rows[0]));
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Este SKU já está cadastrado.' });
        console.error('Erro ao atualizar produto do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar o item.' });
      }
    });

    async function listSupplierOpportunities(supplierId = null) {
      const [rows] = await db.execute(
        `SELECT e.id, e.titulo AS title, e.categoria AS category, e.formato AS format,
                DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS \`date\`,
                DATE_FORMAT(e.data_fim, '%Y-%m-%d') AS endDate,
                TIME_FORMAT(e.horario_inicio, '%H:%i') AS \`time\`,
                TIME_FORMAT(e.horario_termino, '%H:%i') AS endTime,
                e.\`local\` AS location, e.capacidade AS capacity, e.preco_base AS price,
                e.descricao AS description, u.nome AS organizer,
                od.nome_organizacao AS organization,
                p.id AS proposalId, p.status AS proposalStatus,
                p.valor_total AS proposalTotal, p.codigo_protocolo AS protocol,
                DATE_FORMAT(p.data_envio, '%Y-%m-%d') AS proposalDate
           FROM evento e
           JOIN usuario u ON u.id = e.organizador_id
           LEFT JOIN organizador_detalhes od ON od.usuario_id = u.id
           LEFT JOIN proposta p ON p.id = (
              SELECT p2.id FROM proposta p2
               WHERE p2.evento_id = e.id AND p2.fornecedor_id = ?
               ORDER BY p2.id DESC LIMIT 1
           )
          WHERE e.status = 'Publicado' AND e.data_fim >= CURRENT_DATE
          ORDER BY e.data_inicio, e.id`,
        [supplierId],
      );
      return rows.map(supplierEventFromRow);
    }

    app.get('/api/oportunidades', async (req, res) => {
      try {
        res.json(await listSupplierOpportunities(null));
      } catch (error) {
        console.error('Erro ao listar eventos disponíveis para fornecedores:', error);
        res.status(500).json({ error: 'Erro interno ao listar eventos disponíveis.' });
      }
    });

    app.get('/api/fornecedores/:id/oportunidades', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        res.json(await listSupplierOpportunities(supplierId));
      } catch (error) {
        console.error('Erro ao listar oportunidades do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao listar oportunidades.' });
      }
    });

    app.get('/api/fornecedores/:id/propostas', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        const [rows] = await db.execute(
          `SELECT p.id, p.codigo_protocolo AS protocol, p.evento_id AS eventId,
                  p.status, p.valor_total AS total, p.condicao_pagamento AS payment,
                  p.observacoes AS note, DATE_FORMAT(p.data_envio, '%Y-%m-%d') AS date,
                  e.titulo AS title, e.categoria AS category, e.\`local\` AS location,
                  DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS eventDate,
                  u.nome AS organizer
             FROM proposta p JOIN evento e ON e.id = p.evento_id
             JOIN usuario u ON u.id = e.organizador_id
            WHERE p.fornecedor_id = ? ORDER BY p.data_envio DESC, p.id DESC`,
          [supplierId],
        );
        const proposalIds = rows.map((proposal) => proposal.id);
        const itemsByProposal = new Map();
        if (proposalIds.length) {
          const placeholders = proposalIds.map(() => '?').join(', ');
          const [items] = await db.execute(
            `SELECT proposta_id AS proposalId, produto_servico_id AS productId,
                    nome_item AS name, quantidade AS qty, unidade AS unit,
                    valor_unitario AS price
               FROM item_proposta WHERE proposta_id IN (${placeholders}) ORDER BY id`,
            proposalIds,
          );
          for (const item of items) {
            const list = itemsByProposal.get(item.proposalId) || [];
            list.push({ ...item, price: Number(item.price) });
            itemsByProposal.set(item.proposalId, list);
          }
        }
        res.json(rows.map((proposal) => ({
          ...proposal,
          total: Number(proposal.total),
          items: itemsByProposal.get(proposal.id) || [],
          description: (itemsByProposal.get(proposal.id) || []).map((item) => item.name).join(', '),
        })));
      } catch (error) {
        console.error('Erro ao listar propostas do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao listar propostas.' });
      }
    });

    app.post('/api/fornecedores/:id/propostas', async (req, res) => {
      const supplierId = positiveInteger(req.params.id);
      if (!supplierId) return res.status(400).json({ error: 'Informe um ID de fornecedor válido.' });
      const eventId = positiveInteger(req.body.eventId);
      const proposalId = req.body.proposalId ? positiveInteger(req.body.proposalId) : null;
      const { items, status, payment = '', note = '' } = req.body;
      if (!eventId || !['Rascunho', 'Em análise'].includes(status) ||
          !Array.isArray(items) || !items.length || items.length > 100 ||
          typeof payment !== 'string' || payment.length > 255 ||
          typeof note !== 'string' || note.length > 10000) {
        return res.status(400).json({ error: 'Os dados da proposta são inválidos.' });
      }
      const normalizedItems = [];
      let totalCents = 0;
      const productIds = new Set();
      for (const item of items) {
        const productId = positiveInteger(item.productId);
        const quantity = Number(item.qty);
        const priceCents = Math.round(Number(item.price) * 100);
        if (!productId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647 ||
            !Number.isFinite(Number(item.price)) || priceCents < 1 || priceCents > 9999999999 ||
            productIds.has(productId)) {
          return res.status(400).json({ error: 'Revise os produtos, quantidades e valores da proposta.' });
        }
        productIds.add(productId);
        const lineTotal = quantity * priceCents;
        if (!Number.isSafeInteger(lineTotal) || totalCents + lineTotal > 9999999999) {
          return res.status(400).json({ error: 'O total da proposta excede o limite permitido.' });
        }
        totalCents += lineTotal;
        normalizedItems.push({ productId, quantity, priceCents });
      }

      let connection;
      try {
        if (!(await requireUserRole(supplierId, 3, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [events] = await connection.execute(
          `SELECT id FROM evento WHERE id = ? AND status = 'Publicado' AND data_fim >= CURRENT_DATE`,
          [eventId],
        );
        if (!events.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Evento não encontrado ou não está aberto para propostas.' });
        }
        const placeholders = normalizedItems.map(() => '?').join(', ');
        const [products] = await connection.execute(
          `SELECT id, nome, unidade FROM produto_servico
            WHERE fornecedor_id = ? AND status <> 'Inativo' AND id IN (${placeholders})`,
          [supplierId, ...normalizedItems.map((item) => item.productId)],
        );
        if (products.length !== normalizedItems.length) {
          await connection.rollback();
          return res.status(400).json({ error: 'Uma ou mais linhas não pertencem ao inventário ativo deste fornecedor.' });
        }
        let activeProposalId = proposalId;
        if (proposalId) {
          const [existing] = await connection.execute(
            `SELECT id FROM proposta
              WHERE id = ? AND fornecedor_id = ? AND evento_id = ? AND status = 'Rascunho'
              FOR UPDATE`,
            [proposalId, supplierId, eventId],
          );
          if (!existing.length) {
            await connection.rollback();
            return res.status(409).json({ error: 'Somente rascunhos próprios podem ser alterados.' });
          }
          await connection.execute(
            `UPDATE proposta SET status = ?, valor_total = ?, condicao_pagamento = ?, observacoes = ?
              WHERE id = ? AND fornecedor_id = ?`,
            [status, totalCents / 100, payment, note, proposalId, supplierId],
          );
          await connection.execute('DELETE FROM item_proposta WHERE proposta_id = ?', [proposalId]);
        } else {
          const [result] = await connection.execute(
            `INSERT INTO proposta
              (codigo_protocolo, evento_id, fornecedor_id, status, valor_total, condicao_pagamento, observacoes)
             VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
            [eventId, supplierId, status, totalCents / 100, payment, note],
          );
          activeProposalId = result.insertId;
          const protocol = `PRP-${activeProposalId}`;
          await connection.execute(
            'UPDATE proposta SET codigo_protocolo = ? WHERE id = ?',
            [protocol, activeProposalId],
          );
        }

        const productById = new Map(products.map((product) => [product.id, product]));
        for (const item of normalizedItems) {
          const product = productById.get(item.productId);
          await connection.execute(
            `INSERT INTO item_proposta
              (proposta_id, produto_servico_id, nome_item, quantidade, unidade, valor_unitario)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              activeProposalId, item.productId, product.nome, item.quantity,
              product.unidade, item.priceCents / 100,
            ],
          );
        }
        await connection.commit();
        res.status(proposalId ? 200 : 201).json({
          id: activeProposalId,
          eventId,
          status,
          total: totalCents / 100,
          payment,
          note,
          items: normalizedItems.map((item) => ({
            productId: item.productId,
            name: productById.get(item.productId).nome,
            qty: item.quantity,
            unit: productById.get(item.productId).unidade,
            price: item.priceCents / 100,
          })),
        });
      } catch (error) {
        await rollbackTransaction(connection);
        console.error('Erro ao salvar proposta do fornecedor:', error);
        res.status(500).json({ error: 'Erro interno ao salvar a proposta.' });
      } finally {
        connection?.release();
      }
    });

    app.get('/api/comunidade/mensagens', async (req, res) => {
      const userId = positiveInteger(req.query.usuarioId);
      if (!userId) return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [rows] = await db.execute(
          `SELECT m.id, m.usuario_id AS userId, m.texto AS text,
                  DATE_FORMAT(m.data_publicacao, '%Y-%m-%d %H:%i') AS date,
                  u.nome AS name, u.url_foto_perfil AS photo
             FROM comunidade_mensagem m
             JOIN usuario u ON u.id = m.usuario_id
            ORDER BY m.data_publicacao DESC, m.id DESC
            LIMIT 100`,
        );
        res.json(rows);
      } catch (error) {
        console.error('Erro ao carregar mensagens da comunidade:', error);
        res.status(500).json({ error: 'Erro interno ao carregar as mensagens.' });
      }
    });

    app.post('/api/comunidade/mensagens', async (req, res) => {
      const userId = positiveInteger(req.body.userId);
      const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
      if (!userId || !text || text.length > 500) {
        return res.status(400).json({ error: 'Informe uma mensagem com até 500 caracteres.' });
      }
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [result] = await db.execute(
          'INSERT INTO comunidade_mensagem (usuario_id, texto) VALUES (?, ?)',
          [userId, text],
        );
        const [rows] = await db.execute(
          `SELECT m.id, m.usuario_id AS userId, m.texto AS text,
                  DATE_FORMAT(m.data_publicacao, '%Y-%m-%d %H:%i') AS date,
                  u.nome AS name, u.url_foto_perfil AS photo
             FROM comunidade_mensagem m
             JOIN usuario u ON u.id = m.usuario_id
            WHERE m.id = ?`,
          [result.insertId],
        );
        res.status(201).json(rows[0]);
      } catch (error) {
        console.error('Erro ao publicar mensagem da comunidade:', error);
        res.status(500).json({ error: 'Erro interno ao publicar a mensagem.' });
      }
    });

    app.delete('/api/comunidade/mensagens/:id', async (req, res) => {
      const messageId = positiveInteger(req.params.id);
      const userId = positiveInteger(req.body.userId);
      if (!messageId || !userId) {
        return res.status(400).json({ error: 'Informe IDs válidos para usuário e mensagem.' });
      }
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [result] = await db.execute(
          'DELETE FROM comunidade_mensagem WHERE id = ? AND usuario_id = ?',
          [messageId, userId],
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Mensagem não encontrada.' });
        res.status(204).end();
      } catch (error) {
        console.error('Erro ao remover mensagem da comunidade:', error);
        res.status(500).json({ error: 'Erro interno ao remover a mensagem.' });
      }
    });

    app.get('/api/usuarios/:id/ingressos', async (req, res) => {
      const userId = positiveInteger(req.params.id);
      if (!userId) return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [rows] = await db.execute(
          `SELECT i.id, i.codigo_ingresso AS code, i.evento_id AS eventId,
                  i.tipo_ingresso AS type, i.preco AS price, i.status,
                  i.disponivel_troca AS availableForExchange,
                  e.titulo AS eventTitle, e.imagem_capa_url AS image,
                  DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS eventDate,
                  e.\`local\` AS location
             FROM ingresso i JOIN evento e ON e.id = i.evento_id
            WHERE i.dono_atual_id = ?
            ORDER BY i.data_compra DESC, i.id DESC`,
          [userId],
        );
        res.json(rows.map(ticketFromRow));
      } catch (error) {
        console.error('Erro ao carregar ingressos do participante:', error);
        res.status(500).json({ error: 'Erro interno ao carregar os ingressos.' });
      }
    });

    app.post('/api/eventos/:id/ingressos', async (req, res) => {
      const eventId = positiveInteger(req.params.id);
      const userId = positiveInteger(req.body.userId);
      const quantity = Number(req.body.quantity);
      const type = req.body.type;
      if (!eventId || !userId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 6 ||
          !['Inteira', 'Meia-entrada'].includes(type)) {
        return res.status(400).json({ error: 'Informe evento, tipo de ingresso e quantidade válidos (1 a 6).' });
      }

      let connection;
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [events] = await connection.execute(
          `SELECT id, titulo AS eventTitle, imagem_capa_url AS image,
                  DATE_FORMAT(data_inicio, '%Y-%m-%d') AS eventDate,
                  \`local\` AS location, capacidade AS capacity, preco_base AS price
             FROM evento
            WHERE id = ? AND status = 'Publicado' AND data_fim >= CURRENT_DATE
            FOR UPDATE`,
          [eventId],
        );
        if (!events.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Evento não encontrado ou indisponível para reserva.' });
        }
        const event = events[0];
        const [counts] = await connection.execute(
          `SELECT COUNT(*) AS sold FROM ingresso
            WHERE evento_id = ? AND status = 'A'`,
          [eventId],
        );
        const sold = Number(counts[0].sold);
        if (event.capacity !== null && quantity > Number(event.capacity) - sold) {
          await connection.rollback();
          return res.status(409).json({ error: 'Não há ingressos suficientes para a quantidade solicitada.' });
        }

        const unitPriceCents = Math.round(Number(event.price) * (type === 'Meia-entrada' ? 50 : 100));
        if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0 || unitPriceCents > 9999999999) {
          await connection.rollback();
          return res.status(400).json({ error: 'O preço cadastrado para o evento é inválido.' });
        }
        const ticketIds = [];
        for (let index = 0; index < quantity; index += 1) {
          const code = `TT-${eventId}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
          const [result] = await connection.execute(
            `INSERT INTO ingresso
              (codigo_ingresso, evento_id, dono_atual_id, tipo_ingresso, preco, status, disponivel_troca)
             VALUES (?, ?, ?, ?, ?, 'A', FALSE)`,
            [code, eventId, userId, type, unitPriceCents / 100],
          );
          ticketIds.push(result.insertId);
        }
        const placeholders = ticketIds.map(() => '?').join(', ');
        const [rows] = await connection.execute(
          `SELECT i.id, i.codigo_ingresso AS code, i.evento_id AS eventId,
                  i.tipo_ingresso AS type, i.preco AS price, i.status,
                  i.disponivel_troca AS availableForExchange,
                  ? AS eventTitle, ? AS image, ? AS eventDate, ? AS location
             FROM ingresso i WHERE i.id IN (${placeholders}) ORDER BY i.id`,
          [event.eventTitle, event.image, event.eventDate, event.location, ...ticketIds],
        );
        await connection.commit();
        res.status(201).json({ tickets: rows.map(ticketFromRow), simulated: true });
      } catch (error) {
        await rollbackTransaction(connection);
        console.error('Erro ao criar reserva simulada:', error);
        res.status(500).json({ error: 'Erro interno ao salvar os ingressos.' });
      } finally {
        connection?.release();
      }
    });

    app.put('/api/ingressos/:id/cancelar', async (req, res) => {
      const ticketId = positiveInteger(req.params.id);
      const userId = positiveInteger(req.body.userId);
      if (!ticketId || !userId) return res.status(400).json({ error: 'Informe IDs válidos para usuário e ingresso.' });
      let connection;
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [tickets] = await connection.execute(
          `SELECT id, status FROM ingresso
            WHERE id = ? AND dono_atual_id = ? FOR UPDATE`,
          [ticketId, userId],
        );
        if (!tickets.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Ingresso não encontrado nesta conta.' });
        }
        if (tickets[0].status !== 'A') {
          await connection.rollback();
          return res.status(409).json({ error: 'Somente ingressos ativos podem ser cancelados.' });
        }
        await connection.execute(
          `UPDATE troca_ingresso SET status = 'Cancelada', data_resposta = CURRENT_TIMESTAMP
            WHERE status = 'Pendente'
              AND (ingresso_solicitado_id = ? OR ingresso_ofertado_id = ?)`,
          [ticketId, ticketId],
        );
        await connection.execute(
          `UPDATE ingresso SET status = 'C', disponivel_troca = FALSE
            WHERE id = ? AND dono_atual_id = ?`,
          [ticketId, userId],
        );
        await connection.commit();
        res.status(204).end();
      } catch (error) {
        await rollbackTransaction(connection);
        console.error('Erro ao cancelar ingresso simulado:', error);
        res.status(500).json({ error: 'Erro interno ao cancelar o ingresso.' });
      } finally {
        connection?.release();
      }
    });

    app.get('/api/trocas/ingressos', async (req, res) => {
      const userId = positiveInteger(req.query.usuarioId);
      if (!userId) return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [rows] = await db.execute(
          `SELECT i.id AS ticketId, i.codigo_ingresso AS code, i.evento_id AS eventId,
                  i.tipo_ingresso AS type, i.preco AS price,
                  e.titulo AS eventTitle, e.imagem_capa_url AS image,
                  DATE_FORMAT(e.data_inicio, '%Y-%m-%d') AS eventDate,
                  e.\`local\` AS location, u.nome AS ownerName
             FROM ingresso i
             JOIN evento e ON e.id = i.evento_id
             JOIN usuario u ON u.id = i.dono_atual_id
            WHERE i.status = 'A' AND i.disponivel_troca = TRUE
              AND i.dono_atual_id <> ? AND e.status = 'Publicado'
              AND e.data_fim >= CURRENT_DATE
            ORDER BY e.data_inicio, i.id`,
          [userId],
        );
        res.json(rows.map((row) => ({
          ...row,
          ticketId: Number(row.ticketId),
          eventId: Number(row.eventId),
          price: Number(row.price),
        })));
      } catch (error) {
        console.error('Erro ao carregar ingressos disponíveis para troca:', error);
        res.status(500).json({ error: 'Erro interno ao carregar as ofertas de troca.' });
      }
    });

    app.put('/api/ingressos/:id/troca', async (req, res) => {
      const ticketId = positiveInteger(req.params.id);
      const userId = positiveInteger(req.body.userId);
      const available = req.body.available;
      if (!ticketId || !userId || typeof available !== 'boolean') {
        return res.status(400).json({ error: 'Informe ingresso, usuário e disponibilidade de troca válidos.' });
      }
      let connection;
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [tickets] = await connection.execute(
          `SELECT id, status FROM ingresso
            WHERE id = ? AND dono_atual_id = ? FOR UPDATE`,
          [ticketId, userId],
        );
        if (!tickets.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Ingresso não encontrado nesta conta.' });
        }
        if (tickets[0].status !== 'A') {
          await connection.rollback();
          return res.status(409).json({ error: 'Somente ingressos ativos podem ser oferecidos para troca.' });
        }
        if (!available) {
          await connection.execute(
            `UPDATE troca_ingresso SET status = 'Cancelada', data_resposta = CURRENT_TIMESTAMP
              WHERE status = 'Pendente'
                AND (ingresso_solicitado_id = ? OR ingresso_ofertado_id = ?)`,
            [ticketId, ticketId],
          );
        }
        await connection.execute(
          'UPDATE ingresso SET disponivel_troca = ? WHERE id = ? AND dono_atual_id = ?',
          [available, ticketId, userId],
        );
        await connection.commit();
        res.status(204).end();
      } catch (error) {
        await rollbackTransaction(connection);
        console.error('Erro ao atualizar disponibilidade para troca:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar a oferta de troca.' });
      } finally {
        connection?.release();
      }
    });

    app.get('/api/usuarios/:id/trocas', async (req, res) => {
      const userId = positiveInteger(req.params.id);
      if (!userId) return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [rows] = await db.execute(
          `SELECT t.id, t.status, t.solicitante_id AS requesterId,
                  t.ingresso_solicitado_id AS requestedTicketId,
                  t.ingresso_ofertado_id AS offeredTicketId,
                  DATE_FORMAT(t.data_solicitacao, '%Y-%m-%d %H:%i') AS date,
                  u.nome AS requesterName,
                  requested.codigo_ingresso AS requestedCode,
                  requested.evento_id AS requestedEventId,
                  requested.tipo_ingresso AS requestedType,
                  requested.preco AS requestedPrice,
                  requestedEvent.titulo AS requestedEventTitle,
                  requested.dono_atual_id AS requestedOwnerId,
                  offered.codigo_ingresso AS offeredCode,
                  offered.evento_id AS offeredEventId,
                  offered.tipo_ingresso AS offeredType,
                  offered.preco AS offeredPrice,
                  offeredEvent.titulo AS offeredEventTitle
             FROM troca_ingresso t
             JOIN usuario u ON u.id = t.solicitante_id
             JOIN ingresso requested ON requested.id = t.ingresso_solicitado_id
             JOIN evento requestedEvent ON requestedEvent.id = requested.evento_id
             JOIN ingresso offered ON offered.id = t.ingresso_ofertado_id
             JOIN evento offeredEvent ON offeredEvent.id = offered.evento_id
            WHERE t.solicitante_id = ? OR requested.dono_atual_id = ?
            ORDER BY t.data_solicitacao DESC, t.id DESC`,
          [userId, userId],
        );
        res.json(rows.map((row) => ({
          ...row,
          id: Number(row.id),
          requesterId: Number(row.requesterId),
          requestedTicketId: Number(row.requestedTicketId),
          offeredTicketId: Number(row.offeredTicketId),
          requestedEventId: Number(row.requestedEventId),
          offeredEventId: Number(row.offeredEventId),
          requestedOwnerId: Number(row.requestedOwnerId),
          requestedPrice: Number(row.requestedPrice),
          offeredPrice: Number(row.offeredPrice),
          direction: Number(row.requestedOwnerId) === userId ? 'recebida' : 'enviada',
        })));
      } catch (error) {
        console.error('Erro ao carregar solicitações de troca:', error);
        res.status(500).json({ error: 'Erro interno ao carregar as solicitações de troca.' });
      }
    });

    app.post('/api/trocas', async (req, res) => {
      const userId = positiveInteger(req.body.userId);
      const requestedTicketId = positiveInteger(req.body.requestedTicketId);
      const offeredTicketId = positiveInteger(req.body.offeredTicketId);
      if (!userId || !requestedTicketId || !offeredTicketId || requestedTicketId === offeredTicketId) {
        return res.status(400).json({ error: 'Selecione dois ingressos diferentes para propor a troca.' });
      }
      let connection;
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [tickets] = await connection.execute(
          `SELECT id, dono_atual_id AS ownerId, status, disponivel_troca AS available
             FROM ingresso WHERE id IN (?, ?) ORDER BY id FOR UPDATE`,
          [requestedTicketId, offeredTicketId],
        );
        const requested = tickets.find((ticket) => Number(ticket.id) === requestedTicketId);
        const offered = tickets.find((ticket) => Number(ticket.id) === offeredTicketId);
        if (!requested || !offered) {
          await connection.rollback();
          return res.status(404).json({ error: 'Um dos ingressos selecionados não foi encontrado.' });
        }
        if (Number(offered.ownerId) !== userId || Number(requested.ownerId) === userId) {
          await connection.rollback();
          return res.status(403).json({ error: 'Você só pode oferecer ingressos da sua conta a outra pessoa.' });
        }
        if (requested.status !== 'A' || offered.status !== 'A' || !requested.available) {
          await connection.rollback();
          return res.status(409).json({ error: 'Um dos ingressos não está mais disponível para troca.' });
        }
        const [pending] = await connection.execute(
          `SELECT id FROM troca_ingresso
            WHERE status = 'Pendente'
              AND (ingresso_ofertado_id = ? OR
                   (ingresso_solicitado_id = ? AND solicitante_id = ?))
            LIMIT 1 FOR UPDATE`,
          [offeredTicketId, requestedTicketId, userId],
        );
        if (pending.length) {
          await connection.rollback();
          return res.status(409).json({ error: 'Este ingresso já está envolvido em uma solicitação pendente.' });
        }
        const [result] = await connection.execute(
          `INSERT INTO troca_ingresso
            (ingresso_solicitado_id, ingresso_ofertado_id, solicitante_id, status)
           VALUES (?, ?, ?, 'Pendente')`,
          [requestedTicketId, offeredTicketId, userId],
        );
        await connection.commit();
        res.status(201).json({ id: Number(result.insertId), status: 'Pendente' });
      } catch (error) {
        await rollbackTransaction(connection);
        console.error('Erro ao criar solicitação de troca:', error);
        res.status(500).json({ error: 'Erro interno ao enviar a solicitação de troca.' });
      } finally {
        connection?.release();
      }
    });

    app.put('/api/trocas/:id', async (req, res) => {
      const offerId = positiveInteger(req.params.id);
      const userId = positiveInteger(req.body.userId);
      const action = req.body.action;
      if (!offerId || !userId || !['aceitar', 'recusar', 'cancelar'].includes(action)) {
        return res.status(400).json({ error: 'Informe uma ação válida para a solicitação de troca.' });
      }
      let connection;
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [offers] = await connection.execute(
          `SELECT id, ingresso_solicitado_id AS requestedTicketId,
                  ingresso_ofertado_id AS offeredTicketId,
                  solicitante_id AS requesterId, status
             FROM troca_ingresso WHERE id = ? FOR UPDATE`,
          [offerId],
        );
        const offer = offers[0];
        if (!offer) {
          await connection.rollback();
          return res.status(404).json({ error: 'Solicitação de troca não encontrada.' });
        }
        if (offer.status !== 'Pendente') {
          await connection.rollback();
          return res.status(409).json({ error: 'Esta solicitação já foi encerrada.' });
        }
        const requestedTicketId = Number(offer.requestedTicketId);
        const offeredTicketId = Number(offer.offeredTicketId);
        const requesterId = Number(offer.requesterId);
        const [tickets] = await connection.execute(
          `SELECT id, dono_atual_id AS ownerId, status, disponivel_troca AS available
             FROM ingresso WHERE id IN (?, ?) ORDER BY id FOR UPDATE`,
          [requestedTicketId, offeredTicketId],
        );
        const requested = tickets.find((ticket) => Number(ticket.id) === requestedTicketId);
        const offered = tickets.find((ticket) => Number(ticket.id) === offeredTicketId);
        const ownsRequested = requested && Number(requested.ownerId) === userId;
        if (action === 'cancelar' ? requesterId !== userId : !ownsRequested) {
          await connection.rollback();
          return res.status(403).json({ error: 'Você não pode responder a esta solicitação.' });
        }
        if (action === 'aceitar') {
          if (!requested || !offered || requested.status !== 'A' || offered.status !== 'A' ||
              Number(offered.ownerId) !== requesterId || !requested.available) {
            await connection.rollback();
            return res.status(409).json({ error: 'Os ingressos não estão mais disponíveis para concluir a troca.' });
          }
          await connection.execute(
            `UPDATE ingresso
                SET dono_atual_id = CASE id WHEN ? THEN ? WHEN ? THEN ? END,
                    disponivel_troca = FALSE
              WHERE id IN (?, ?)`,
            [requestedTicketId, requesterId, offeredTicketId, userId, requestedTicketId, offeredTicketId],
          );
          await connection.execute(
            `UPDATE troca_ingresso
                SET status = 'Cancelada', data_resposta = CURRENT_TIMESTAMP
              WHERE status = 'Pendente' AND id <> ?
                AND (ingresso_solicitado_id IN (?, ?) OR ingresso_ofertado_id IN (?, ?))`,
            [offerId, requestedTicketId, offeredTicketId, requestedTicketId, offeredTicketId],
          );
        }
        const nextStatus = action === 'aceitar'
          ? 'Aceita'
          : action === 'recusar' ? 'Recusada' : 'Cancelada';
        await connection.execute(
          'UPDATE troca_ingresso SET status = ?, data_resposta = CURRENT_TIMESTAMP WHERE id = ?',
          [nextStatus, offerId],
        );
        await connection.commit();
        res.json({ id: offerId, status: nextStatus });
      } catch (error) {
        await rollbackTransaction(connection);
        console.error('Erro ao responder à solicitação de troca:', error);
        res.status(500).json({ error: 'Erro interno ao responder à solicitação de troca.' });
      } finally {
        connection?.release();
      }
    });

    app.get('/api/usuarios/:id/favoritos', async (req, res) => {
      const userId = positiveInteger(req.params.id);
      if (!userId) return res.status(400).json({ error: 'Informe um ID de usuário válido.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [rows] = await db.execute(
          `SELECT f.evento_id AS id FROM evento_favorito f
           JOIN evento e ON e.id = f.evento_id
           WHERE f.usuario_id = ? AND e.status = 'Publicado'
           ORDER BY f.data_favorito DESC`,
          [userId],
        );
        res.json(rows.map((row) => row.id));
      } catch (error) {
        console.error('Erro ao carregar favoritos:', error);
        res.status(500).json({ error: 'Erro interno ao carregar os favoritos.' });
      }
    });

    app.post('/api/usuarios/:id/favoritos/:eventoId', async (req, res) => {
      const userId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      if (!userId || !eventId) return res.status(400).json({ error: 'Informe IDs válidos para usuário e evento.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [events] = await db.execute(
          `SELECT id FROM evento WHERE id = ? AND status = 'Publicado'`,
          [eventId],
        );
        if (!events.length) return res.status(404).json({ error: 'Evento publicado não encontrado.' });
        await db.execute(
          'INSERT IGNORE INTO evento_favorito (usuario_id, evento_id) VALUES (?, ?)',
          [userId, eventId],
        );
        res.status(204).end();
      } catch (error) {
        console.error('Erro ao salvar evento favorito:', error);
        res.status(500).json({ error: 'Erro interno ao salvar o favorito.' });
      }
    });

    app.delete('/api/usuarios/:id/favoritos/:eventoId', async (req, res) => {
      const userId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      if (!userId || !eventId) return res.status(400).json({ error: 'Informe IDs válidos para usuário e evento.' });
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        await db.execute(
          'DELETE FROM evento_favorito WHERE usuario_id = ? AND evento_id = ?',
          [userId, eventId],
        );
        res.status(204).end();
      } catch (error) {
        console.error('Erro ao remover evento dos favoritos:', error);
        res.status(500).json({ error: 'Erro interno ao remover o favorito.' });
      }
    });

    app.get('/api/eventos/:id/avaliacoes', async (req, res) => {
      const eventId = positiveInteger(req.params.id);
      if (!eventId) return res.status(400).json({ error: 'Informe um ID de evento válido.' });
      try {
        const [rows] = await db.execute(
          `SELECT a.id, a.usuario_id AS userId, a.nota AS rating,
                  a.comentario AS comment,
                  DATE_FORMAT(a.data_avaliacao, '%Y-%m-%d') AS date,
                  u.nome AS name, u.url_foto_perfil AS photo
             FROM avaliacao a JOIN usuario u ON u.id = a.usuario_id
            WHERE a.evento_id = ? ORDER BY a.data_avaliacao DESC, a.id DESC`,
          [eventId],
        );
        const reviews = rows.map((review) => ({ ...review, rating: Number(review.rating) }));
        const average = reviews.length
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0;
        res.json({ average: Math.round(average * 10) / 10, count: reviews.length, reviews });
      } catch (error) {
        console.error('Erro ao listar avaliações do evento:', error);
        res.status(500).json({ error: 'Erro interno ao carregar avaliações.' });
      }
    });

    app.post('/api/eventos/:id/avaliacoes', async (req, res) => {
      const eventId = positiveInteger(req.params.id);
      const userId = positiveInteger(req.body.userId);
      const rating = Number(req.body.rating);
      const comment = req.body.comment ?? '';
      if (!eventId || !userId || !Number.isInteger(rating) || rating < 1 || rating > 5 ||
          typeof comment !== 'string' || comment.length > 255) {
        return res.status(400).json({ error: 'Informe nota entre 1 e 5 e comentário de até 255 caracteres.' });
      }
      try {
        if (!(await requireUserRole(userId, 1, res))) return;
        const [events] = await db.execute('SELECT id FROM evento WHERE id = ?', [eventId]);
        if (!events.length) return res.status(404).json({ error: 'Evento não encontrado.' });
        const [existing] = await db.execute(
          `SELECT id FROM avaliacao
            WHERE evento_id = ? AND usuario_id = ?
            ORDER BY data_avaliacao DESC, id DESC LIMIT 1`,
          [eventId, userId],
        );
        if (existing.length) {
          await db.execute(
            'UPDATE avaliacao SET nota = ?, comentario = ?, data_avaliacao = CURRENT_TIMESTAMP WHERE id = ?',
            [rating, comment.trim(), existing[0].id],
          );
        } else {
          await db.execute(
            'INSERT INTO avaliacao (evento_id, usuario_id, nota, comentario) VALUES (?, ?, ?, ?)',
            [eventId, userId, rating, comment.trim()],
          );
        }
        const [rows] = await db.execute(
          `SELECT a.id, a.usuario_id AS userId, a.nota AS rating,
                  a.comentario AS comment,
                  DATE_FORMAT(a.data_avaliacao, '%Y-%m-%d') AS date,
                  u.nome AS name, u.url_foto_perfil AS photo
             FROM avaliacao a JOIN usuario u ON u.id = a.usuario_id
            WHERE a.evento_id = ? ORDER BY a.data_avaliacao DESC, a.id DESC`,
          [eventId],
        );
        const reviews = rows.map((review) => ({ ...review, rating: Number(review.rating) }));
        const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        res.json({ average: Math.round(average * 10) / 10, count: reviews.length, reviews });
      } catch (error) {
        console.error('Erro ao salvar avaliação do evento:', error);
        res.status(500).json({ error: 'Erro interno ao salvar a avaliação.' });
      }
    });

    app.get('/api/organizadores/:id/eventos/:eventoId/propostas', async (req, res) => {
      const organizerId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      if (!organizerId || !eventId) {
        return res.status(400).json({ error: 'Informe IDs válidos para organizador e evento.' });
      }
      try {
        if (!(await requireOrganizer(organizerId, res))) return;
        const [events] = await db.execute(
          'SELECT id FROM evento WHERE id = ? AND organizador_id = ?',
          [eventId, organizerId],
        );
        if (!events.length) return res.status(404).json({ error: 'Evento não encontrado para este organizador.' });
        const [rows] = await db.execute(
          `SELECT p.id, p.evento_id AS eventId, p.codigo_protocolo AS protocol,
                  p.status, p.valor_total AS total, p.condicao_pagamento AS payment,
                  p.observacoes AS note, DATE_FORMAT(p.data_envio, '%Y-%m-%d') AS date,
                  u.id AS supplierId, u.nome AS supplierContact,
                  fd.nome_fantasia AS supplierName, fd.categoria_principal AS category
             FROM proposta p
             JOIN usuario u ON u.id = p.fornecedor_id
             LEFT JOIN fornecedor_detalhes fd ON fd.usuario_id = u.id
            WHERE p.evento_id = ? AND p.status <> 'Rascunho'
            ORDER BY p.data_envio DESC, p.id DESC`,
          [eventId],
        );
        const proposalIds = rows.map((proposal) => proposal.id);
        const itemsByProposal = new Map();
        if (proposalIds.length) {
          const placeholders = proposalIds.map(() => '?').join(', ');
          const [items] = await db.execute(
            `SELECT proposta_id AS proposalId, nome_item AS name, quantidade AS qty,
                    unidade AS unit, valor_unitario AS price
               FROM item_proposta WHERE proposta_id IN (${placeholders}) ORDER BY id`,
            proposalIds,
          );
          for (const item of items) {
            const proposalItems = itemsByProposal.get(item.proposalId) || [];
            proposalItems.push({ ...item, price: Number(item.price) });
            itemsByProposal.set(item.proposalId, proposalItems);
          }
        }
        res.json(rows.map((proposal) => ({
          ...proposal,
          supplierName: proposal.supplierName || proposal.supplierContact,
          total: Number(proposal.total),
          items: itemsByProposal.get(proposal.id) || [],
        })));
      } catch (error) {
        console.error('Erro ao listar propostas recebidas:', error);
        res.status(500).json({ error: 'Erro interno ao listar propostas recebidas.' });
      }
    });

    app.put('/api/organizadores/:id/eventos/:eventoId/propostas/:propostaId', async (req, res) => {
      const organizerId = positiveInteger(req.params.id);
      const eventId = positiveInteger(req.params.eventoId);
      const proposalId = positiveInteger(req.params.propostaId);
      const { status } = req.body;
      if (!organizerId || !eventId || !proposalId ||
          !['Aprovada', 'Não selecionada'].includes(status)) {
        return res.status(400).json({ error: 'Informe IDs válidos e um status permitido para a proposta.' });
      }
      try {
        if (!(await requireOrganizer(organizerId, res))) return;
        const [result] = await db.execute(
          `UPDATE proposta p
             JOIN evento e ON e.id = p.evento_id
              SET p.status = ?
            WHERE p.id = ? AND p.evento_id = ? AND e.organizador_id = ? AND p.status = 'Em análise'`,
          [status, proposalId, eventId, organizerId],
        );
        if (!result.affectedRows) {
          const [existing] = await db.execute(
            `SELECT p.status FROM proposta p JOIN evento e ON e.id = p.evento_id
              WHERE p.id = ? AND p.evento_id = ? AND e.organizador_id = ?`,
            [proposalId, eventId, organizerId],
          );
          if (!existing.length) return res.status(404).json({ error: 'Proposta não encontrada neste evento.' });
          if (existing[0].status !== status) {
            return res.status(409).json({ error: 'A proposta não está mais pendente de análise.' });
          }
        }
        res.json({ id: proposalId, status });
      } catch (error) {
        console.error('Erro ao atualizar proposta recebida:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar a proposta.' });
      }
    });

    app.put('/api/usuarios/:id/senha', async (req, res) => {
      const userId = positiveInteger(req.params.id);
      const { senhaAtual, novaSenha } = req.body;
      if (!userId || typeof senhaAtual !== 'string' || typeof novaSenha !== 'string' || novaSenha.length < 8) {
        return res.status(400).json({ error: 'Informe a senha atual e uma nova senha com pelo menos 8 caracteres.' });
      }
      try {
        const [rows] = await db.execute('SELECT senha_hash FROM usuario WHERE id = ?', [userId]);
        if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado.' });
        const currentMatches =
          rows[0].senha_hash === senhaAtual ||
          (await bcrypt.compare(senhaAtual, rows[0].senha_hash).catch(() => false));
        if (!currentMatches) return res.status(400).json({ error: 'A senha atual está incorreta.' });
        const hash = await bcrypt.hash(novaSenha, 10);
        await db.execute('UPDATE usuario SET senha_hash = ? WHERE id = ?', [hash, userId]);
        res.json({ message: 'Senha atualizada com sucesso.' });
      } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar a senha.' });
      }
    });

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });