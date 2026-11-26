# Integração TrocaTicket

## Integração com a TrocaTicket 2.0 — etapa 6: administração, aprovação de contas e cancelamento de evento (26/11/2026)

Etapa iniciada com autorização do usuário ("Etapa 6") sobre o commit da etapa 5 (5c450b8). Houve uma interrupção por limite de uso no meio do trabalho; os arquivos ficaram no disco e o trabalho continuou do ponto em que parou. Nada foi publicado e não houve merge.

**O que entrou**
- `server/administracao.js` (novo), adaptado de app.js (contas e aprovação) e transacoes/carteira-portaria.js (cancelEvent) da 2.0:
  - **Conta:** `GET /api/conta/aprovacao` mostra à própria conta a situação e a última decisão, com o motivo, mas sem o nome de quem decidiu.
  - **Administração:** `GET /api/admin/resumo`, `GET /api/admin/contas` (filtros por situação, perfil e busca; o `%` da busca não vira curinga), `POST /api/admin/contas/:id/aprovacao`, `GET /api/admin/eventos` e `GET /api/admin/eventos/:id`.
  - **Cancelamento:** `POST /api/eventos/:id/cancelar`, para o organizador dono ou a administração, com motivo de 5 a 500 caracteres e Idempotency-Key.
- `server/MIGRACAO_ADMINISTRACAO.sql` (nova, incluída no preparador):
  - tabela `aprovacao_conta` (histórico das decisões);
  - colunas `cancelado_em`, `motivo_cancelamento` e `cancelado_por` em `evento`;
  - na primeira aplicação, as contas pendentes que já existiam ficam aprovadas, com registro no histórico;
  - pode ser reaplicada e termina com uma conferência que deve voltar vazia.
- `server/scripts/criar-admin.js` (novo) e `npm run criar-admin` (na pasta do app e em `server/`). É o único caminho para criar conta de administração.
  - Pergunta nome, e-mail e senha, e a senha não aparece no terminal; aceita `CRIAR_ADMIN_*` no ambiente.
  - Exige senha de 10 caracteres ou mais, com letras e números, e recusa e-mail que já tem conta.
  - Grava usuário, `administrador_detalhes` e histórico numa transação. Nenhuma senha vai para arquivo.
- **Aprovação exigida:**
  - `server/sessao.js`: `exigirAprovacao` e a situação `aprovacao` na sessão e no login.
  - `server/pedidos.js`: `rotaComPerfis` recusa gravações de conta não aprovada (403, `APPROVAL_REQUIRED`), o que cobre pedidos, revenda, fila, transferência, portaria e atendimento.
  - `server/server.js`: publicar evento, vincular fornecedor, decidir proposta, cadastrar produto e proposta e as gravações da conta de usuário exigem aprovação. Rascunho de evento, perfil do fornecedor e dados da própria conta continuam liberados.
- **Correção de segurança:** o cadastro aceitava qualquer `tipo_perfil`, inclusive 4 (administração). Agora só aceita 1, 2 ou 3 (400 nos demais).
- **Correção de estorno:** `atualizarSituacaoEstorno` contava estornos feitos a outro pedido do mesmo ingresso. Com o cancelamento de evento, o ingresso revendido é estornado a quem comprou na revenda; o pedido original passaria a aparecer como "estornado" sem ter recebido tudo. Agora conta só os estornos do próprio pedido. Até a etapa 5 todo estorno ia para o pedido original, então nada muda no que já existia.
- `server/portaria.js`: a administração vê todos os atendimentos e responde como "administracao".
- `server/server.js`: a situação "Cancelado" só vem pelo cancelamento (409 na criação e na edição comum), evento cancelado não pode ser editado e a lista do organizador traz `cancelReason`.
- `server/pedidos.js`: o pedido informa `eventCancelled`, `cancelReason` e o total estornado ao próprio pedido.
- **Site:**
  - telas reais da administração com conta: Painel geral, Relatório do evento (com cancelamento), Aprovações e Atendimentos, além do menu próprio. No modo demo, as telas fictícias continuam iguais;
  - aviso de conta pendente ou recusada no topo, com o motivo e o botão "Verificar situação";
  - nota de aprovação no cadastro de organizador e fornecedor;
  - cancelamento com motivo em Consolidar evento (eventos do banco);
  - "Evento cancelado" com motivo e estorno em Meus pedidos;
  - `src/utils/useGravacao.js` (Idempotency-Key compartilhado) e `src/admin.css`.
- **Header:** o menu recolhe no botão ☰ quando os itens não cabem numa linha (detalhes em Testes).
- **Testes:**
  - `server/tests/administracao.test.js` (10 cenários);
  - `tests/apoio.js` ganhou `aprovarConta`, usado pelos testes anteriores que criam organizador;
  - `banco.test.js` confere a aprovação única das contas antigas;
  - roteiro de navegador novo `scripts/e2e/administracao.py`, com `--fotos` e `--axe`;
  - `navegador.py`, `portaria.py` e `repasse.py` aprovam o organizador de teste com a conta de `TT_ADMIN_EMAIL`/`TT_ADMIN_SENHA` (variáveis de ambiente, nunca em arquivo).

**Decisões**
- **Quem aprova:** contas de usuário nascem aprovadas; organizador e fornecedor aguardam, como na 2.0. Recusa exige motivo. A decisão pode ser revista (aprovar, recusar, voltar para análise). Ninguém muda a própria conta nem contas de administração.
- **Conta recusada:** só consulta. A mensagem de recusa não manda abrir atendimento, porque conta recusada não grava, nem atendimento.
- **Cancelamento:**
  - estorna quem pagou por último: o comprador da revenda, se houve; senão, o da venda original, inclusive quando o ingresso foi dado de presente;
  - ingresso já usado na portaria não é estornado (na 2.0, tudo era estornado);
  - reservas, anúncios, fila, convites e trocas pendentes são encerrados;
  - organizador de outro evento recebe 404; evento já cancelado, 409.
- **Propostas de fornecedores** de evento cancelado não são encerradas automaticamente, como na 2.0.
- **Painel:** "Ingressos vendidos" conta os ingressos válidos (ativos e utilizados). O cartão mostra a receita líquida de estornos; o relatório mostra a receita bruta e os estornos separados.

**Testes executados (bancos e contas descartáveis)**
- `npm test`: site 10/10; API 79/79 em MariaDB 10.11.14 e em MySQL 8.0.46 (69 anteriores e 10 novos), sem testes pulados.
- Sabotagens propositais, todas acusadas pelos testes:
  - aprovação ignorada nas rotas de pedidos e portaria;
  - cadastro aceitando o tipo 4;
  - administração mudando outra conta de administração;
  - cancelamento estornando sempre a venda original;
  - estorno contado no pedido errado;
  - publicação sem aprovação.
