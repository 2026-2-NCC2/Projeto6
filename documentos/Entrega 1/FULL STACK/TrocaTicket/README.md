# TrocaTicket — React e API Node.js

Site navegável baseado nas 21 telas únicas exportadas do Figma. Inclui áreas de participante, organizador, fornecedor e administrador. A interface usa React, React Router e Vite; o servidor Node.js conecta contas e eventos de organizadores ao MySQL.

## Abrir com um clique

Com o Node.js 22.12+ instalado e o MySQL ligado, dê dois cliques em `Iniciar-TrocaTicket.cmd` (Windows) ou `Iniciar-TrocaTicket.command` (Mac), ou rode `npm start` nesta pasta. O iniciador (`scripts/iniciar.mjs`, adaptado da TrocaTicket 2.0) faz o seguinte:

- instala as dependências que faltarem;
- na primeira vez, pergunta a conexão do MySQL e a guarda em `server/.env` (ignorado pelo Git) só depois de ela funcionar;
- prepara o banco com `server/scripts/preparar-banco.js`: cria o banco e aplica o script base e as migrações se ele não existir, ou só confere as migrações num banco existente, sem apagar dados;
- sobe a API (porta 3000) e o site (porta 5173) e abre o navegador.

Enter encerra os dois. Use `configurar` para refazer a conexão; os registros ficam em `logs/`. Os passos abaixo continuam valendo para quem prefere abrir tudo manualmente.

## Abrir no VS Code

