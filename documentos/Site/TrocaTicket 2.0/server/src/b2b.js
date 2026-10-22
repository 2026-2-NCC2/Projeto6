import express from 'express';
import { transacao } from './db.js';
import { exigir, idValido } from './http.js';
import { criarB2BRepositorio } from './repositorios/b2bRepositorio.js';
import { validarDadosProduto, validarDadosProposta } from './validadores/b2b.js';

function produtoDto(produto) {
  return { ...produto, active: Boolean(produto.active), available: Number(produto.available) };
}

function propostaDto(proposta) {
  return { ...proposta, totalCents: Number(proposta.totalCents) };
}

export function criarB2B(pool, auth) {
  const rotas = express.Router();
  const repositorio = criarB2BRepositorio(pool);

  function exigirFornecedor(req, res, next) {
    exigir(req.user?.role === 'fornecedor', 'Acesso de fornecedor necessário.', 403);
    next();
  }

  async function listarFornecedores(req, res) {
    const fornecedores = await repositorio.listarFornecedoresAprovados();
    const produtos = await repositorio.listarProdutosPublicos();
    res.json(
      fornecedores.map((fornecedor) => ({
        ...fornecedor,
        items: produtos.filter((produto) => produto.supplierId === fornecedor.id).map(produtoDto),
      })),
    );
  }

  async function listarProdutos(req, res) {
    const produtos = await repositorio.listarProdutosPublicos();
    res.json(produtos.map(produtoDto));
  }

  async function listarInventario(req, res) {
    const produtos = await repositorio.listarProdutosDoFornecedor(req.user.id);
    res.json(produtos.map(produtoDto));
  }

  async function salvarProduto(req, res) {
    const id = req.params.id ? idValido(req.params.id) : null;
    const produtoId = await transacao(pool, async (banco) => {
      const consultas = criarB2BRepositorio(banco);
      let anterior;
      if (id) {
        anterior = await consultas.bloquearProduto(id);
        exigir(
          anterior && anterior.supplierId === req.user.id,
          'Você só pode alterar seus próprios produtos.',
          403,
        );
      }

      const dados = validarDadosProduto(req.body, anterior);
      if (anterior) {
        const quantidadeContratada = anterior.stock - Number(anterior.available);
        exigir(
          dados.stock >= quantidadeContratada,
          'Estoque não pode ser menor que quantidades contratadas.',
          409,
        );
      }
      if (!id) return consultas.inserirProduto(req.user.id, dados);
      await consultas.atualizarProduto(id, dados);
      return id;
    });

    const produto = await repositorio.buscarProduto(produtoId);
    res.status(id ? 200 : 201).json(produtoDto(produto));
  }

  async function listarPropostas(req, res) {
    const propostas = await repositorio.listarPropostasDaConta(req.user.id);
    res.json(propostas.map(propostaDto));
  }

  async function cadastrarProposta(req, res) {
    const dados = validarDadosProposta(req.body);
    const propostaId = await transacao(pool, async (banco) => {
      const consultas = criarB2BRepositorio(banco);
      // Ordem preservada: evento, produto; somente depois inserir a proposta.
      const evento = await consultas.bloquearEventoParaProposta(dados.eventId);
      exigir(
        evento && evento.status !== 'cancelled' && evento.status !== 'closed',
        'Evento indisponível para novas propostas.',
        409,
      );

      const produto = await consultas.bloquearProduto(dados.productId);
      exigir(
        produto && produto.supplierId === req.user.id,
        'O produto deve pertencer à sua conta.',
        403,
      );
      exigir(
        produto.active && Number(produto.available) >= dados.quantity,
        'Quantidade indisponível no inventário.',
        409,
      );
      return consultas.inserirProposta(req.user.id, dados);
    });

    const proposta = await repositorio.buscarProposta(propostaId);
    res.status(201).json(propostaDto(proposta));
  }

  async function decidirProposta(req, res) {
    const id = idValido(req.params.id);
    const status = req.body.status;
    exigir(['A', 'R', 'C'].includes(status), 'Estado de proposta inválido.');

    await transacao(pool, async (banco) => {
      const consultas = criarB2BRepositorio(banco);
      const referencias = await consultas.buscarReferenciasDaProposta(id);
      exigir(referencias, 'Proposta não encontrada.', 404);

      // Evento → produto → proposta: a mesma sequência protege aceitações simultâneas.
      await consultas.bloquearEvento(referencias.evento_id);
      const produto = await consultas.bloquearProduto(referencias.produto_servico_id);
      const proposta = await consultas.buscarProposta(id, true);
      const dono =
        status === 'C' ? proposta.supplierId === req.user.id : proposta.organizerId === req.user.id;
      exigir(dono, 'Você não pode alterar esta proposta.', 403);
      if (proposta.status === status) return;
      exigir(proposta.status === 'P', 'A proposta já recebeu uma decisão.', 409);

      if (status === 'A') {
        const evento = await consultas.buscarEstadoDoEvento(proposta.eventId);
        const fornecedor = await consultas.buscarAprovacaoDoFornecedor(proposta.supplierId);
        exigir(
          evento.status !== 'cancelled' &&
            fornecedor.status_aprovacao === 'A' &&
            produto.active &&
            Number(produto.available) >= proposta.quantity,
          'Evento, fornecedor ou estoque indisponível.',
          409,
        );
      }
      await consultas.atualizarEstadoDaProposta(id, status);
    });

    const proposta = await repositorio.buscarProposta(id);
    res.json(propostaDto(proposta));
  }

  async function mostrarOrcamento(req, res) {
    const id = idValido(req.params.id);
    const evento = await repositorio.buscarOrganizadorDoEvento(id);
    exigir(
      evento && (evento.organizador_id === req.user.id || req.user.admin),
      'Orçamento restrito ao organizador responsável.',
      403,
    );

    const propostas = await repositorio.listarPropostasAceitas(id);
    const proposals = propostas.map(propostaDto);
    const totalCents = proposals.reduce((total, proposta) => total + proposta.totalCents, 0);
    res.json({ eventId: id, totalCents, proposals });
  }

  rotas.get('/fornecedores', listarFornecedores);
  rotas.get('/produtos', listarProdutos);
  rotas.get('/fornecedor/produtos', auth.requireApproved, exigirFornecedor, listarInventario);
  rotas.post('/produtos', auth.requireApproved, exigirFornecedor, auth.requireCsrf, salvarProduto);
  rotas.put(
    '/produtos/:id',
    auth.requireApproved,
    exigirFornecedor,
    auth.requireCsrf,
    salvarProduto,
  );
  rotas.get('/propostas', auth.requireApproved, listarPropostas);
  rotas.post(
    '/propostas',
    auth.requireApproved,
    exigirFornecedor,
    auth.requireCsrf,
    cadastrarProposta,
  );
  rotas.patch('/propostas/:id/status', auth.requireApproved, auth.requireCsrf, decidirProposta);
  rotas.get('/eventos/:id/orcamento', auth.requireApproved, mostrarOrcamento);
  return rotas;
}
