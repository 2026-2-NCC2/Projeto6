import express from 'express';
import { transacao } from './db.js';
import { exigir, idValido, texto, inteiro, urlImagem } from './http.js';
import { criarCatalogoRepositorio } from './repositorios/catalogoRepositorio.js';
import { validarDadosEvento, validarCategoria } from './validadores/evento.js';

export { dateSql } from './validadores/evento.js';

function paraDataISO(valor) {
  return valor
    ? String(valor).replace(' ', 'T').slice(0, 23) + (String(valor).endsWith('Z') ? '' : 'Z')
    : null;
}

export async function eventoDto(banco, evento) {
  const repositorio = criarCatalogoRepositorio(banco);
  const categorias = await repositorio.listarCategoriasDisponiveis(evento.id);
  const categories = categorias.map((categoria) => ({
    id: categoria.id,
    name: categoria.name,
    kind: categoria.kind,
    priceCents: categoria.price_cents,
    stock: categoria.stock,
    salesOpen: Boolean(categoria.sales_open),
    available: Math.max(0, Number(categoria.available)),
  }));
  const precos = categories
    .filter((categoria) => categoria.salesOpen)
    .map((categoria) => categoria.priceCents);
  const priceCents = precos.length ? Math.min(...precos) : null;
  const dateISO = paraDataISO(evento.data_hora);

  return {
    id: evento.id,
    title: evento.titulo,
    description: evento.description,
    dateISO,
    date: dateISO.slice(0, 10),
    time: dateISO.slice(11, 16),
    endsAt: paraDataISO(evento.ends_at),
    venue: evento.local,
    category: evento.category,
    image: evento.image || '/images/evento-placeholder.svg',
    status: evento.status,
    organizerId: evento.organizador_id,
    capacity: evento.publico_max,
    price: priceCents === null ? null : priceCents / 100,
    priceCents,
    categories,
  };
}