1. Extraia o ZIP e abra a pasta **TrocaTicket** no VS Code (Arquivo → Abrir Pasta).
2. Instale o Node.js LTS 22.12 ou superior, com npm, e configure o MySQL.
3. Crie o banco executando, nesta ordem: `documentos/Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql`, `server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql`, `server/MIGRACAO_SESSAO_LOGIN.sql`, `server/MIGRACAO_PEDIDOS_PAGAMENTOS.sql`, `server/MIGRACAO_REPASSE.sql`, `server/MIGRACAO_PORTARIA_ATENDIMENTO.sql` e `server/MIGRACAO_ADMINISTRACAO.sql`. As migrações podem ser reaplicadas sem apagar dados; a última consulta de cada uma deve voltar vazia. O iniciador faz esse passo sozinho.
4. Copie `server/.env.example` para `server/.env` e preencha `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.
5. Em um terminal, instale e inicie a API:

```sh
cd server
npm install
npm run dev
```

6. Em outro terminal, dentro da pasta que contém o `package.json` do front-end:

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. O site chama a API na porta 3000 do mesmo endereço em que foi aberto (`localhost` ou `127.0.0.1`), para que o cookie de sessão funcione; para outro endereço, defina `VITE_API_URL` no ambiente do Vite. A API aceita, por padrão, o site nas portas 5173 e 4173; para outro endereço do site, liste-o em `CORS_ORIGINS` no `server/.env`. Use **Explorar demo** para acessar as telas sem persistência no banco. Para cadastrar eventos no MySQL, entre com uma conta de organizador cadastrada na API.

No PowerShell, caso a execução de `npm.ps1` esteja bloqueada, use `npm.cmd install` e `npm.cmd run dev`.

Também é possível usar `pnpm install --frozen-lockfile` e `pnpm dev`, aproveitando o lockfile incluído.

## Testes automáticos

Rode `npm test` nesta pasta (ou dentro de `server/`). Os testes usam o testador do próprio Node.js, como na TrocaTicket 2.0:

- **Unidade** (sempre rodam): regras de sessão, CSRF, origem, senha, limite de tentativas e preparo do banco. No site, `npm run test:front` confere perfis, painel do usuário, os idiomas (as seis colunas de cada linha dos dicionários, os mesmos `{marcadores}` em todos os idiomas, tradução para todo texto fixo passado a `t()`, troca e gravação do idioma, plurais, mensagens da API reconhecidas e formatos de número e moeda) e as preferências de acessibilidade (valores aceitos, leitura e gravação no navegador, tema do sistema e atributos aplicados na página).
- **Integração** (precisam de um MySQL local): API completa com sessão, tentativas de usar outra conta, CSRF, origem, senhas, limite de tentativas, troca de senha, logout, fluxos de participante, organizador e fornecedor, o preparo do banco e os pedidos (reserva, pagamento aprovado e recusado, repetição da mesma ação, cliques simultâneos, disputa pelos últimos lugares, prazo, lotação, limite por conta, cancelamento e estorno), a revenda, a portaria, o atendimento, a aprovação de contas, a administração e o cancelamento de evento com estorno. Cada arquivo cria um banco temporário `trocaticket_teste_…`, sobe a API nele e o apaga no fim. **O banco da equipe (`DB_NAME`) nunca é usado.** O usuário de `server/.env` (ou das variáveis `DB_USER`/`DB_PASSWORD`) precisa ter permissão para criar bancos. Sem MySQL configurado, esses testes aparecem como pulados.

## O que funciona

- **Participante:** busca por nome/local, filtro por cidade, favoritos, avaliações, pedidos, ingressos e mensagens da comunidade persistidos no MySQL. A compra segue o fluxo da TrocaTicket 2.0: reserva com prazo, pagamento simulado (Pix ou cartão, sem nenhum dado de pagamento), cancelamento da reserva e estorno em **Meus pedidos**. Participantes podem anunciar ingressos para troca, propor trocas diretas e aceitar, recusar ou cancelar solicitações. Nenhum pagamento real é processado e os ingressos simulados não são válidos para entrada.
- **Organizador:** painel, visualização em grade/lista, filtros, cadastro e edição de eventos no MySQL, vínculo persistente de fornecedores cadastrados aos eventos, consulta dos itens ativos do catálogo do fornecedor, revisão de propostas recebidas, decisão de aprovação, estimativa de orçamento, publicação e cancelamento. Eventos de demonstração continuam locais e separados das contas.
- **Fornecedor:** perfil e preferências, oportunidades baseadas em eventos publicados, inventário persistido (adicionar, editar, desativar, reativar e exportar), rascunhos e propostas persistidos, com cálculo do total por quantidade e preço unitário. CSV é salvo item a item e informa importações parciais.
- **Administrador:** com conta de administração (criada por `npm run criar-admin`), o painel geral, os relatórios por evento, a aprovação de contas e os atendimentos usam o banco, e a administração pode cancelar eventos com estorno. No modo demo, as mesmas telas continuam com dados fictícios.
- **Perfil:** dados de demonstração, foto, preferências e cancelamento das alterações não salvas.
- **Geral:** menu móvel, estados vazios, carregamento, falha com nova tentativa, formulários validados, modais com foco contido e fechamento por Escape, avisos de ação e página 404.
- **Idiomas:** português do Brasil (padrão), inglês, espanhol, francês, alemão e italiano, escolhidos no botão de idioma do header (detalhes abaixo).
- **Acessibilidade:** botão redondo no canto inferior direito de todas as páginas, com tamanho da letra, espaçamentos, alto contraste, fonte legível, destaque de links, tema claro, escuro ou do sistema e o tradutor VLibras (detalhes abaixo).

## Dados e limitações

O catálogo inicial é carregado assincronamente de `public/data/events.json`. Eventos publicados, produtos/serviços, propostas, favoritos, avaliações, mensagens da comunidade, ingressos simulados e trocas de ingressos de contas reais usam a API e o MySQL. A troca transfere a titularidade dos dois ingressos em uma transação, sem pagamento.

O `SCRIPT_BANCO_V2.sql` versionado não contém todas as estruturas usadas pela API. Por isso, tanto em instalação nova quanto em banco existente, aplique depois dele `MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql` (vínculos de fornecedores, favoritos, trocas, mensagens da comunidade e colunas do perfil do fornecedor), `MIGRACAO_SESSAO_LOGIN.sql` (sessões de login), `MIGRACAO_PEDIDOS_PAGAMENTOS.sql` (pedidos, estornos e proteção contra ação repetida) `MIGRACAO_REPASSE.sql` (anúncios de revenda, fila de espera e convites de transferência), `MIGRACAO_PORTARIA_ATENDIMENTO.sql` (entradas da portaria e atendimentos) e `MIGRACAO_ADMINISTRACAO.sql` (histórico da aprovação de contas e registro do cancelamento de evento). Elas ficam em `server/` e podem ser reaplicadas com segurança. A primeira é complementar: a migração oficial citada anteriormente não foi encontrada no repositório. A cotação usa os itens ativos do inventário do fornecedor como linhas da oferta; o modelo atual não contém edital com itens requisitados ou teto de orçamento, então a tela não trata o preço do ingresso como teto da proposta.

**Pedidos e pagamento simulado (adaptado da TrocaTicket 2.0).**
- **Reserva:** ao reservar, o pedido segura os ingressos por 15 minutos (`RESERVA_MINUTOS`). Ele conta na lotação do evento e no limite de 6 ingressos ativos ou reservados por conta em cada evento. Meia-entrada exige marcar a declaração (simulação) e custa metade.
- **Pagamento:** o resultado vem de `PAGAMENTO_SIMULADO` no `server/.env` (`aprovado`, padrão; `recusado` ou `indisponivel`, para demonstrar falhas). Aprovado emite os ingressos ligados ao pedido. Recusado libera a reserva. Evento gratuito dispensa a forma de pagamento.
- **Cancelamento:** reserva não paga pode ser cancelada; reserva vencida vira "expirada".
- **Estorno:** até a véspera do evento, o estorno de um pedido cancela e devolve (simulação) os ingressos que ainda estão com quem comprou. Cancelar um ingresso comprado pela própria conta em **Meus ingressos** também registra o estorno. Ingresso recebido em troca é cancelado sem estorno, porque a troca não envolve dinheiro. Depois que o evento começa, não há cancelamento nem estorno.
- **Ações repetidas:** toda gravação de pedido exige o cabeçalho `Idempotency-Key`, que o site envia sozinho. Repetir a mesma ação, como um clique duplo, devolve a mesma resposta em vez de comprar duas vezes.
- **Compatibilidade:** a rota antiga `POST /api/eventos/:id/ingressos` continua aceita e passa a registrar um pedido já pago.
- **Rotas novas:** `GET /api/pedidos`, `GET /api/pedidos/:id`, `POST /api/pedidos`, `POST /api/pedidos/:id/pagar`, `POST /api/pedidos/:id/cancelar` e `POST /api/pedidos/:id/estornar`.

**Revenda, fila de espera e transferência com aceite (adaptado da TrocaTicket 2.0).** A página **Repasses e transferências** (`/repasses`) e o painel "Revenda e fila de espera" de cada evento usam o servidor em `server/repasse.js`.
- **Revenda:** o dono de um ingresso ativo, de evento publicado e ainda vigente, anuncia por até o valor que pagou. Quem reserva um anúncio ganha um pedido em **Meus pedidos**, com o mesmo prazo e pagamento simulado da compra. Com o pagamento aprovado, o ingresso passa ao comprador com **código novo** (o antigo deixa de valer) e o preço pago vira o teto de uma nova revenda. Recusa, cancelamento ou prazo vencido devolvem o anúncio à venda. Compra de revenda não tem estorno.
- **Fila de espera:** por evento e tipo de ingresso, por ordem de chegada. Quando surge um anúncio, o primeiro da fila recebe a reserva na hora (quem já tem 6 ingressos no evento é pulado e continua esperando). Se a reserva vence ou é cancelada, a vez passa para o próximo. A fila tem prioridade sobre a reserva direta.
- **Transferência com aceite:** convite gratuito para o e-mail de outra conta de usuário. O dono só muda quando o destinatário aceita; recusar, cancelar ou deixar vencer (24 horas, `CONVITE_MINUTOS`) mantém o ingresso com quem enviou. Quem recebe de graça só pode transferir de graça.
- **Um ingresso, uma operação:** enquanto está anunciado ou com convite pendente, o ingresso não entra em troca, não é cancelado nem estornado (e vice-versa). Ingresso que já foi revendido ou transferido não gera estorno.
- **Limite e repetição:** o limite de 6 por conta e evento inclui reservas e convites pendentes. Todas as gravações exigem `Idempotency-Key` e são feitas com o evento travado no banco, uma de cada vez.
- **Rotas novas:** `GET/POST /api/anuncios`, `DELETE /api/anuncios/:id`, `POST /api/anuncios/:id/reservar`, `GET/POST /api/fila`, `DELETE /api/fila/:id`, `GET/POST /api/transferencias` e `POST /api/transferencias/:id/aceitar`, `/recusar` ou `/cancelar`.

**Portaria e atendimento (adaptado da TrocaTicket 2.0).** O servidor fica em `server/portaria.js`.
- **Portaria:** o organizador abre **Portaria** no menu, escolhe o evento (publicado e ainda vigente) e digita o código que aparece em **Meus ingressos** da conta de quem vai entrar.
  - Cada ingresso entra uma vez só: a entrada fica registrada, o ingresso passa a "Utilizado" e uma segunda leitura é recusada com o horário da primeira.
  - Repetir a mesma leitura (clique duplo) devolve o mesmo resultado.
  - Ingresso reservado para revenda ou com convite pendente não entra. Na entrada, um anúncio ativo é encerrado e ofertas de troca pendentes são canceladas.
  - O código muda a cada revenda, transferência ou troca, então o código antigo não entra mais.
  - A página mostra as últimas entradas e quantos ingressos ainda não foram usados. É uma simulação: não há câmera nem leitura offline.
- **Atendimento:** em **Meus pedidos** (botão "Atendimento" ou "Ajuda com o pedido nº…"), a conta de usuário abre uma solicitação ligada a um pedido seu. Pelo painel de revenda de cada evento, ela também pode denunciar um anúncio.
  - Quem responde e muda a situação (Aberto, Em análise, Encerrado) é o organizador do evento, em **Atendimentos**. Desde a etapa 6, a administração também vê e responde todos os atendimentos.
  - Quem pediu acompanha o histórico e responde enquanto o atendimento não estiver encerrado.
  - Cada conta pode ter até 10 atendimentos em aberto.
- **Rotas novas:** `GET /api/portaria/eventos`, `GET /api/portaria/eventos/:id`, `POST /api/portaria/entradas`, `GET/POST /api/atendimentos` e `POST /api/atendimentos/:id/mensagens`.

**Administração, aprovação de contas e cancelamento de evento (adaptado da TrocaTicket 2.0).** O servidor fica em `server/administracao.js`.
- **Conta de administração:** o cadastro do site só cria usuário, organizador ou fornecedor. A conta de administração é criada por quem cuida do servidor, com `npm run criar-admin` (nesta pasta ou em `server/`). O script usa o banco do `server/.env` e pede nome, e-mail e senha; a senha não aparece na tela, tem pelo menos 10 caracteres, com letras e números, e no banco fica só o hash. Para automação, use `CRIAR_ADMIN_NOME`, `CRIAR_ADMIN_EMAIL` e `CRIAR_ADMIN_SENHA` no ambiente. Nenhuma senha fica em arquivo.
- **Aprovação de contas:** contas de usuário já nascem aprovadas; organizador e fornecedor aguardam a administração.
  - Enquanto aguarda, a conta consulta os dados, edita o perfil e prepara eventos como rascunho.
  - Publicar evento, vincular fornecedor, usar a portaria e cadastrar produtos e propostas ficam bloqueados (403, `APPROVAL_REQUIRED`).
  - Recusar exige motivo; a conta recusada só consulta.
  - Um aviso no topo do site mostra a situação (com o motivo da recusa) e o botão **Verificar situação**.
  - Cada decisão fica no histórico (`aprovacao_conta`). A administração não muda a própria conta nem outras contas de administração.
  - Na primeira aplicação da migração, as contas que já existiam ficam aprovadas, com registro no histórico.
- **Telas da administração (com conta):**
  - **Painel geral** (`/admin`): números do banco e grade de eventos com busca, filtro por situação, ordem e exportação CSV.
  - **Relatório do evento** (`/admin/relatorios/:id`): vendas, ocupação, receita, estornos, revendas, transferências, trocas, ingressos por situação e por tipo, últimos pedidos e CSV.
  - **Aprovações** (`/admin/moderacao`): busca, filtros por situação e perfil, aprovar, recusar com motivo e voltar para análise.
  - **Atendimentos** (`/admin/atendimentos`).
- **Cancelamento de evento:** o organizador dono (em **Consolidar evento**) ou a administração (no relatório) cancela com um motivo, que aparece para quem comprou.
  - Os ingressos ativos são cancelados e quem pagou por último recebe o estorno simulado: o comprador da revenda, se houve revenda; senão, quem comprou na venda original (também quando o ingresso foi dado de presente). Ingresso já utilizado na portaria não é estornado.
  - Reservas em aberto, anúncios, fila de espera, convites e trocas pendentes são encerrados.
  - **Meus pedidos** mostra "Evento cancelado", o motivo e o valor estornado.
  - A situação "Cancelado" só vem por esta ação: a edição comum recusa, e evento cancelado não pode mais ser editado.
- **Rotas novas:** `GET /api/conta/aprovacao`, `GET /api/admin/resumo`, `GET /api/admin/contas`, `POST /api/admin/contas/:id/aprovacao`, `GET /api/admin/eventos`, `GET /api/admin/eventos/:id` e `POST /api/eventos/:id/cancelar`.

**Idiomas do site (adaptado da TrocaTicket 2.0).** O botão de idioma do header (PT, EN, ES, FR, DE, IT) troca o site entre português do Brasil, inglês, espanhol, francês, alemão e italiano.
- **Escolha:** fica salva neste navegador (`localStorage`, chave `trocaticket-idioma`) e vale para todas as telas, inclusive o modo demo. Sem escolha salva, o site abre em português. O atributo `lang` da página e o título da aba acompanham o idioma.
- **Como funciona:** o texto em português é a própria chave. `t('Meus pedidos')` devolve a tradução do idioma escolhido ou, se ela não existir, o português; nenhum texto some por falta de tradução. Textos com valores usam marcadores: `t('Restam {quantidade} lugares', { quantidade: 3 })`. Plurais usam `tn(quantidade, '{n} evento', '{n} eventos')`.
- **Dicionários:** `src/i18n/textos/`, uma linha por texto com as seis versões `[português, inglês, espanhol, francês, alemão, italiano]`. `reaproveitados.js` traz as traduções que já existiam na 2.0; os arquivos `lote01.js` a `lote09.js`, as deste site. Linhas posteriores substituem as anteriores. As tabelas ficam fora do Prettier (`.prettierignore`) para continuar uma linha por texto.
- **Mensagens da API:** a API continua respondendo em português, com os mesmos códigos HTTP; nada mudou no servidor. O site reconhece a mensagem pelo texto exato ou por um modelo com marcadores (por exemplo, `Este ingresso já foi utilizado (entrada em {quando}, horário de Brasília).`) e mostra a tradução. Mensagem desconhecida aparece em português.
- **O que não é traduzido:** dados do banco e da demonstração, como nomes de eventos, locais, nomes de pessoas, descrições, motivos de recusa ou cancelamento e mensagens escritas pelas pessoas. O fórum Troca-Papo (aplicação separada, em `forum/`) continua em português.
- **Datas, números e moeda:** seguem o idioma escolhido; os valores continuam em reais e aparecem sempre com "R$". Horários informados como "horário de Brasília" continuam no fuso de Brasília.
- **Novo texto no site:** escreva o texto em português dentro de `t()` e acrescente a linha nas seis línguas em um arquivo de `src/i18n/textos/`. O teste do site acusa texto fixo sem tradução.

**Ferramentas de acessibilidade (adaptado da TrocaTicket 2.0).** O botão com o símbolo de acessibilidade, no canto inferior direito de todas as páginas (inclusive a página do fórum), abre o painel.
- **Opções:**
  - tamanho da letra de 100% a 200%, de 25 em 25;
  - espaço entre letras e espaço entre linhas, níveis 0 a 3 (o nível 0 mantém o espaçamento original);
  - alto contraste: preto, branco e amarelo, independente do tema;
  - fonte legível (Verdana);
  - destacar links (sublinhado grosso);
  - tema claro, escuro ou do sistema (acompanha o modo do aparelho);
  - "Restaurar padrão".
- **Prévia e gravação:** as escolhas aparecem na hora. Só ficam salvas neste navegador com **Salvar preferências** (`localStorage`, chave `trocaticket-acessibilidade`); fechar o painel sem salvar desfaz a prévia. Uma aba aplica o que outra salvou. Se o navegador não deixar salvar, o painel avisa e a escolha vale só nesta visita.
- **Tema:** o botão claro/escuro do header continua funcionando e grava na hora. O tema já resolvido também fica em `trocaticket-theme`, que o fórum Troca-Papo lê.
- **Painel:** abre como janela (`<dialog>`), com o foco preso dentro dele; Esc, o botão × e o clique fora fecham, e o foco volta ao botão. Os textos seguem o idioma escolhido.
- **VLibras:** o tradutor de português para Libras do governo federal só é baixado quando a pessoa clica em **Ativar VLibras**; antes disso, o site não faz nenhum acesso a vlibras.gov.br. Precisa de internet; sem conexão, o painel avisa e oferece tentar de novo. Em outro idioma, o painel oferece voltar ao português, porque o VLibras traduz do português. O tradutor automático não substitui interpretação humana.
- **Como funciona:** as preferências viram atributos do `<html>` (`data-fonte`, `data-letras`, `data-linhas`, `data-legivel`, `data-links`, `data-contrast` e `data-theme`), lidos por `src/acessibilidade.css`. O tamanho da letra muda o tamanho base da página, por isso os tamanhos de texto do CSS do site estão em `rem` (1 rem = 16 px com a letra em 100%; a conversão foi exata e, sozinha, não muda nenhuma tela em 100%).
- **Texto ampliado:** com a letra acima de 100%, um espaçamento ligado ou a fonte legível, o `<html>` recebe `data-ampliado="true"`. Aí o header entra no fluxo da página, o menu fica no botão ☰, linhas lado a lado quebram ou viram coluna e tabelas rolam dentro do próprio quadro, para não cortar texto nem criar rolagem lateral. O alto contraste sozinho não muda o tamanho de nada: o contorno de botões e campos é desenhado por dentro.
- **Novo componente:** use `rem` para tamanhos de texto e confira a tela com letra 200% e com os espaçamentos no máximo, de 320 px a 1920 px de largura, e com o alto contraste.

Mensagens da comunidade na demonstração permanecem locais e separadas das contas. Ingressos comprados pela interface são registros simulados no banco, não são válidos para entrada e nenhum valor é cobrado. Dados locais da demonstração sem conta usam `trocaticket-v2`; o perfil escolhido fica no `sessionStorage`. Para os fluxos conectados, mantenha a API e o MySQL em execução conforme as instruções de instalação.

**Login com sessão (adaptado da TrocaTicket 2.0).** Ao entrar ou se cadastrar, a API cria uma sessão: o navegador recebe um cookie `httpOnly` e `SameSite=Lax`, e o banco guarda só o resumo SHA-256 dele. As rotas que recebem o ID de uma conta só aceitam o ID da conta logada (401 sem sessão, 403 para outra conta). Toda gravação exige também o cabeçalho `X-CSRF-Token`, devolvido no login e em `GET /api/sessao`. A API recusa sites fora da lista de origens, limita a 10 as tentativas de login por e-mail e endereço a cada 15 minutos e encerra as outras sessões quando a senha muda. As sessões duram 8 horas (`SESSION_HOURS`). Senhas ficam em bcrypt; contas antigas com senha em texto puro ainda entram e são convertidas no primeiro login. Ainda é um projeto acadêmico: use somente dados fictícios e, fora do computador local, sirva a API com HTTPS e `COOKIE_SECURE=true`. Desde a etapa 6, as gravações exigem conta aprovada pela administração (ver abaixo). O limite de tentativas fica na memória do servidor e zera ao reiniciar. A opção 2FA é apenas uma preferência salva, não ativa segundo fator; e-mail não é verificado e o histórico de acesso é demonstrativo. Ingressos, trocas, revendas, transferências e entradas na portaria são registros acadêmicos simulados, sem pagamento, reembolso ou controle de acesso reais. OAuth, chat em tempo real e relatórios PDF não foram conectados; os fluxos correspondentes são demonstrações locais e/ou exportações CSV. O modo demo usa dados fictícios somente quando escolhido sem conta; contas autenticadas carregam registros da API, não exibem ações para entrar/sair do demo e não usam reservas ou mensagens demonstrativas.

As imagens não fornecem camadas, fontes ou regras de interação. O layout foi reconstruído em componentes, com ajustes de responsividade, consistência e acessibilidade. Alguns símbolos e textos foram adaptados. Datas e nomes fictícios do material foram mantidos como exemplos, sem confirmação de existência dos eventos.

## Organização do código

| Arquivo / pasta             | Responsabilidade                                        |
| --------------------------- | ------------------------------------------------------- |
| `src/App.jsx`               | Rotas e páginas institucionais                          |
| `src/components/Layout.jsx` | Cabeçalho, navegação por perfil, rodapé                 |
| `src/components/UI.jsx`     | Campos, painéis, modais, badges e exportação CSV        |
| `src/i18n/`                 | Idiomas: `t()`, `tn()`, formatos e dicionários (`textos/`) |
| `src/components/SeletorIdioma.jsx` | Botão de idioma do header                     |
| `src/acessibilidade/`       | Preferências de acessibilidade e carregamento do VLibras |
| `src/components/acessibilidade/` | Botão e painel de acessibilidade                   |
| `src/acessibilidade.css`    | Painel, alto contraste, espaçamentos e texto ampliado   |
| `src/context/Store.jsx`     | Estado compartilhado e persistência local               |
| `src/data/demo.js`          | Eventos, fornecedores, inventário e pessoas fictícias   |
| `src/services/events.js`    | Eventos, favoritos, avaliações e propostas de organizador |
| `src/services/tickets.js`   | Reservas simuladas e troca de ingressos                   |
| `src/services/supplier.js`  | Perfil, inventário, oportunidades e propostas do fornecedor |
| `server/server.js`          | API Node.js para contas, eventos e fluxos conectados    |
| `src/pages/Home.jsx`        | Página inicial                                          |
| `src/pages/Account.jsx`     | Entrada, cadastro, recuperação e escolha de perfil      |
| `src/pages/Participant.jsx` | Catálogo, detalhes, ingressos e comunidade              |
| `src/pages/Organizer.jsx`   | Painel, editor, consolidação e fornecedores             |
| `src/pages/supplier/`       | Perfil, oportunidades, cotações, propostas e inventário |
| `src/pages/Admin.jsx`       | Painel, relatórios e moderação                          |
| `src/pages/Profile.jsx`     | Configurações de perfil                                 |
| `src/styles.css`            | Estilos da página inicial                               |
| `src/workspace.css`         | Estilos compartilhados das áreas internas e breakpoints |
| `public/images`             | Imagens originais extraídas do arquivo fornecido        |
| `reference/screens`         | Referências visuais exportadas pelo usuário             |

## Correspondência com as telas recebidas

| ZIP de referência   | Página implementada                         |
| ------------------- | ------------------------------------------- |
| 1                   | `/`                                         |
| 2, 11, 12           | `/cadastro`, com seleção de perfil          |
| 3                   | `/entrar`                                   |
| 4                   | `/organizador`                              |
| 5                   | `/organizador/novo`                         |
| 6                   | `/organizador/eventos/primavera/consolidar` |
| 7                   | `/eventos/lollapalooza`                     |
| 8                   | `/organizador/eventos/primavera/editar`     |
| 9, 10               | `/perfil`, conforme perfil escolhido        |
| 13                  | `/perfis`                                   |
| 14                  | `/fornecedor`                               |
| 15                  | `/eventos`                                  |
| 16                  | `/admin`                                    |
| 17                  | `/admin/relatorios/tim-maia`                |
| 18                  | `/admin/moderacao`                          |
| 19                  | `/fornecedor/inventario`                    |
| 20                  | `/fornecedor/propostas`                     |
| 21, 22 (duplicados) | `/fornecedor/cotacao/tim-maia`              |

## Trabalhar em grupo

Comecem pelo mesmo projeto e usem branches para cada integrante. Dividam por área, preservando os componentes comuns. Cada pessoa deve fazer seus próprios commits; nenhum histórico de contribuição foi fabricado. Integre as alterações por pull requests e execute o build antes de juntar.

```sh
npm run build
npm run preview
npm run format
npm run format:check
```

A hospedagem de produção precisa redirecionar as rotas da SPA para `index.html`. O projeto não foi publicado na internet.

## Verificação

Consulte `VALIDACAO.md` para os fluxos e tamanhos de tela verificados. A versão de produção fica em `dist/` após executar o build; `node_modules/` e `dist/` não são incluídos no ZIP.