- Migração: num banco antigo, o organizador pendente foi aprovado uma vez, com histórico; reaplicar não aprova contas pendentes novas.
- `criar-admin` testado:
  - pelas variáveis de ambiente;
  - com e-mail repetido, senha fraca, confirmação diferente e entrada interrompida (nada gravado);
  - num pseudoterminal: a senha não apareceu na tela.
  - Ali apareceu um defeito do próprio script: com respostas redirecionadas, ele perdia linhas e terminava com sucesso sem criar a conta. Foi corrigido antes do commit.
- **Navegador** (Chromium 158 com Playwright, API e MariaDB reais). `administracao.py` passou com quatro contas:
  - organizador cadastrado pelo site fica pendente: rascunho salvo, publicação recusada com aviso;
  - administração vê o painel e recusa a conta com motivo; o organizador vê a recusa e o motivo; a administração aprova e o organizador publica;
  - compra, relatório e cancelamento pela administração (2 estornos, R$ 120,00);
  - "Evento cancelado" em Meus pedidos e "Cancelado" em Meus ingressos;
  - atendimento respondido pela administração;
  - cancelamento pelo organizador;
  - conta de usuário recusada com aviso na homepage;
  - 390 px sem rolagem lateral.
- Regressão: `navegador.py` (`regressao`, `compra` e `recusado`), `repasse.py` e `portaria.py` passaram.
- axe 4.14.1: zero violações em 40 combinações da etapa 6, 20 da etapa 4 e 12 da etapa 5.
  - Três violações que eu tinha introduzido foram encontradas e corrigidas: nome acessível do botão "Voltar para análise", tabelas roláveis sem foco e regiões com nome repetido.
- **Header:**
  - A checagem da etapa 5 media só a rolagem lateral. Medindo o texto dos links, achei sobreposição entre 860 e 1330 px no menu do organizador (5 itens, desde a etapa 5) e em faixas menores nos outros perfis, inclusive no menu novo da administração.
  - Corrigido: o menu recolhe no ☰ só quando não cabe. Recolhido, fica invisível e fora do Tab, mas continua medível. Com menu longo, o seletor da demo mostra só "DEMO", porque o perfil já aparece no cartão do usuário.
  - Medido em 8 perfis (demo e conta), de 860 a 1460 px de 10 em 10, 1600 e 1920: nenhuma sobreposição.
  - Ordem do Tab conferida; axe sem violações com o menu recolhido e aberto.
- O build passou e não há arquivo novo fora do padrão do Prettier (os 51 antigos continuam iguais).

**Pendências e riscos**
- A aprovação não envia e-mail: a conta vê a decisão no aviso do topo do site.
- Não há tela para gerenciar ou redefinir senha de contas de administração (só o script).
- O painel lista até 500 eventos e a aprovação até 200 contas por consulta, sem paginação no servidor.
- Propostas de fornecedores de evento cancelado continuam como estavam.
- **Achado da etapa 4:** o histórico de trocas da main continua em aberto.
- **Próximo passo:** aguardar a confirmação do usuário para publicar ou para começar a etapa 7 (idiomas).

## Integração com a TrocaTicket 2.0 — etapa 5: portaria e atendimento (26/11/2026)

Etapa iniciada com autorização do usuário depois do ZIP da etapa 4 (base 753682b) e concluída; nada foi publicado e não houve merge.

**O que entrou**
- `server/portaria.js` (novo), adaptado de carteira-portaria.js (leitura única) e atendimento-configuracao.js (atendimentos com histórico) da 2.0:
  - **Portaria do organizador:** `GET /api/portaria/eventos`, `GET /api/portaria/eventos/:id` (entradas e ingressos ainda não usados) e `POST /api/portaria/entradas` (validação do código, com Idempotency-Key).
  - **Atendimento:** `GET/POST /api/atendimentos` e `POST /api/atendimentos/:id/mensagens`.
- `server/MIGRACAO_PORTARIA_ATENDIMENTO.sql` (nova, incluída no preparador): `entrada_portaria` (uma linha por ingresso; a chave primária impede uma segunda entrada), `atendimento` e `atendimento_mensagem`. Pode ser reaplicada e termina com uma conferência que deve voltar vazia.
- `server/pedidos.js`: `rotaComPerfis` (rotas por perfil, como usuário e organizador) e ligação do novo módulo.
- `server/server.js`:
  - a troca aceita gera código novo para os dois ingressos (pendência da etapa 4: o dono anterior entrava com o código antigo);
  - a lista de ingressos traz `usedAt`.
- **Site:**
  - páginas **Portaria** (`/organizador/portaria`) e **Atendimentos** (`/organizador/atendimentos`) no menu do organizador;
  - página **Atendimento** (`/atendimento`) da conta de usuário, com atalhos em Meus pedidos ("Atendimento" e "Ajuda com o pedido nº…"), em Ajuda & Suporte e no painel de revenda ("Denunciar");
  - Meus ingressos mostra quando o ingresso entrou na portaria.
- **Testes:** `server/tests/portaria.test.js` (9 cenários) e o roteiro de navegador `scripts/e2e/portaria.py` (organizador, Ana e Bruno, com `--fotos` e `--axe`). O auditor de acessibilidade compartilhado (`repasse.py`) troca o tema pelo botão do header, sem recarregar, para auditar o estado atual da tela.

**Decisões**
- **Quem opera a portaria:** só o organizador dono do evento. O evento precisa estar publicado e não pode ter terminado; a portaria não exige o dia do evento, para permitir testes, como na 2.0.
- **Código:** é o próprio código do ingresso (único), comparado sem diferenciar maiúsculas.
  - Código de outro evento é recusado como "de outro evento"; código desconhecido, como "não encontrado".
  - A segunda leitura é recusada com o horário da primeira, no horário de Brasília.
- **Entrada e repasse:**
  - na entrada, um anúncio ativo é encerrado e ofertas de troca pendentes são canceladas (como a 2.0 faz com o anúncio);
  - ingresso reservado para revenda ou com convite pendente fica bloqueado até a operação terminar;
  - ingresso utilizado não é revendido, transferido, cancelado nem estornado.
- **Atendimento:**
  - ligado a exatamente um pedido da conta ou a um anúncio visível para ela (dela, comprado por ela ou ainda à venda, o que permite denúncia);
  - responde e muda a situação o organizador do evento. Na 2.0 era o administrador, que só passa a ter acesso ao banco na etapa 6;
  - quem pediu acompanha o histórico e responde enquanto o atendimento não estiver encerrado; o organizador pode reabrir;
  - limite de 10 atendimentos em aberto por conta (429).
