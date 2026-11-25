# Integração TrocaTicket

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

## Escopo dos arquivos

Além dos três documentos na raiz e do avatar em public/images, mudaram na Entrega 1 os estilos src/{access,forms,home,moderation,report,shared,styles,supplier,workspace}.css, src/{App,main}.jsx, src/components/{Events,Icon,Layout,Navbar,PapoBanner}.jsx e src/pages/{Account,ForumPage,Home,UserHome}.jsx. O tema do fórum também exigiu forum/src/store/ForumContext.jsx, forum/src/styles.css, forum/src/data/forum.js e o bundle em public/forum. A retomada da etapa 4 acrescentou server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql e atualizou CHECKPOINT.md e HANDOFF.md. A etapa 1 da integração com a 2.0 acrescentou server/sessao.js e server/MIGRACAO_SESSAO_LOGIN.sql. Ela também alterou server/server.js, server/.env.example, README.md, src/services/{api,community,events,supplier,tickets}.js, src/context/Store.jsx, src/pages/Account.jsx e src/components/Navbar.jsx. A etapa 2 acrescentou server/scripts/preparar-banco.js, server/tests/{apoio.js,unidade.test.js,api.test.js,banco.test.js}, scripts/iniciar.mjs, Iniciar-TrocaTicket.cmd e Iniciar-TrocaTicket.command. Ela também alterou server/server.js, server/db.js, server/package.json, server/.env.example, package.json, README.md e COMO-RODAR.md. O inventário completo por caminho é reproduzível com git diff --name-status origin/main...HEAD.
