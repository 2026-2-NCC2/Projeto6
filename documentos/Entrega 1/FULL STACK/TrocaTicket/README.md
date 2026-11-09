# TrocaTicket — React e API Node.js

Site navegável baseado nas 21 telas únicas exportadas do Figma. Inclui áreas de participante, organizador, fornecedor e administrador. A interface usa React, React Router e Vite; o servidor Node.js conecta contas e eventos de organizadores ao MySQL.

## Abrir no VS Code

1. Extraia o ZIP e abra a pasta **TrocaTicket** no VS Code (Arquivo → Abrir Pasta).
2. Instale o Node.js LTS 22.12 ou superior, com npm, e configure o MySQL.
3. Crie o banco executando `documentos/Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql`.
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

Abra o endereço exibido pelo Vite. A API fica em `http://localhost:3000/api`; para outro endereço, defina `VITE_API_URL` no ambiente do Vite. Use **Explorar demo** para acessar as telas sem persistência no banco. Para cadastrar eventos no MySQL, entre com uma conta de organizador cadastrada na API.

No PowerShell, caso a execução de `npm.ps1` esteja bloqueada, use `npm.cmd install` e `npm.cmd run dev`.

Também é possível usar `pnpm install --frozen-lockfile` e `pnpm dev`, aproveitando o lockfile incluído.

## O que funciona

- **Participante:** busca por nome/local, filtro por cidade, favoritos, avaliações, reservas simuladas, ingressos e mensagens da comunidade persistidos no MySQL. Participantes podem anunciar ingressos para troca, propor trocas diretas e aceitar, recusar ou cancelar solicitações. Nenhum pagamento é processado e os ingressos simulados não são válidos para entrada.
- **Organizador:** painel, visualização em grade/lista, filtros, cadastro e edição de eventos no MySQL, vínculo persistente de fornecedores cadastrados aos eventos, consulta dos itens ativos do catálogo do fornecedor, revisão de propostas recebidas, decisão de aprovação, estimativa de orçamento, publicação e cancelamento. Eventos de demonstração continuam locais e separados das contas.
- **Fornecedor:** perfil e preferências, oportunidades baseadas em eventos publicados, inventário persistido (adicionar, editar, desativar, reativar e exportar), rascunhos e propostas persistidos, com cálculo do total por quantidade e preço unitário. CSV é salvo item a item e informa importações parciais.
- **Administrador:** painel, busca, relatórios e moderação são demonstrativos e aparecem apenas no modo demo; ainda não há operações de administração conectadas ao banco.
- **Perfil:** dados de demonstração, foto, preferências e cancelamento das alterações não salvas.
- **Geral:** menu móvel, estados vazios, carregamento, falha com nova tentativa, formulários validados, modais com foco contido e fechamento por Escape, avisos de ação e página 404.

## Dados e limitações

O catálogo inicial é carregado assincronamente de `public/data/events.json`. Eventos publicados, produtos/serviços, propostas, favoritos, avaliações, mensagens da comunidade, ingressos simulados e trocas de ingressos de contas reais usam a API e o MySQL. Para a compra simulada, o servidor valida evento publicado, capacidade e quantidade; a troca transfere a titularidade dos dois ingressos em uma transação, sem pagamento.

Em uma instalação nova, execute `SCRIPT_BANCO_V2.sql`. Em um banco existente, aplique `MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql`; ela cria os vínculos de fornecedores, favoritos, trocas e mensagens da comunidade, e pode ser reaplicada com segurança para completar estruturas ausentes. A migração não é necessária depois de criar o banco com a versão atual do script base. A cotação usa os itens ativos do inventário do fornecedor como linhas da oferta; o modelo atual não contém edital com itens requisitados ou teto de orçamento, então a tela não trata o preço do ingresso como teto da proposta.

Mensagens da comunidade na demonstração permanecem locais e separadas das contas. Ingressos comprados pela interface são reservas simuladas persistidas no banco, não geram um ingresso válido para entrada nem acionam pagamento. Dados locais da demonstração sem conta usam `trocaticket-v2`; o perfil escolhido fica no `sessionStorage`. Para os fluxos conectados, mantenha a API e o MySQL em execução conforme as instruções de instalação.

**Não há autenticação/autorização de produção.** As rotas recebem IDs do cliente e verificam perfil/propriedade no banco, mas não usam sessão ou token para comprovar a identidade; IDs podem ser falsificados. Cadastro envia senha e documento à API, que armazena a senha com bcrypt e o documento no banco. Use somente dados fictícios: não exponha a API sem TLS e autenticação real. A opção 2FA é apenas uma preferência salva, não ativa segundo fator; e-mail não é verificado e o histórico de acesso é demonstrativo. Ingressos e trocas são registros acadêmicos simulados, não geram validação na portaria, pagamento ou reembolso. OAuth, chat em tempo real e relatórios PDF não foram conectados; os fluxos correspondentes são demonstrações locais e/ou exportações CSV. O modo demo usa dados fictícios somente quando escolhido sem conta; contas autenticadas carregam registros da API, não exibem ações para entrar/sair do demo e não usam reservas ou mensagens demonstrativas.

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