- **Privacidade:** a portaria mostra só o primeiro nome de quem entrou. O organizador vê o nome completo de quem abriu o atendimento sobre o evento dele.

**Testes executados (bancos e contas descartáveis)**
- `npm test`: site 10/10; API 69/69 em MariaDB 10.11.14 e em MySQL 8.0.46 (60 anteriores e 9 novos), sem testes pulados.
- Sabotagens propositais, todas acusadas pelos testes:
  - outro organizador operando a portaria;
  - troca mantendo o código;
  - entrada sem controle de uso único;
  - organizador vendo atendimentos de outros eventos.
- Navegador (Chromium 158 com Playwright, API e MariaDB reais). `scripts/e2e/portaria.py` passou em:
  - **portaria:** entrada liberada (com código em minúsculas), segunda leitura e código inexistente recusados, contagem de entradas e "Utilizado" em Meus ingressos;
  - **denúncia:** feita pelo atalho do painel de revenda;
  - **atendimento:** aberto pelo pedido, resposta da organização com "Em análise", resposta da conta e encerramento;
  - **celular:** 390 px sem rolagem lateral;
  - nenhum erro além das recusas esperadas da portaria.
- Regressão: `navegador.py` (`regressao`, `compra` e `recusado`) e `repasse.py` passaram. Logs da API sem erros.
- axe 4.14.1: zero violações automáticas em 12 combinações da etapa 5 e em 20 da etapa 4.
  - A regressão encontrou uma violação que eu tinha introduzido: o link novo de Meus pedidos tinha um nome acessível diferente do texto visível (WCAG 2.5.3).
  - Corrigido: o link agora se chama "Ajuda com o pedido nº…".
- O header continua cabendo nas 13 larguras testadas com os 5 itens do menu do organizador. O build passou e não há arquivo novo fora do padrão do Prettier (os 51 antigos continuam iguais).

**Pendências e riscos**
- **Cancelamento de evento:** na 2.0, o cancelamento estorna os pedidos e invalida os ingressos de uma vez. Na Entrega 1 isso ainda não existe: mudar o evento para outra situação fecha a portaria e a venda, mas os ingressos e estornos continuam individuais. Fica para a etapa 6.
- **Administrador:** ainda não responde atendimentos nem opera a portaria (etapa 6, com a aprovação de contas).
- **Portaria simulada:** sem câmera, sem leitura offline e sem trava de dia ou horário do evento.
- **Achado da etapa 4:** o histórico de trocas da main continua em aberto.
- **Próximo passo:** aguardar a confirmação do usuário para publicar ou para começar a etapa 6.

## Integração com a TrocaTicket 2.0 — etapa 4: revenda, fila de espera e transferência com aceite (26/11/2026)

Retomada a partir do ZIP de continuidade: bundle verificado (requer b477108) e branch integracao-site-2.0 avançada por fast-forward de 92c66f5 para 1e0396f antes das alterações. A pendência registrada em "Interrupção durante a etapa 4" (servidor da etapa 4 ausente) foi resolvida nesta rodada. Etapa 4 concluída; nada foi publicado e não houve merge.

**O que entrou**
- `server/repasse.js` (novo), adaptado de reservas-fila.js, transferencias.js e contexto.js da 2.0. Rotas: `GET/POST /api/anuncios`, `DELETE /api/anuncios/:id`, `POST /api/anuncios/:id/reservar`, `GET/POST /api/fila`, `DELETE /api/fila/:id`, `GET/POST /api/transferencias` e `POST /api/transferencias/:id/aceitar|recusar|cancelar`. Todas exigem sessão de conta de usuário, CSRF e Idempotency-Key nas gravações.
- `server/pedidos.js`: a reserva de um anúncio é um pedido da etapa 3 ligado a ele (`pedido.anuncio_id`).
  - Pagamento aprovado passa o ingresso ao comprador com código novo.
  - Recusa, cancelamento, saída da fila ou prazo vencido devolvem o anúncio à venda e chamam o próximo da fila.
  - A lotação ignora reservas de revenda, porque o ingresso já existe.
  - O limite de 6 por conta e evento passa a contar convites pendentes.
  - O estorno ignora ingressos já repassados ou em repasse.
  - O pedido só mostra o código do ingresso a quem ainda é dono dele.
  - As transações de pedido usam READ COMMITTED; as reservas de anúncio vencidas são tratadas por evento.
- `server/server.js`: as trocas da main recusam ingresso anunciado ou com convite pendente (e o repasse recusa ingresso em troca). A lista de ingressos ganhou `inResale`, e o estorno no cancelamento vale só para ingresso nunca repassado.
- `server/MIGRACAO_REPASSE.sql` revisada:
  - restrições nomeadas, ON DELETE e índices por conta;
  - CHECK do tipo na fila;
  - situação `expired` na fila, com atualização automática dos bancos que aplicaram a primeira versão do arquivo;
  - conferência final que deve voltar vazia.
- Site:
  - `Resale.jsx`: listas reorganizadas e nomes de quem envia ou recebe o convite.
  - Meus ingressos: selo "Em repasse" e ações de troca e cancelamento ocultas nesse estado.
  - Meus pedidos: indicação "Revenda" e ingresso repassado sem código.
  - `index.html`: o logotipo virou favicon, o que eliminou o 404 de `/favicon.ico` no console.
- Testes: `server/tests/repasse-regras.test.js` (10 cenários novos), além dos 6 de `repasse.test.js`. O roteiro de navegador `scripts/e2e/repasse.py` usa três contas e aceita `--fotos` e `--axe`.

**Decisões**
- **Teto de revenda:** é o valor que o dono atual pagou (`ingresso.preco`), equivalente a min(original, custo) da 2.0. A revenda passa o preço pago ao comprador; o convite aceito zera o teto, então quem recebeu de graça só transfere de graça.
- **Código do ingresso:** troca a cada revenda ou transferência, equivalente à credencial revogada da 2.0. O antigo dono deixa de ver o código.
- **Estorno:**
  - compra de revenda não tem estorno;
  - ingresso que já foi revendido ou transferido não gera estorno, mesmo se voltar a quem o comprou;
  - ingresso anunciado ou com convite pendente fica fora do estorno.
- **Fila:**
  - tem prioridade sobre a reserva direta;
  - quem está no limite de 6 é pulado e continua na fila;
  - reserva vencida marca `expired`; recusa, cancelamento e saída marcam `left`; pagamento marca `completed`.
