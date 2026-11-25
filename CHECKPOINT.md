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

## Escopo dos arquivos

Além dos três documentos na raiz e do avatar em public/images, mudaram na Entrega 1 os estilos src/{access,forms,home,moderation,report,shared,styles,supplier,workspace}.css, src/{App,main}.jsx, src/components/{Events,Icon,Layout,Navbar,PapoBanner}.jsx e src/pages/{Account,ForumPage,Home,UserHome}.jsx. O tema do fórum também exigiu forum/src/store/ForumContext.jsx, forum/src/styles.css, forum/src/data/forum.js e o bundle em public/forum. A retomada da etapa 4 acrescentou server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql e atualizou CHECKPOINT.md e HANDOFF.md. O inventário completo por caminho é reproduzível com git diff --name-status origin/main...HEAD.
