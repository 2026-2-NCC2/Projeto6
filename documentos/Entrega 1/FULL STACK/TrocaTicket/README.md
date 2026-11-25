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
3. Crie o banco executando, nesta ordem: `documentos/Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql`, `server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql` e `server/MIGRACAO_SESSAO_LOGIN.sql`. As duas migrações podem ser reaplicadas sem apagar dados; a última consulta de cada uma deve voltar vazia.
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

- **Unidade** (sempre rodam): regras de sessão, CSRF, origem, senha, limite de tentativas e preparo do banco.
- **Integração** (precisam de um MySQL local): API completa com sessão, tentativas de usar outra conta, CSRF, origem, senhas, limite de tentativas, troca de senha, logout, fluxos de participante, organizador e fornecedor, e o preparo do banco. Cada arquivo cria um banco temporário `trocaticket_teste_…`, sobe a API nele e o apaga no fim. **O banco da equipe (`DB_NAME`) nunca é usado.** O usuário de `server/.env` (ou das variáveis `DB_USER`/`DB_PASSWORD`) precisa ter permissão para criar bancos. Sem MySQL configurado, esses testes aparecem como pulados.

## O que funciona

- **Participante:** busca por nome/local, filtro por cidade, favoritos, avaliações, reservas simuladas, ingressos e mensagens da comunidade persistidos no MySQL. Participantes podem anunciar ingressos para troca, propor trocas diretas e aceitar, recusar ou cancelar solicitações. Nenhum pagamento é processado e os ingressos simulados não são válidos para entrada.
- **Organizador:** painel, visualização em grade/lista, filtros, cadastro e edição de eventos no MySQL, vínculo persistente de fornecedores cadastrados aos eventos, consulta dos itens ativos do catálogo do fornecedor, revisão de propostas recebidas, decisão de aprovação, estimativa de orçamento, publicação e cancelamento. Eventos de demonstração continuam locais e separados das contas.
- **Fornecedor:** perfil e preferências, oportunidades baseadas em eventos publicados, inventário persistido (adicionar, editar, desativar, reativar e exportar), rascunhos e propostas persistidos, com cálculo do total por quantidade e preço unitário. CSV é salvo item a item e informa importações parciais.
- **Administrador:** painel, busca, relatórios e moderação são demonstrativos e aparecem apenas no modo demo; ainda não há operações de administração conectadas ao banco.
- **Perfil:** dados de demonstração, foto, preferências e cancelamento das alterações não salvas.
- **Geral:** menu móvel, estados vazios, carregamento, falha com nova tentativa, formulários validados, modais com foco contido e fechamento por Escape, avisos de ação e página 404.

## Dados e limitações

O catálogo inicial é carregado assincronamente de `public/data/events.json`. Eventos publicados, produtos/serviços, propostas, favoritos, avaliações, mensagens da comunidade, ingressos simulados e trocas de ingressos de contas reais usam a API e o MySQL. Para a compra simulada, o servidor valida evento publicado, capacidade e quantidade; a troca transfere a titularidade dos dois ingressos em uma transação, sem pagamento.

O `SCRIPT_BANCO_V2.sql` versionado não contém todas as estruturas usadas pela API. Por isso, tanto em instalação nova quanto em banco existente, aplique depois dele `MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql` (vínculos de fornecedores, favoritos, trocas, mensagens da comunidade e colunas do perfil do fornecedor) e `MIGRACAO_SESSAO_LOGIN.sql` (sessões de login). As duas ficam em `server/` e podem ser reaplicadas com segurança. A primeira é complementar: a migração oficial citada anteriormente não foi encontrada no repositório. A cotação usa os itens ativos do inventário do fornecedor como linhas da oferta; o modelo atual não contém edital com itens requisitados ou teto de orçamento, então a tela não trata o preço do ingresso como teto da proposta.

Mensagens da comunidade na demonstração permanecem locais e separadas das contas. Ingressos comprados pela interface são reservas simuladas persistidas no banco, não geram um ingresso válido para entrada nem acionam pagamento. Dados locais da demonstração sem conta usam `trocaticket-v2`; o perfil escolhido fica no `sessionStorage`. Para os fluxos conectados, mantenha a API e o MySQL em execução conforme as instruções de instalação.

**Login com sessão (adaptado da TrocaTicket 2.0).** Ao entrar ou se cadastrar, a API cria uma sessão: o navegador recebe um cookie `httpOnly` e `SameSite=Lax`, e o banco guarda só o resumo SHA-256 dele. As rotas que recebem o ID de uma conta só aceitam o ID da conta logada (401 sem sessão, 403 para outra conta). Toda gravação exige também o cabeçalho `X-CSRF-Token`, devolvido no login e em `GET /api/sessao`. A API recusa sites fora da lista de origens, limita a 10 as tentativas de login por e-mail e endereço a cada 15 minutos e encerra as outras sessões quando a senha muda. As sessões duram 8 horas (`SESSION_HOURS`). Senhas ficam em bcrypt; contas antigas com senha em texto puro ainda entram e são convertidas no primeiro login. Ainda é um projeto acadêmico: use somente dados fictícios e, fora do computador local, sirva a API com HTTPS e `COOKIE_SECURE=true`. O status de aprovação da conta ainda não é exigido, e o limite de tentativas fica na memória do servidor (zera ao reiniciar). A opção 2FA é apenas uma preferência salva, não ativa segundo fator; e-mail não é verificado e o histórico de acesso é demonstrativo. Ingressos e trocas são registros acadêmicos simulados, não geram validação na portaria, pagamento ou reembolso. OAuth, chat em tempo real e relatórios PDF não foram conectados; os fluxos correspondentes são demonstrações locais e/ou exportações CSV. O modo demo usa dados fictícios somente quando escolhido sem conta; contas autenticadas carregam registros da API, não exibem ações para entrar/sair do demo e não usam reservas ou mensagens demonstrativas.

As imagens não fornecem camadas, fontes ou regras de interação. O layout foi reconstruído em componentes, com ajustes de responsividade, consistência e acessibilidade. Alguns símbolos e textos foram adaptados. Datas e nomes fictícios do material foram mantidos como exemplos, sem confirmação de existência dos eventos.

## Organização do código

| Arquivo / pasta             | Responsabilidade                                        |
| --------------------------- | ------------------------------------------------------- |
| `src/App.jsx`               | Rotas e páginas institucionais                          |
| `src/components/Layout.jsx` | Cabeçalho, navegação por perfil, rodapé                 |
| `src/components/UI.jsx`     | Campos, painéis, modais, badges e exportação CSV        |
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