- **Convite:**
  - vale por 24 horas (`CONVITE_MINUTOS`), em vez dos 10 minutos do MVP da 2.0;
  - só para conta de usuário (tipo 1);
  - o e-mail só precisa ter o formato mínimo, porque o cadastro atual aceita e-mails com espaço;
  - o status de aprovação da conta ainda não é exigido (fica para a etapa 6).
- **Privacidade:** anúncios de outras contas não mostram vendedor nem ingresso.
- **Ordem das travas:** sempre começa pelo evento, como nos pedidos. As trocas da main travam só os ingressos, e a exclusividade é conferida depois dessa trava.

**Testes executados (bancos e contas descartáveis)**
- `npm test`: site 10/10; API 60/60 em MariaDB 10.11.14 e em MySQL 8.0.46 (44 anteriores, 6 do roteiro e 10 novos), sem testes pulados.
- Sabotagens propositais, todas acusadas pelos testes:
  - troca ignorando revenda;
  - código mantido na revenda;
  - fila ignorando o limite.
- Migração, nos dois bancos:
  - um banco com a versão antiga de MIGRACAO_REPASSE.sql foi atualizado para a nova, ganhou `expired` e manteve os dados;
  - a nova versão foi reaplicada duas vezes;
  - a instalação do zero foi feita duas vezes.
- Navegador (Chromium 158 com Playwright, API e MariaDB reais). `scripts/e2e/repasse.py`, com as contas Vera, Ana e Bruno, passou em:
  - **revenda:** anúncio, reserva pelo evento, pagamento em Meus pedidos, código novo e anúncio "Vendido";
  - **fila:** posição 1, anúncio entregue direto à fila e pagamento concluído;
  - **transferência:** recusa, cancelamento, aceite, teto zero e só a opção gratuita;
  - **celular:** 390 px sem rolagem lateral;
  - nenhum erro de console e nenhuma resposta 4xx ou 5xx.
- Regressão: `navegador.py` passou nos fluxos `regressao` (inclui o seletor da demonstração, que estava pendente), `compra` e `recusado`. Logs da API sem erros.
- axe 4.14.1: zero violações automáticas em 20 combinações (5 estados × 1366 e 390 px × tema claro e escuro). A auditoria automática não substitui uma revisão humana.
- Build passou, com o aviso conhecido de tamanho do chunk. Prettier: nenhum arquivo novo fora do padrão (os 51 que já falhavam continuam iguais).

**Pendências e riscos**
- A aprovação de conta não é exigida para revender, entrar na fila ou receber convite (etapa 6).
- O convite informa se existe uma conta de usuário com aquele e-mail, como na 2.0.
- As trocas da main mantêm o código do ingresso quando ele muda de dono. A portaria (etapa 5) deve considerar isso.
- O achado do histórico de trocas da main continua em aberto.
- Próximo passo: aguardar a confirmação do usuário para publicar ou para começar a etapa 5 (portaria e atendimento).

## Refinamento da integração 2.0 em 25/11/2026

A base anterior à integração 2.0 é b477108. O pacote de entrada foi recuperado em uma árvore separada. O HEAD inicial conferido foi 92c66f59be649b33e5f70ae683352492f37627e0, posterior à compra simulada (1b69903). O ZIP de entrada é a fonte desta retomada.

O refinamento recebido inclui o cabeçalho responsivo, o início por perfil no logotipo, o seletor exclusivo da demonstração, a âncora “Como funciona?”, as telas de seleção e de início do Usuário e os ajustes de tema. A tag da seleção é “Usuário”; a tag da apresentação pública é “Participante”. Os identificadores internos da API continuam os mesmos.

Em 26/11 o usuário autorizou seguir com o material disponível. A home do Fornecedor recebeu um painel com atalhos de inventário e propostas, totais calculados sobre as oportunidades e filtros. Usamos as telas existentes do perfil e a imagem do Painel Geral como referência de estilo. Chromium com conta real confirmou cadastro/login, totais da API, busca, limpeza do filtro, inventário, retorno pelo logo e largura em 390 e 1366 px.

**Resultados antes da etapa 4.** Site 10/10 e API 44/44 com MariaDB, sem testes pulados. Na home do Usuário com sessão real, os cards mostraram estados vazios e mudaram após salvar favorito, publicar mensagem e pagar um pedido simulado. A navegação pelos quatro cards e o retorno aos estados vazios também passaram. Compra aprovada e recusada foram verificadas em Chromium. A regressão geral passou no fluxo real; o seletor da troca de perfil na demonstração foi ajustado e a última repetição completa ainda precisa ser conferida. Novos roteiros em scripts/e2e/navegador.py e compra.py. A auditoria axe 4.14.1 registrou zero violações automáticas em oito estados, dois temas e duas larguras (32 combinações). Houve nós sobre imagens que exigem revisão humana. A busca no Painel Geral escuro mediu 15,53:1. Resultado bruto incluído no ZIP.

**Interrupção durante a etapa 4 da versão 2.0.** A rota /repasses, a tela Resale.jsx, a migração MIGRACAO_REPASSE.sql, sua inclusão no preparador de banco e seis cenários em server/tests/repasse.test.js já estão na árvore. A implementação de servidor desta etapa está pendente. O front compilou na passagem (aviso de tamanho do JS). Os resultados 10/10 + 44/44 são anteriores aos testes de repasse. Não há validação ponta a ponta de revenda, fila ou transferência. Nenhum push ou merge.

## Histórico das etapas anteriores

Etapa 1 verificada por comparação de árvores Git. Branch local integracao-main-miguel criada a partir de main (24f169a). Referência alteraçõesMiguel (5d93188). A Entrega 1 foi confirmada pelo usuário. Inventário e decisões individuais em DIAGNOSTICO.md. Nenhum checkpoint anterior nas duas branches ou na branch integracao-visuais-miguel. O conector GitHub recusou criar a branch remota (HTTP 403).
Etapa 2 implementada: styles.css, workspace.css, access.css, main.jsx, Navbar e ForumPage. O tema usa os tokens da referência e sincroniza o iframe com a barra de navegação. Avatar do fórum recuperado. Inspeção de imports realizada; verificação em navegador na etapa 4.
Etapa 3 implementada em App, Layout, Account, Home, UserHome, Events, Icon e PapoBanner. A rota / usa isAuthenticated da main. Conta demonstrativa não ativa a home pessoal. Nome da sessão criada pela API, eventos publicados, favoritos da store e ingressos via serviço da main. Catálogo e carrossel compartilham a consulta. Notificações demonstrativas do fórum foram substituídas por convite à comunidade.

## Etapa 4 — verificação de 25/11/2026

