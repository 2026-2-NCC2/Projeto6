import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Field, PageTitle, Panel } from '../../components/UI';
import { useI18n } from '../../i18n';
import { parseCents } from '../api';
import { MutationError, QueryState, useMutation, useQuery } from '../shared';
import CategoriasEvento from '../componentes/CategoriasEvento';
import CancelarEvento from '../componentes/CancelarEvento';

// O formulário usa o horário de São Paulo; a API recebe uma data ISO com fuso explícito.
function dataParaFormulario(iso) {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
  return parts.replace(' ', 'T');
}
const novaCategoria = () => ({
  key: crypto.randomUUID(),
  name: '',
  kind: 'full',
  price: '',
  stock: '0',
  salesOpen: true,
});
const novoEvento = () => ({
  title: '',
  description: '',
  start: '',
  end: '',
  venue: '',
  category: 'Cultural',
  image: '',
  capacity: '100',
  status: 'draft',
  categories: [novaCategoria()],
});
export default function EditarEvento() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const consulta = useQuery(id ? `/eventos/${id}` : null);
  const [valores, setValores] = useState(novoEvento);
  useEffect(() => {
    if (consulta.data) {
      const e = consulta.data;
      setValores({
        title: e.title,
        description: e.description,
        start: dataParaFormulario(e.dateISO),
        end: dataParaFormulario(e.endsAt),
        venue: e.venue,
        category: e.category,
        image: e.image || '',
        capacity: String(e.capacity),
        status: e.status,
        categories: e.categories.map((c) => ({
          ...c,
          key: `existing-${c.id}`,
          price: (c.priceCents / 100).toFixed(2),
          stock: String(c.stock),
        })),
      });
    }
  }, [consulta.data]);
  const salvamento = useMutation((event) =>
    navigate(`/organizador/eventos/${event.id}/editar`, { replace: true }),
  );
  function alterarCampo(e) {
    setValores((v) => ({ ...v, [e.target.name]: e.target.value }));
  }
  function alterarCategoria(key, patch) {
    setValores((v) => ({
      ...v,
      categories: v.categories.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    }));
  }
  async function salvarEvento(e) {
    e.preventDefault();
    const categories = valores.categories.map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      name: c.name,
      kind: c.kind,
      priceCents: parseCents(c.price),
      stock: Number(c.stock),
      salesOpen: c.salesOpen,
    }));
    if (
      categories.some((c) => c.priceCents === null || !Number.isSafeInteger(c.stock) || c.stock < 0)
    ) {
      salvamento.setError(t('Informe preços e estoques válidos.'));
      return;
    }
    if (valores.end && valores.end <= valores.start) {
      salvamento.setError(t('O término deve ser posterior ao início.'));
      return;
    }
    if (categories.reduce((sum, c) => sum + c.stock, 0) > Number(valores.capacity)) {
      salvamento.setError(t('A soma dos estoques não pode exceder a capacidade.'));
      return;
    }
    await salvamento.run(
      id ? `/eventos/${id}` : '/eventos',
      {
        title: valores.title,
        description: valores.description,
        dateISO: new Date(`${valores.start}:00-03:00`).toISOString(),
        endsAt: valores.end ? new Date(`${valores.end}:00-03:00`).toISOString() : null,
        venue: valores.venue,
        category: valores.category,
        image: valores.image,
        capacity: Number(valores.capacity),
        status: valores.status,
        categories,
      },
      id ? 'PUT' : 'POST',
    );
  }
  const bloqueado = valores.status === 'cancelled';
  return (
    <div className="workspace">
      <PageTitle
        title={t(id ? 'Editar evento' : 'Novo evento')}
        subtitle={t('Horários em America/Sao_Paulo. Use somente conteúdo fictício.')}
      >
        <Link className="button outline" to="/organizador/eventos">
          {t('Meus eventos')}
        </Link>
        {id && (
          <Link className="button outline" to={`/eventos/${id}`}>
            {t('Visualizar evento')}
          </Link>
        )}
      </PageTitle>
      <QueryState state={consulta}>
        <form onSubmit={salvarEvento} className="mvp-stack">
          <div className="mvp-flow-grid">
            <Panel title={t('Informações principais')}>
              <fieldset className="mvp-fieldset" disabled={bloqueado || salvamento.busy}>
                <div className="mvp-stack">
                  <Field
                    label={t('Nome do evento')}
                    name="title"
                    required
                    minLength={3}
                    maxLength={255}
                    value={valores.title}
                    onChange={alterarCampo}
                  />
                  <div className="form-grid">
                    <Field
                      label={t('Categoria')}
                      name="category"
                      required
                      maxLength={80}
                      value={valores.category}
                      onChange={alterarCampo}
                    />
                    <Field label={t('Estado')} name="status">
                      <select
                        id="status"
                        name="status"
                        value={valores.status}
                        onChange={alterarCampo}
                      >
                        {(!id || consulta.data?.status === 'draft') && (
                          <option value="draft">{t('Rascunho')}</option>
                        )}
                        <option value="published">{t('Publicado')}</option>
                        <option value="closed">{t('Encerrado')}</option>
                        {bloqueado && <option value="cancelled">{t('Cancelado')}</option>}
                      </select>
                    </Field>
                  </div>
                  <Field
                    label={t('Local do evento')}
                    name="venue"
                    required
                    maxLength={255}
                    value={valores.venue}
                    onChange={alterarCampo}
                  />
                  <div className="form-grid">
                    <Field
                      label={t('Data e hora de início')}
                      name="start"
                      type="datetime-local"
                      required
                      value={valores.start}
                      onChange={alterarCampo}
                    />
                    <Field
                      label={t('Data e hora de término (opcional)')}
                      name="end"
                      type="datetime-local"
                      value={valores.end}
                      onChange={alterarCampo}
                    />
                  </div>
                  <Field
                    label={t('Capacidade máxima')}
                    name="capacity"
                    type="number"
                    min="1"
                    max="1000000"
                    step="1"
                    required
                    value={valores.capacity}
                    onChange={alterarCampo}
                  />
                  <Field label={t('Descrição e programação')} name="description">
                    <textarea
                      id="description"
                      name="description"
                      maxLength={10000}
                      value={valores.description}
                      onChange={alterarCampo}
                    />
                  </Field>
                </div>
              </fieldset>
            </Panel>
            <Panel
              title={t('Foto do evento')}
              subtitle={t('Imagem local ou endereço HTTPS de uma imagem fictícia.')}
            >
              <img
                className="mvp-event-cover"
                src={valores.image || '/images/hero.jpg'}
                alt={t('Prévia da foto do evento')}
                onError={(e) => {
                  e.currentTarget.src = '/images/hero.jpg';
                }}
              />
              <Field
                label={t('Endereço da imagem')}
                name="image"
                maxLength={500}
                value={valores.image}
                onChange={alterarCampo}
                disabled={bloqueado}
              />
              <p className="muted">
                {t(
                  'A capa existente é preservada quando o campo fica vazio. O envio de arquivos não está habilitado nesta versão.',
                )}
              </p>
            </Panel>
          </div>
          <CategoriasEvento
            categorias={valores.categories}
            bloqueado={bloqueado}
            salvando={salvamento.busy}
            aoAlterar={alterarCategoria}
            aoRemover={(key) =>
              setValores((v) => ({
                ...v,
                categories: v.categories.filter((c) => c.key !== key),
              }))
            }
            aoAdicionar={() =>
              setValores((v) => ({ ...v, categories: [...v.categories, novaCategoria()] }))
            }
          />
          <MutationError action={salvamento} />
          <div className="actions">
            <Link className="button outline" to="/organizador/eventos">
              {t('Voltar')}
            </Link>
            <button className="button primary" disabled={bloqueado || salvamento.busy}>
              {t('Salvar alterações')}
            </button>
          </div>
        </form>
        {id && !bloqueado && (
          <CancelarEvento eventoId={id} aoCancelar={() => navigate('/organizador/eventos')} />
        )}
      </QueryState>
    </div>
  );
}
