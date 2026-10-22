import { hashSenha } from './passwords.js';
import { DATABASE } from './config.js';

export const DEMO_PASSWORD = 'Demo-Academica-2026!';
export const DEMO_USERS = [
  { key: 'ana', name: 'Ana Demo', email: 'ana.demo@example.com', type: 1 },
  { key: 'bruna', name: 'Bruna Demo', email: 'bruna.demo@example.com', type: 1 },
  { key: 'caio', name: 'Caio Demo', email: 'caio.demo@example.com', type: 1 },
  { key: 'organizador', name: 'Organizador Demo', email: 'organizador.demo@example.com', type: 2 },
  { key: 'fornecedor', name: 'Fornecedor Demo', email: 'fornecedor.demo@example.com', type: 3 },
  { key: 'admin', name: 'Admin Demo', email: 'admin.demo@example.com', type: 1, admin: true },
  {
    key: 'organizadorPendente',
    name: 'Organizador Pendente Demo',
    email: 'organizador.pendente@example.com',
    type: 2,
    approval: 'P',
  },
  {
    key: 'fornecedorPendente',
    name: 'Fornecedor Pendente Demo',
    email: 'fornecedor.pendente@example.com',
    type: 3,
    approval: 'P',
  },
];
const seedKey = 'mvp-academico-v1';

export async function seed(pool, { password = DEMO_PASSWORD } = {}) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128)
    throw new Error('Senha fictícia de demonstração inválida.');
  const db = await pool.getConnection();
  let locked = false,
    started = false;
  try {
    const [[target]] = await db.query('SELECT DATABASE() AS banco');
    if (target.banco !== DATABASE)
      throw new Error('Seed limitado à base nova do MVP; M1 preservado.');
    const [[lock]] = await db.query("SELECT GET_LOCK('trocaticket_mvp_seed',10) AS acquired");
    if (lock.acquired !== 1) throw new Error('Outro seed está em andamento.');
    locked = true;
    const [[previous]] = await db.execute('SELECT chave FROM mvp_seed WHERE chave=?', [seedKey]);
    if (previous) {
      const [users] = await db.execute(
        `SELECT id,email FROM usuario WHERE email IN (${DEMO_USERS.map(() => '?').join(',')})`,
        DEMO_USERS.map((u) => u.email),
      );
      return {
        database: DATABASE,
        created: false,
        users: Object.fromEntries(
          DEMO_USERS.map((u) => [u.key, users.find((row) => row.email === u.email)?.id ?? null]),
        ),
      };
    }
    const [collisions] = await db.execute(
      `SELECT id FROM usuario WHERE email IN (${DEMO_USERS.map(() => '?').join(',')})`,
      DEMO_USERS.map((u) => u.email),
    );
    if (collisions.length)
      throw new Error(
        'Email reservado já existe sem checkpoint do seed. Nenhuma conta foi alterada.',
      );
    await db.beginTransaction();
    started = true;
    const users = {};
    for (const u of DEMO_USERS) {
      const [result] = await db.execute(
        'INSERT INTO usuario(nome,email,senha_hash,tipo_perfil,status_aprovacao) VALUES(?,?,?,?,?)',
        [u.name, u.email, await hashSenha(password), u.type, u.approval || 'A'],
      );
      users[u.key] = result.insertId;
      await db.execute('INSERT INTO mvp_perfil(usuario_id,description) VALUES(?,?)', [
        result.insertId,
        'Conta fictícia para apresentação acadêmica.',
      ]);
      if (u.type === 2)
        await db.execute('INSERT INTO organizador_detalhes(usuario_id) VALUES(?)', [
          result.insertId,
        ]);
      if (u.type === 3)
        await db.execute(
          'INSERT INTO fornecedor_detalhes(usuario_id,descricao_servicos) VALUES(?,?)',
          [result.insertId, 'Equipamentos e serviços fictícios do campus.'],
        );
      if (u.admin)
        await db.execute('INSERT INTO administrador_detalhes(usuario_id) VALUES(?)', [
          result.insertId,
        ]);
    }
    const [event] = await db.execute(
      'INSERT INTO evento(organizador_id,titulo,publico_max,data_hora,`local`) VALUES(?,?,?,?,?)',
      [
        users.organizador,
        'Festival do Campus fictício',
        30,
        '2030-12-15 22:00:00',
        'Auditório fictício do campus, São Paulo',
      ],
    );
    await db.execute(
      'INSERT INTO mvp_evento(evento_id,status,description,category,ends_at) VALUES(?,?,?,?,?)',
      [
        event.insertId,
        'published',
        'Demonstração acadêmica • sem pagamentos ou ingressos reais. Evento fictício com emissão e pagamentos simulados.',
        'Festival',
        '2030-12-16 02:00:00',
      ],
    );
    await db.execute('INSERT INTO foto_evento(evento_id,url_foto,descricao) VALUES(?,?,?)', [
      event.insertId,
      '/images/evento-placeholder.svg',
      'Imagem ilustrativa do evento fictício.',
    ]);
    const categories = [];
    for (const [name, kind, price, stock] of [
      ['Inteira', 'full', 10000, 20],
      ['Meia-entrada', 'half', 5000, 10],
    ]) {
      const [category] = await db.execute(
        'INSERT INTO mvp_categoria(event_id,name,kind,price_cents,stock) VALUES(?,?,?,?,?)',
        [event.insertId, name, kind, price, stock],
      );
      categories.push({ id: category.insertId, name, kind, priceCents: price, stock });
    }
    const [product] = await db.execute(
      'INSERT INTO produto_servico(fornecedor_id,nome,descricao,tipo) VALUES(?,?,?,?)',
      [
        users.fornecedor,
        'Sonorização fictícia',
        'Serviço de som demonstrativo, sem contratação comercial.',
        'S',
      ],
    );
    await db.execute('INSERT INTO mvp_produto(produto_id,price_cents,stock) VALUES(?,?,?)', [
      product.insertId,
      150000,
      5,
    ]);
    const [proposal] = await db.execute(
      'INSERT INTO oferta(valor,evento_id,produto_servico_id,fornecedor_id) VALUES(?,?,?,?)',
      ['1500.00', event.insertId, product.insertId, users.fornecedor],
    );
    await db.execute(
      'INSERT INTO mvp_proposta(oferta_id,quantity,unit_cents,description) VALUES(?,?,?,?)',
      [proposal.insertId, 1, 150000, 'Proposta fictícia aguardando decisão do organizador.'],
    );
    await db.execute('INSERT INTO mvp_seed(chave) VALUES(?)', [seedKey]);
    await db.commit();
    started = false;
    return {
      database: DATABASE,
      created: true,
      users,
      eventId: event.insertId,
      categories,
      productId: product.insertId,
      proposalId: proposal.insertId,
    };
  } catch (error) {
    if (started) await db.rollback();
    throw error;
  } finally {
    if (locked) await db.query("SELECT RELEASE_LOCK('trocaticket_mvp_seed')");
    db.release();
  }
}