Código testado até ab9c116. A instalação com npm ci exigiu cache temporário gravável. Builds do fórum e da aplicação passaram. Vite emitiu aviso sobre o tamanho do chunk principal (aproximadamente 642 kB antes de gzip). O build foi servido por Vite preview. API Express da main, MariaDB 11.8 local e esquema SCRIPT_BANCO_V2.sql versionado. Conta temporária e dois eventos futuros criados só no banco descartável.

- Chromium/Playwright: home pública, banner, toggle, preferência após recarregar, login pelo formulário, saudação com nome do banco, sessão após recarregar, carrossel automático de dez segundos e avanço manual, logout e retorno à home pública passaram. A home autenticada foi verificada em 1366 e 390 px nos dois temas. Nenhum erro JavaScript observado nesse fluxo.
- Auditoria axe de contraste em 30 caminhos principais nos dois temas, com perfis de demonstração para áreas internas. Mais quatro caminhos internos do fórum (comunidade, publicação, editor e 404) nos dois temas. Ajustados botões, textos auxiliares, superfícies de gestão, badges e avatares. A última passagem em cada caminho testado retornou zero violações automáticas de contraste. A auditoria cobre estados renderizados, sem incluir toda combinação de modal, dados e interação. Playwright local usado porque o plugin Browser não estava disponível.
- HTTP 200 na API real para login, consulta do usuário e catálogo publicado. HTTP 500 em favoritos, ingressos, listagem e solicitações de troca e mensagens da comunidade. O esquema indicado pelo README não contém evento_favorito, troca_ingresso, comunidade_mensagem ou a coluna ingresso.disponivel_troca. O README menciona MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql, ausente nas árvores das branches comparadas. A verificação integral da etapa 4 ficou pendente nesta rodada e foi concluída na retomada abaixo.
- Git confirmou servidor e Entrega 2 idênticos à main. A criação remota pelo conector e o push em modo de verificação via HTTPS foram negados com HTTP 403. Nenhum merge. O bundle incremental acompanha a entrega e requer o commit base da main.

## Etapa 4 — retomada com migração complementar (25/11/2026)

Branch recuperada do bundle em clone novo de 2026-2-NCC2/Projeto6. A main continua em 24f169a. HEAD conferido em 87e2ce2 antes das alterações. Ambiente: Node 22.23, npm ci no servidor, no site e no fórum, build do fórum e do site sem erro (só o aviso conhecido de chunk acima de 500 kB). Os builds não alteraram arquivos versionados.

**Busca da migração oficial.** MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql não existe nas 23 branches remotas, no histórico completo (git log --all) nem no repositório pessoal do usuário. Nenhum commit contém CREATE TABLE das tabelas ausentes. O diagrama diagrama_banco_v2.svg também não as tem. O README da Entrega 1 diz que o script base atual dispensa a migração, mas o SCRIPT_BANCO_V2.sql versionado não tem essas estruturas.

**Diagnóstico.** Cada um dos 93 comandos SQL de server/server.js foi preparado no banco criado pelo SCRIPT_BANCO_V2.sql: 30 falharam. Faltavam:
- tabelas evento_favorito, troca_ingresso, comunidade_mensagem e evento_fornecedor;
- coluna ingresso.disponivel_troca;
- colunas fornecedor_detalhes.endereco, notificacoes e dois_fatores_ativo.

Além das quatro áreas do participante, a lista de eventos do organizador e os fornecedores do evento também respondiam HTTP 500.

**Decisão (autorizada pelo usuário).** Criada migração complementar, não oficial, com o nome citado no README: documentos/Entrega 1/FULL STACK/TrocaTicket/server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql. Nenhum código, nenhum arquivo da Entrega 2 e nenhum SCRIPT_BANCO_V2.sql foi alterado.
- Pode ser reaplicada: CREATE TABLE IF NOT EXISTS e ALTER condicionado ao information_schema (o MySQL 8 não aceita ADD COLUMN IF NOT EXISTS). Não apaga dados.
- Termina com uma consulta de conferência que deve voltar vazia.
- Tipos e chaves seguem as consultas do servidor: chave composta em favoritos e vínculos (a API usa INSERT IGNORE), texto da comunidade com até 500 caracteres, status da troca restrito a Pendente/Aceita/Recusada/Cancelada e ON DELETE CASCADE nas chaves estrangeiras novas.
- Não há CHECK entre os dois ingressos da troca, porque o MySQL 8 proíbe CHECK em coluna com ação de chave estrangeira. A API já valida esse caso.

**Banco (somente instâncias descartáveis locais).**
- MariaDB 10.11.14: o banco com dados de teste foi migrado duas vezes sem erro e manteve os dados. A instalação do zero (script base + migração duas vezes) também passou. A conferência acusou 21 ausências antes e 0 depois. As chaves estrangeiras recusaram favorito de evento inexistente e troca com ingresso inexistente.
- MySQL 8.0.46: script base + migração duas vezes sem erro, conferência de 21 para 0 e 93 de 93 comandos do servidor preparados sem erro.

**API real (Express da main sobre MariaDB), antes e depois da migração.**

| Rota | Antes | Depois |
| --- | --- | --- |
| GET /api/usuarios/:id/favoritos | 500 | 200 |
| GET /api/usuarios/:id/ingressos | 500 | 200 |
| GET /api/trocas/ingressos?usuarioId | 500 | 200 |
| GET /api/usuarios/:id/trocas | 500 | 200 |
| GET /api/comunidade/mensagens?usuarioId | 500 | 200 |
| GET /api/eventos?organizadorId | 500 | 200 |
| GET /api/organizadores/:id/eventos/:id/fornecedores | 500 | 200 |

Login, consulta do usuário e catálogo publicado continuaram em 200. Gravações após a migração:
- favoritar 204 e desfavoritar 204;
- reserva simulada 201;
- anunciar para troca 204, propor troca 201 e aceitar troca 200, com titularidade trocada;
- publicar mensagem 201 e remover mensagem 204;
- cancelar ingresso 204;
- ler e salvar o perfil do fornecedor com endereço, notificações e 2FA 200;
- vincular e desvincular fornecedor 204, com vínculo repetido ignorado.

Nenhum erro novo apareceu no log da API.

**Navegador (Chromium/Playwright, build no Vite preview).** Em 1366 px, 25 de 25 verificações passaram:
- home pública e login pelo formulário (200);
- "Bem-vindo de volta, Ana Teste!";
- troca do tema claro para o escuro, mantida após recarregar, com a sessão preservada;
- Favoritos com o evento salvo;
- Meus ingressos com as seções da conta, disponíveis para troca e solicitações;
- Comunidade lendo, publicando e removendo mensagem;
- Sair apagando a sessão e levando a /entrar, com a home pública mantida após recarregar.

