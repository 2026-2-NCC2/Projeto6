# API local do MVP acadêmico

Contrato de integração, 18/10/2026. Base canônica: frontend 0.4.1 da raiz. O backend acessa somente a nova base `trocaticket_mvp_academico`; não importa nem altera o M1 pessoal.

Todos os corpos são JSON. Erros: `{ error, code }`. Identificadores são inteiros positivos. Datas novas são UTC. Valores financeiros de negócio usam centavos inteiros. Nunca enviar documento civil ou dados de pagamento reais.

## Sessão

- `POST /api/auth/register`: `{name,email,password,role}`; role = comprador, organizador ou fornecedor. Retorna 201 `{user,csrfToken}`. Participante recebe A pelo serviço; demais P. Não admite admin/status enviado pelo cliente.
- `POST /api/auth/login`: `{email,password}` → `{user,csrfToken}`.
- `GET /api/auth/session` → `{user,csrfToken}`, ambos null quando não autenticado.
- `POST /api/auth/logout` → 204.
- user: `{id,name,email,role,admin,approval,photo}`. Administrador é permissão adicional persistente, não perfil selecionável.

Cookie `tt_session`, HttpOnly, SameSite=Lax. Fetch deve usar `credentials:'include'`. CSRF fica apenas em memória: envie `X-CSRF-Token` nas escritas autenticadas. GET session recupera token após recarregar. Origem de escrita restrita aos endereços locais configurados. Nenhum JWT ou senha é guardado em localStorage.

## Perfil e administração

- `GET /api/perfil` → usuário atual mais `{phone,description}`.
- `PUT /api/perfil`: `{name,email,photo,phone,description,currentPassword,password}`. Campos opcionais; troca de senha exige senha atual. Perfil principal é imutável nesta demo para manter coerência dos detalhes. Retorna perfil salvo.
- `GET /api/admin/usuarios` → usuários, somente administrador aprovado.
- `PATCH /api/admin/usuarios/:id/aprovacao`: `{approval:'A'|'P'|'R'}`. Não promove administrador. Não permite bloquear o próprio administrador.

## Eventos

- `GET /api/eventos` → array de eventos públicos publicados, encerrados ou cancelados.
- `GET /api/eventos/:id` → evento; rascunho só para dono/administrador.
- `GET /api/organizador/eventos` → próprios eventos, organizador aprovado.
- `POST /api/eventos` e `PUT /api/eventos/:id`: `{title,description,dateISO,endsAt,venue,category,image,capacity,status,categories}`. Status draft/published/closed. Cancelamento usa o fluxo transacional próprio.
- Evento: `{id,title,description,dateISO,date,time,endsAt,venue,category,image,status,organizerId,capacity,price,priceCents,categories}`.
- Categoria: `{id,name,kind:'full'|'half',priceCents,stock,salesOpen,available}`. Preço mínimo `null` quando não configurado. Capacidade e estoque são finitos. Categorias existentes não são removidas; depois da primeira emissão as alterações estruturais exigem nova categoria.
- `GET /api/eventos/:id/avaliacoes` → array `{id,userId,name,rating,comment}`.
- `POST /api/eventos/:id/avaliacoes`: `{rating,comment}`. Exige evento terminado e ingresso utilizado pela conta; uma avaliação por conta/evento.

## Fornecedores, inventário e propostas

- `GET /api/fornecedores` → array `{id,name,description,items:[...]}` aprovados.
- `GET /api/produtos` → produtos/serviços ativos dos fornecedores aprovados.
- `GET /api/fornecedor/produtos` → inventário próprio.
- `POST /api/produtos` e `PUT /api/produtos/:id`: `{name,description,type:'P'|'S',priceCents,stock,active}`. Retorna item `{id,supplierId,name,description,type,priceCents,stock,active}`. PUT só dono fornecedor aprovado.
- `GET /api/propostas` → ofertas acessíveis ao fornecedor dono ou organizador responsável, com `{id,eventId,eventTitle,productId,productName,supplierId,supplierName,status,quantity,unitCents,totalCents,description}`.
- `POST /api/propostas`: `{eventId,productId,quantity,unitCents,description}` → 201 oferta pendente P. Apenas fornecedor do produto.
- `PATCH /api/propostas/:id/status`: `{status:'A'|'R'|'C'}`. Organizador do evento aceita/recusa P; fornecedor cancela P. Estado final não muda silenciosamente.
- `GET /api/eventos/:id/orcamento` → `{eventId,totalCents,proposals}` das ofertas aceitas, apenas organizador dono/admin. Valores calculados no servidor.

Os endpoints transacionais de ingressos, pedidos, repasse, fila, transferência, atendimento e portaria são documentados em [API-TRANSACOES.md](docs/API-TRANSACOES.md) pelo respectivo módulo. As rotas de catálogo não cobram, emitem nem inventam preço.

Escritas exigem `Origin` local configurado, inclusive login/cadastro; chamadas diretas de teste precisam desse cabeçalho. O estoque configurado de produto (`stock`) é preservado; `available` desconta quantidades de propostas aceitas. Propostas pendentes não consomem estoque. Aceitação e atualização do inventário usam o mesmo lock de produto.

## Fontes didáticas

`reference/aulas/aula09.txt`: Express, JSON, rotas HTTP e CORS. Aula 10: pool MySQL e repositórios. Aulas 11–12: senha com hash, middleware de autorização, validação e erro central. O MVP usa sessão opaca e scrypt nativo conforme sua especificação, sem acrescentar dependências de autenticação. Não foi localizado enunciado que exija quantidade mínima de tabelas, views, triggers ou procedures.