export function criarCatalogo(pool, auth) {
  const rotas = express.Router();
  const repositorio = criarCatalogoRepositorio(pool);

  function exigirOrganizador(req, res, next) {
    exigir(req.user?.role === 'organizador', 'Acesso de organizador necessário.', 403);
    next();
  }

  async function buscarEventoAcessivel(id, usuario, banco = pool, bloquear = false) {
    const consultas = criarCatalogoRepositorio(banco);
    const evento = await consultas.buscarEvento(id, bloquear);
    exigir(
      evento &&
        (evento.status !== 'draft' || evento.organizador_id === usuario?.id || usuario?.admin),
      'Evento não encontrado.',
      404,
    );
    return evento;
  }

  async function listarEventos(req, res) {
    const eventos = await repositorio.listarEventosPublicos();
    res.json(await Promise.all(eventos.map((evento) => eventoDto(pool, evento))));
  }

  async function listarEventosDoOrganizador(req, res) {
    const eventos = await repositorio.listarEventosDoOrganizador(req.user.id);
    res.json(await Promise.all(eventos.map((evento) => eventoDto(pool, evento))));
  }

  async function mostrarEvento(req, res) {
    const evento = await buscarEventoAcessivel(idValido(req.params.id), req.user);
    res.json(await eventoDto(pool, evento));
  }

  async function salvarImagem(consultas, eventoId, body) {
    if (!Object.hasOwn(body, 'image')) return;
    const imagem = urlImagem(body.image);
    const foto = await consultas.buscarPrimeiraFoto(eventoId);
    if (!imagem) return;
    if (foto) await consultas.atualizarFoto(foto.id, imagem);
    else await consultas.inserirFoto(eventoId, imagem);
  }

  async function salvarCategorias(consultas, eventoId, categorias) {
    if (categorias === undefined) return;
    exigir(
      Array.isArray(categorias) && categorias.length <= 20,
      'Informe no máximo 20 categorias.',
    );
    const identificadores = new Set();

    for (const categoria of categorias) {
      const dados = validarCategoria(categoria);
      if (!categoria.id) {
        await consultas.inserirCategoria(eventoId, dados);
        continue;
      }

      const id = idValido(categoria.id);
      exigir(!identificadores.has(id), 'Categoria repetida.');
      identificadores.add(id);
      const anterior = await consultas.buscarCategoria(id, eventoId);
      exigir(anterior, 'Categoria não pertence ao evento.', 403);

      const unidades = await consultas.contarUnidadesDaCategoria(id);
      exigir(
        !unidades || anterior.kind === dados.kind,
        'Não altere o tipo de categoria com ingressos emitidos.',
        409,
      );
      const ocupacao = await consultas.contarOcupacaoDaCategoria(id);
      exigir(
        dados.stock >= ocupacao,
        'Estoque não pode ser menor que unidades emitidas/reservadas.',
        409,
      );
      await consultas.atualizarCategoria(id, dados);
    }
  }

  async function salvarEvento(req, res) {
    const id = req.params.id ? idValido(req.params.id) : null;
    const eventoId = await transacao(pool, async (banco) => {
      const consultas = criarCatalogoRepositorio(banco);
      let anterior;
      if (id) {
        // Mesmo primeiro lock usado pelas reservas: capacidade e emissão não correm em paralelo.
        const evento = await consultas.bloquearEvento(id);
        exigir(
          evento && evento.organizador_id === req.user.id,
          'Você só pode alterar seus próprios eventos.',
          403,
        );
        anterior = await buscarEventoAcessivel(id, req.user, banco);
        exigir(anterior.status !== 'cancelled', 'Evento cancelado não pode ser reaberto.', 409);
      }

      const dados = validarDadosEvento(req.body, anterior);
      let salvoId = id;
      if (id) await consultas.atualizarEvento(id, dados);
      else salvoId = await consultas.inserirEvento(req.user.id, dados);

      await salvarImagem(consultas, salvoId, req.body);
      await salvarCategorias(consultas, salvoId, req.body.categories);

      const estoque = await consultas.resumirEstoqueDoEvento(salvoId);
      exigir(
        Number(estoque.total) <= dados.capacity,
        'A soma dos estoques não pode exceder a capacidade.',
      );
      exigir(
        dados.status !== 'published' || (estoque.categories > 0 && Number(estoque.total) > 0),
        'Configure estoque finito antes de publicar.',
      );
      return salvoId;
    });

    const evento = await buscarEventoAcessivel(eventoId, req.user);
    res.status(id ? 200 : 201).json(await eventoDto(pool, evento));
  }

  async function listarAvaliacoes(req, res) {
    const id = idValido(req.params.id);
    await buscarEventoAcessivel(id, req.user);
    res.json(await repositorio.listarAvaliacoes(id));
  }

  async function cadastrarAvaliacao(req, res) {
    const id = idValido(req.params.id);
    const nota = inteiro(req.body.rating, 'Nota', 1, 5);
    const comentario = texto(req.body.comment || '', 'Comentário', 500, 0);

    await transacao(pool, async (banco) => {
      const consultas = criarCatalogoRepositorio(banco);
      await consultas.bloquearEvento(id);
      const elegivel = await consultas.buscarElegibilidadeDaAvaliacao(id, req.user.id);
      exigir(
        elegivel,
        'A avaliação exige evento terminado e ingresso utilizado por sua conta.',
        403,
      );
      await consultas.inserirAvaliacao(id, req.user.id, nota, comentario);
    });
    res.status(201).json({ saved: true });
  }

  rotas.get('/eventos', listarEventos);
  rotas.get(
    '/organizador/eventos',
    auth.requireApproved,
    exigirOrganizador,
    listarEventosDoOrganizador,
  );
  rotas.get('/eventos/:id', mostrarEvento);
  rotas.post('/eventos', auth.requireApproved, exigirOrganizador, auth.requireCsrf, salvarEvento);
  rotas.put(
    '/eventos/:id',
    auth.requireApproved,
    exigirOrganizador,
    auth.requireCsrf,
    salvarEvento,
  );
  rotas.get('/eventos/:id/avaliacoes', listarAvaliacoes);
  rotas.post('/eventos/:id/avaliacoes', auth.requireApproved, auth.requireCsrf, cadastrarAvaliacao);
  return rotas;
}