As respostas vistas pelo navegador foram todas 200, 201 ou 204, sem 5xx e sem erros de JavaScript ou console. Em 390 px (iPhone 13), no tema claro, a home pessoal, ingressos, comunidade e favoritos não tiveram 5xx nem rolagem horizontal. Comportamentos do site que o roteiro precisou respeitar, sem alteração no site:
- o login grava a sessão depois de buscar o usuário e navegar para "/";
- a store carrega os favoritos ao iniciar a sessão;
- Sair leva para /entrar.

**Achado fora do banco (não corrigido, server.js idêntico ao da main).** GET /api/usuarios/:id/trocas usa o dono atual do ingresso solicitado. Depois de uma troca aceita, quem propôs vê "Proposta recebida" e quem aceitou deixa de ver a troca no histórico. A correção exige mudar o servidor ou registrar o dono original na troca.

**Publicação.** A branch integracao-main-miguel foi publicada no GitHub por um colega com permissão de escrita, a partir do bundle, no commit b477108. Esse commit tem autoria de Tiago Urias e o Claude como coautor. Conferido por leitura do remoto: conteúdo idêntico, 6 commits à frente da main e main inalterada.

## Integração com a TrocaTicket 2.0 — etapa 1: login com sessão (25/11/2026)

Branch integracao-site-2.0-etapa1-sessao, criada a partir de integracao-main-miguel (b477108). A comparação mostrou que a TrocaTicket 2.0 (documentos/Site/TrocaTicket 2.0) e a Entrega 1 usam bancos e APIs diferentes. O usuário escolheu manter a Entrega 1 como base e trazer a 2.0 por etapas, aceitando mudar a API da main. A etapa 1 adapta o login com sessão da 2.0 (server/src/auth.js).

**Problema que motivou a etapa.** O servidor confiava no ID enviado pelo site. requireUserRole e requireOrganizer só verificavam se o ID tinha o perfil pedido, e 6 rotas não verificavam nada: GET e PUT /usuarios/:id, POST e DELETE /usuarios/:id/foto e PUT /usuarios/:id/senha. Qualquer pessoa podia ler ou alterar outra conta trocando o número. O login também aceitava o próprio hash do banco como senha, porque comparava o texto guardado com o texto enviado.

**O que mudou.**
- server/MIGRACAO_SESSAO_LOGIN.sql (novo): tabela sessao (resumo SHA-256 do cookie, token CSRF, criação, expiração e revogação em UTC). Pode ser reaplicada e termina com conferência vazia.
- server/sessao.js (novo): cookie tt_session httpOnly, SameSite=Lax, Path=/api, 8 h (SESSION_HOURS) e Secure opcional (COOKIE_SECURE). Também faz:
  - token CSRF exigido em toda gravação, exceto login e cadastro;
  - bloqueio de origens fora da lista (CORS_ORIGINS; padrão localhost e 127.0.0.1 nas portas 5173 e 4173) e CORS com credenciais;
  - limite de 10 tentativas por e-mail e IP em 15 minutos;
  - comparação de senha em tempo constante, mesmo sem a conta existir;
  - conversão automática, no primeiro login, de senhas antigas em texto puro para bcrypt;
  - proteção contra fixação de sessão no novo login e limpeza de sessões vencidas.
- server/server.js:
  - origem, CORS e carregamento da sessão no início;
  - requireUserRole e requireOrganizer passam a exigir que o ID seja o da conta logada (401 sem sessão, 403 para outra conta), sem mudar URL nem corpo das rotas;
  - as 6 rotas sem verificação passaram a ter;
  - login com sessão, limite de tentativas e o mesmo formato de resposta, mais csrfToken;
  - novas rotas GET /api/sessao e POST /api/logout;
  - o cadastro abre a sessão, e o retorno 400 deixou de prender a conexão do banco (12 cadastros incompletos seguidos travavam o pool de 10);
  - a troca de senha encerra as outras sessões.
- Site:
  - services/api.js ganhou apiFetch, que manda o cookie e o token CSRF, e trata a sessão expirada. As 24 chamadas à API nos serviços passam por ela.
  - A URL padrão da API usa o mesmo host em que o site foi aberto. Antes, o site em 127.0.0.1 chamava localhost:3000, e o navegador trataria isso como outro site e não enviaria o cookie.
  - Store.jsx confere a sessão ao abrir o site: restaura a conta numa aba nova e encerra a sessão local vencida. Quando a API responde 401, leva para /entrar. Limpeza e navegação acontecem na mesma transição; sem isso, o Layout redirecionava para /perfis.
  - Account.jsx guarda o token no login e no cadastro, e Navbar.jsx encerra a sessão no servidor ao sair.
- README.md e server/.env.example: ordem de instalação com as duas migrações, endereço da API, novas variáveis e seção de segurança atualizada. A frase que dizia que o script base dispensava a migração foi corrigida.

**Testes (somente bancos descartáveis).**
- API, 73 de 73 em MariaDB 10.11 e em MySQL 8.0.46:
  - contas, eventos e uma reserva da participante criados pela própria API num MySQL vazio;
  - cookie com os atributos certos e só o resumo dele no banco;
  - 9 tentativas de usar outra conta recebem 403, inclusive alterar nome, senha e foto, e o banco não mudou;
  - sem login, 401;
  - rotas públicas continuam abertas;
  - token CSRF ausente, inventado ou de outra sessão recebe 403;
  - origem desconhecida é recusada (403), inclusive na pré-verificação CORS;
  - o hash usado como senha deixou de funcionar;
  - conta antiga em texto puro entra e é convertida;
  - a 11ª tentativa recebe 429, sem afetar outra conta;
  - cadastro com sessão, troca de senha encerrando outra sessão, fixação, expiração e logout funcionam;
  - fluxos completos de participante, organizador e fornecedor passam.
- Prepare de todos os comandos SQL: 93 do server.js e 8 do sessao.js sem erro no MySQL 8.
- Chromium/Playwright:
  - fluxo da etapa 4, 25 de 25;
  - sessão, 17 de 17: login em 127.0.0.1 e em localhost; cookie invisível para o JavaScript; aba nova já logada; sair numa aba leva a outra ao formulário de entrar; sessão vencida leva a /entrar; cadastro pelo site usa a API; modo demonstração intacto;
  - nenhum 5xx e nenhum erro de JavaScript.
- Ajustes feitos só nos roteiros de teste:
  - esperar um elemento exclusivo da tela de Favoritos, porque o carrossel da home também mostra o evento;
  - usar e-mail único por rodada no teste de limite;
  - localizar a sessão pelo resumo exato.

