// Testes do preparo do banco (scripts/preparar-banco.js) em bancos temporários.
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { SEM_MYSQL, conectar, configMysql } = require('./apoio');
const { prepararBanco } = require('../scripts/preparar-banco');

const TABELAS = [
  'administrador_detalhes', 'anuncio_ingresso', 'aprovacao_conta', 'atendimento', 'atendimento_mensagem', 'avaliacao',
  'comunidade_mensagem', 'convite_ingresso', 'entrada_portaria', 'estorno', 'evento', 'evento_favorito',
  'evento_fornecedor', 'fila_repasse', 'fornecedor_detalhes', 'foto_evento', 'ingresso', 'item_proposta',
  'organizador_detalhes', 'pedido', 'pedido_idempotencia', 'produto_servico', 'proposta', 'sessao',
  'troca_ingresso', 'usuario',
];

describe('preparo do banco', { skip: !configMysql() && SEM_MYSQL }, () => {
  const criados = [];
  const novoNome = (sufixo) => {
    const nome = `trocaticket_teste_${process.pid}_${sufixo}_${Date.now().toString(36)}`;
    criados.push(nome);
    return nome;
  };
  const preparar = (database) => prepararBanco({ ...configMysql(), database });
  async function tabelas(conexao, nome) {
    const [linhas] = await conexao.query(
      'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
      [nome],
    );
    return linhas.map((linha) => linha.t);
  }

  after(async () => {
    const conexao = await conectar();
    for (const nome of criados) await conexao.query(`DROP DATABASE IF EXISTS \`${nome}\``);
    await conexao.end();
  });

  it('cria o banco com o script base e as migrações', async () => {
    const nome = novoNome('novo');
    const resultado = await preparar(nome);
    assert.equal(resultado.criado, true);
    assert.equal(resultado.baseAplicada, true);
    const conexao = await conectar();
    assert.deepEqual(await tabelas(conexao, nome), TABELAS);
    await conexao.end();
  });

  it('pode rodar de novo sem apagar dados', async () => {
    const nome = novoNome('repetido');
    await preparar(nome);
    const conexao = await conectar({ database: nome });
    await conexao.query("INSERT INTO usuario (nome, email, senha_hash, tipo_perfil) VALUES ('Fica', 'fica@example.test', 'x', 1)");
    const segunda = await preparar(nome);
    assert.equal(segunda.criado, false);
    assert.equal(segunda.baseAplicada, false);
    const [[{ n }]] = await conexao.query('SELECT COUNT(*) AS n FROM usuario');
    assert.equal(Number(n), 1);
    await conexao.end();
  });

  it('completa um banco antigo (só com o script base) e preserva os dados', async () => {
    const nome = novoNome('antigo');
    const conexao = await conectar({ multipleStatements: true });
    const fs = require('fs');
    const { semNomeFixo, SCRIPT_BASE } = require('../scripts/preparar-banco');
    await conexao.query(`CREATE DATABASE \`${nome}\`; USE \`${nome}\`; ${semNomeFixo(fs.readFileSync(SCRIPT_BASE, 'utf8'))}`);
    await conexao.query("INSERT INTO usuario (nome, email, senha_hash, tipo_perfil) VALUES ('Antiga', 'antiga@example.test', 'x', 1)");
    assert.ok(!(await tabelas(conexao, nome)).includes('sessao'));
    const resultado = await preparar(nome);
    assert.equal(resultado.baseAplicada, false);
    assert.deepEqual(await tabelas(conexao, nome), TABELAS);
    const [[{ n }]] = await conexao.query('SELECT COUNT(*) AS n FROM usuario');
    assert.equal(Number(n), 1);
    await conexao.end();
  });

  it('recusa banco de outro sistema sem alterar nada', async () => {
    const nome = novoNome('alheio');
    const conexao = await conectar();
    await conexao.query(`CREATE DATABASE \`${nome}\``);
    await conexao.query(`CREATE TABLE \`${nome}\`.clientes (id INT)`);
    await assert.rejects(preparar(nome), /outras tabelas/);
    assert.deepEqual(await tabelas(conexao, nome), ['clientes']);
    await conexao.end();
  });

  it('avisa quando uma tabela já existia com formato diferente', async () => {
    const nome = novoNome('torto');
    await preparar(nome);
    const conexao = await conectar({ database: nome });
    await conexao.query('DROP TABLE evento_favorito');
    await conexao.query('CREATE TABLE evento_favorito (id INT PRIMARY KEY)');
    await assert.rejects(preparar(nome), /estruturas ausentes: evento_favorito\.usuario_id/);
    await conexao.end();
  });

  it('recusa nome de banco inseguro antes de conectar', async () => {
    await assert.rejects(preparar('x; DROP DATABASE y'), /Nome de banco inválido/);
  });
});