**Limitações conhecidas.**
- O status de aprovação da conta (status_aprovacao) ainda não é exigido.
- O limite de tentativas fica na memória e é por e-mail e IP; muitas contas diferentes a partir do mesmo IP não são limitadas, como na 2.0.
- Sem HTTPS, o cookie não é marcado como Secure.
- A Entrega 2 não foi alterada e continua com o servidor antigo.

## Integração com a TrocaTicket 2.0 — etapa 2: testes automáticos e iniciador (25/11/2026)

Continuação na mesma branch local, renomeada para integracao-site-2.0, com um commit por etapa. O usuário prefere publicar só no final.

**O que mudou.**
- server/scripts/preparar-banco.js (novo) prepara o banco a partir dos SQL versionados (SCRIPT_BANCO_V2.sql e as duas migrações), para qualquer nome de banco:
  - cria o banco e aplica tudo se ele não existir;
  - num banco existente, só aplica as migrações, que podem ser reaplicadas;
  - recusa banco de outro sistema e nomes inseguros;
  - confere o resultado de cada migração;
  - exige MySQL 8.0.16+ ou MariaDB 10.5+;
  - nunca apaga dados.

  O iniciador e os testes usam o mesmo módulo.
- server/tests (novo), com node:test, como na 2.0:
  - unidade.test.js, sem banco: origem e CORS, CSRF, própria conta, senha e conversão do texto puro, limite de tentativas, nomes de banco e versões;
  - api.test.js: a bateria manual da etapa 1 transformada em 14 testes (sessão, abuso, senha, troca de senha, logout e fluxos completos);
  - banco.test.js: banco novo, reaplicação, banco antigo, banco alheio, tabela com formato diferente e nome inseguro;
  - apoio.js: cria um banco temporário trocaticket_teste_… por arquivo, sobe a API numa porta livre e apaga o banco no fim. Nunca usa DB_NAME. Sem MySQL configurado, os testes de integração são pulados com o motivo.
- scripts/iniciar.mjs, Iniciar-TrocaTicket.cmd (Windows, CRLF) e Iniciar-TrocaTicket.command (Mac, executável), novos, adaptados da 2.0:
  - conferem o Node 22.12+ e as portas 3000 e 5173;
  - rodam npm ci quando falta dependência;
  - na primeira vez (ou com "configurar"), perguntam a conexão com a senha oculta e a guardam em server/.env com permissão 600, só depois de preparar o banco com sucesso;
  - sobem a API e o site (Vite em 127.0.0.1:5173, sem as variáveis DB_* no processo do site) e abrem o navegador;
  - encerram tudo com Enter, Ctrl+C ou ao fechar a janela; os registros ficam em logs/.

  A 2.0 protegia a senha com o Windows (PowerShell/DPAPI). Aqui a conexão fica no server/.env, como já indicava o README, para funcionar também no Mac e ser testável.
- server/server.js só abre a porta quando executado diretamente e exporta o app para os testes.
- server/db.js passou a aceitar DB_PORT; antes, só a porta 3306 funcionava.
- package.json do site (npm start e npm test), server/package.json (start, test e preparar-banco), README.md, COMO-RODAR.md e server/.env.example (DB_PORT).

**Testes (somente bancos descartáveis).**
- npm test: 26 de 26 em MariaDB 10.11 (cerca de 7 s) e em MySQL 8.0.46 (porta 3308). Nenhum banco temporário ficou para trás. Sem MySQL, os 6 testes de unidade passam e as duas suítes de integração aparecem como puladas.
- Sabotagem proposital, depois desfeita:
  - sem a checagem de própria conta, 3 testes falharam;
  - sem a proteção CSRF, 3 testes falharam;
  - com os arquivos restaurados, 26 de 26.
- Iniciador numa cópia limpa da pasta (sem node_modules, sem .env e sem logs), pelo atalho do Mac:
  - A: primeira vez — instalou, perguntou, criou o banco, guardou a conexão com permissão 600 e subiu API e site (200); Enter encerrou os dois e liberou as portas;
  - B: segunda abertura — sem perguntas, só migrações;
  - C: porta 5173 ocupada — mensagem clara e código 1, sem processos sobrando;
  - D: senha errada — mensagem clara e conexão não guardada;
  - E e F: configurar, com senha contendo espaço, # e os dois tipos de aspas — guardada com a delimitação certa, lida igual pelo dotenv e pelo iniciador, e reabertura funcionando;
  - G: MySQL 8 na porta 3308.
- Chromium no site aberto pelo iniciador: cadastro, home pessoal com o nome, ingressos, favoritos e comunidade, publicação e saída, sem 5xx, 401, 403 inesperados ou erros de JavaScript.
- Regressão da etapa 1 com o código novo: navegador 25 de 25 e 17 de 17, API 73 de 73, sem erros no log.
- Ajustes feitos só no roteiro de teste do iniciador: o atalho do Mac espera Enter depois de uma falha, e o roteiro passou a reconhecer o fim pela mensagem "API e site encerrados".

**Limitações conhecidas.**
- O iniciador não foi executado num Windows real. O .cmd segue o mesmo formato do da 2.0 e chama o mesmo script Node testado aqui.
- A senha do MySQL fica em texto no server/.env, ignorado pelo Git.
- O iniciador usa as portas fixas 3000 e 5173.

## Integração com a TrocaTicket 2.0 — etapa 3: compra simulada completa (25/11/2026)

Mesma branch local integracao-site-2.0, com um commit por etapa. A etapa adapta o fluxo de pedidos da 2.0 (mvp_pedido, mvp_estorno, mvp_idempotencia e transacoes/pagamentos.js) ao banco e às telas da Entrega 1.

**O que mudou.**
- server/MIGRACAO_PEDIDOS_PAGAMENTOS.sql (novo) cria:
  - a tabela pedido, com situação, prazo da reserva, forma de pagamento simulada e motivo;
  - a coluna ingresso.pedido_id;
  - a tabela estorno, com um registro por ingresso devolvido;
  - a tabela pedido_idempotencia, com a chave por ação e a resposta guardada.

  Pode ser reaplicada, termina com uma conferência vazia e entrou no preparar-banco.js.
- server/pedidos.js (novo) concentra as regras:
  - **Reserva:** 15 minutos (RESERVA_MINUTOS), com a lotação contando ingressos ativos mais reservas no prazo, no máximo 6 por conta e evento e declaração obrigatória para meia-entrada.
  - **Pagamento simulado:** Pix ou cartão, sem dados de pagamento. PAGAMENTO_SIMULADO define aprovado, recusado ou indisponível. Aprovado emite os ingressos ligados ao pedido; evento gratuito dispensa a forma de pagamento.
  - **Cancelamento e expiração:** reserva não paga pode ser cancelada; reserva vencida vira "expirado".
  - **Estorno:** até a véspera do evento, só dos ingressos que continuam com quem comprou, com as trocas pendentes canceladas. Rotas: GET /api/pedidos, GET /api/pedidos/:id, POST /api/pedidos e POST /api/pedidos/:id/{pagar,cancelar,estornar}.
  - **Proteção de acesso:** sessão de participante; pedido de outra conta responde 404.
  - **Idempotency-Key:** obrigatória em toda gravação de pedido.
- server/server.js:
  - POST /api/eventos/:id/ingressos continua com o mesmo formato e a mesma resposta 404 para evento indisponível, mas agora cria um pedido já pago ("direto") e respeita o limite por conta;
  - PUT /api/ingressos/:id/cancelar registra o estorno quando quem cancela é quem comprou, e recusa (409) depois que o evento começa;
  - a lista de ingressos ganhou orderId, refundOnCancel e cancellable.
- Site:
  - A compra na página do evento passou a ter dois passos ("Confirmar pedido" → "Pagamento simulado"): prazo visível, escolha Pix ou cartão, cancelamento da reserva e aviso ao fechar no meio.
  - A nova página Meus pedidos (/pedidos, src/pages/Orders.jsx) mostra situação, forma de pagamento, códigos dos ingressos e valor estornado, com as ações pagar, cancelar e solicitar estorno com confirmação.
  - Meus ingressos ganhou o atalho para pedidos e o botão "Cancelar e estornar" ou "Cancelar ingresso", conforme a origem do ingresso.
  - Outros arquivos: menu com "Meus pedidos", proteção da rota em Layout, services/orders.js, components/PaymentChoice.jsx (reaproveita .sp-radio-cards) e algumas regras de espaçamento em workspace.css.
  - Cada ação usa uma Idempotency-Key, reaproveitada quando a requisição fica sem resposta.
- README.md e server/.env.example: fluxo, regras, variáveis e ordem das três migrações.

**Problema encontrado e corrigido durante os testes.** Com cliques simultâneos usando a mesma chave, as repetições disputavam a trava do registro, e o banco derrubava uma delas por deadlock (500).

Correções:
- a leitura da resposta guardada passou a ser simples, sem FOR UPDATE;
- deadlocks são repetidos até 3 vezes;
- reservas vencidas passaram a ser marcadas fora da transação, e a contagem e o pagamento conferem o prazo diretamente.

Depois disso, pedidos.test.js passou em 8 de 8 rodadas seguidas.

**Testes (somente bancos descartáveis).**
- npm test: 44 de 44, três rodadas em MariaDB 10.11 e duas em MySQL 8.0.46. Entraram 15 testes de pedidos e 3 de unidade:
  - reserva, pagamento aprovado, recusado, indisponível e gratuito;
  - mesma chave e chave com outro conteúdo (409); 5 cliques simultâneos com a mesma chave criam 1 pedido;
  - 4 pedidos simultâneos para 2 lugares resultam em 2 de 201 e 2 de 409;
  - meia-entrada, lotação, limite de 6, cancelamento e reserva vencida;
  - estorno parcial depois de uma troca, ingresso recebido em troca sem estorno e rota antiga gerando estorno;
  - evento já começado (409);
  - pedido de outra conta (404), organizador (403) e sem login (401).
- Chromium no build:
  - fluxo de compra, 17 de 17: cartão, ingresso ligado ao pedido, estorno, meia-entrada com declaração, fechar no meio, cancelar reserva e celular sem rolagem horizontal, sem 5xx nem erros de JavaScript;
  - pagamento recusado, 5 de 5.
- Auditoria axe nas telas novas (os dois passos do modal, Meus pedidos com reserva aberta e Meus ingressos), nos dois temas:
  - nenhuma violação de contraste;
  - a falta de h2 em Meus pedidos foi corrigida;
  - persiste o aviso label-content-name-mismatch no logotipo e no selo do usuário do menu, que já existia e também aparece em Meus ingressos.
- Regressão: navegador 25 de 25 e 17 de 17; API 73 de 73; nenhum erro no log.
- Iniciador: um banco da etapa 2 no MySQL 8 recebeu a migração nova ao abrir, com os dados preservados.

**Limitações conhecidas.**
- Do fluxo da 2.0, não foram trazidos a falha simulada do emissor e a recuperação da entrega, nem o estorno depois do evento via atendimento (etapa 5).
- O cenário de pagamento é definido pelo servidor (variável de ambiente), sem tela de administração (etapa 6).

## Escopo dos arquivos

Além dos três documentos na raiz e do avatar em public/images, mudaram na Entrega 1 os estilos src/{access,forms,home,moderation,report,shared,styles,supplier,workspace}.css, src/{App,main}.jsx, src/components/{Events,Icon,Layout,Navbar,PapoBanner}.jsx e src/pages/{Account,ForumPage,Home,UserHome}.jsx. O tema do fórum também exigiu forum/src/store/ForumContext.jsx, forum/src/styles.css, forum/src/data/forum.js e o bundle em public/forum. A retomada da etapa 4 acrescentou server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql e atualizou CHECKPOINT.md e HANDOFF.md. A etapa 1 da integração com a 2.0 acrescentou server/sessao.js e server/MIGRACAO_SESSAO_LOGIN.sql. Ela também alterou server/server.js, server/.env.example, README.md, src/services/{api,community,events,supplier,tickets}.js, src/context/Store.jsx, src/pages/Account.jsx e src/components/Navbar.jsx. A etapa 2 acrescentou server/scripts/preparar-banco.js, server/tests/{apoio.js,unidade.test.js,api.test.js,banco.test.js}, scripts/iniciar.mjs, Iniciar-TrocaTicket.cmd e Iniciar-TrocaTicket.command. Ela também alterou server/server.js, server/db.js, server/package.json, server/.env.example, package.json, README.md e COMO-RODAR.md. A etapa 3 acrescentou server/MIGRACAO_PEDIDOS_PAGAMENTOS.sql, server/pedidos.js, server/tests/pedidos.test.js, src/pages/Orders.jsx, src/services/orders.js e src/components/PaymentChoice.jsx. Ela também alterou server/server.js, server/scripts/preparar-banco.js, server/tests/{unidade,banco}.test.js, server/.env.example, src/pages/Participant.jsx, src/App.jsx, src/components/{Navbar,Layout}.jsx, src/services/tickets.js, src/workspace.css e README.md. O inventário completo por caminho é reproduzível com git diff --name-status origin/main...HEAD.
