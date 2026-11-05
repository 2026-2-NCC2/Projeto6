# TrocaTicket — Front-end React

Site navegável baseado nas 21 telas únicas exportadas do Figma. Inclui áreas de participante, organizador, fornecedor e administrador. React, React Router, Vite e CSS responsivo, sem backend.

## Abrir a versão pronta

Este pacote inclui `dist/` compilado. Com Node.js 22.12 ou superior instalado, abra a pasta TrocaTicket no terminal e execute:

```sh
npm start
```

Abra **http://127.0.0.1:4173**. Esse comando não precisa instalar dependências. Para ver rapidamente os quatro perfis, acesse **http://127.0.0.1:4173/perfis**. As rotas também funcionam ao recarregar a página.

## Editar no VS Code

1. Extraia o ZIP e abra a pasta **TrocaTicket** no VS Code (Arquivo → Abrir Pasta).
2. Instale o Node.js LTS 22.12 ou superior, com npm. Se o terminal não reconhecer `npm`, feche todas as janelas do VS Code e reabra após instalar.
3. No terminal, dentro da pasta que contém `package.json`:

```sh
npm install
npm run dev
```

Abra o endereço exibido no terminal. Abra **/perfis** para acessar os quatro perfis sem cadastro. Alternativamente, use dados fictícios no formulário: e-mail válido, senha com 8 caracteres e documento com 11 ou 14 dígitos. A validação do documento verifica somente formato e comprimento; não consulta CPF/CNPJ.

No PowerShell, caso a execução de `npm.ps1` esteja bloqueada, use `npm.cmd install` e `npm.cmd run dev`.

Também é possível usar `pnpm install --frozen-lockfile` e `pnpm dev`, aproveitando o lockfile incluído.

## O que funciona

- **Participante:** busca por nome/local, filtro por cidade, favoritos persistentes, detalhes com abas, escolha de entrada, cálculo de quantidade e valor, reserva/cancelamento simulados e comunidade local.
- **Organizador:** painel, visualização em grade/lista, filtros, cadastro e edição de evento, prévia, capa local de até 2 MB, vinculação de fornecedores, orçamento calculado, confirmação de pendências, publicação e cancelamento. Um evento publicado aparece no catálogo do participante.
- **Fornecedor:** oportunidades, pesquisa e ordenação, cotações com cálculo em tempo real, rascunhos, envio local, filtros de propostas e detalhes. Inventário permite adicionar, editar, desativar, reativar, pesquisar e exportar itens.
- **Administrador:** painel, busca e paginação de lotes, relatórios, gráfico por setor/canal, exportação CSV e detalhes. Moderação exige revisar os critérios antes de aprovar e exige justificativa ao recusar; permite reabrir análise.
- **Perfil:** dados de demonstração, foto, preferências e cancelamento das alterações não salvas.
- **Geral:** menu móvel, estados vazios, carregamento, falha com nova tentativa, formulários validados, modais com foco contido e fechamento por Escape, avisos de ação e página 404.

## Dados e limitações

O catálogo inicial é carregado assincronamente de `public/data/events.json`. Para testar erro, abra `/eventos?erro=1` e clique em **Tentar novamente**.

Alterações de eventos, inventário, propostas, reservas, comunidade, perfil e favoritos ficam no `localStorage` deste navegador sob `trocaticket-v2`. O perfil escolhido fica no `sessionStorage`. Ao marcar **Lembrar de mim**, somente o e-mail ou nome de usuário fictício fica em `trocaticket-demo-email`; nenhuma senha é salva. Limpar os dados do site restaura a demonstração inicial. As alterações feitas durante a verificação do navegador não estão dentro do ZIP.

**Não há autenticação ou autorização reais.** Qualquer perfil é acessível para avaliação acadêmica. Senhas e documentos de cadastro não são enviados nem armazenados. Use somente dados fictícios, inclusive no perfil. Reservas não geram ingressos válidos, pagamentos, contratos, e-mails, notificações externas ou verificação de identidade. Os botões Google e Apple exibem um aviso de integração pendente. O formulário de senha e a preferência 2FA são demonstrações visuais: não alteram credenciais nem ativam proteção real. OAuth, chat em tempo real, importação XLSX/CSV e relatórios PDF não foram conectados; os controles implementados oferecem demonstrações locais e exportações CSV. A cotação usa itens de exemplo para demonstrar o cálculo; não integra estoque real.

As imagens não fornecem camadas, fontes ou regras de interação. O layout foi reconstruído em componentes, com ajustes de responsividade, consistência e acessibilidade. Alguns símbolos e textos foram adaptados. Datas e nomes fictícios do material foram mantidos como exemplos, sem confirmação de existência dos eventos.

## Organização do código

| Arquivo / pasta             | Responsabilidade                                           |
| --------------------------- | ---------------------------------------------------------- |
| `src/App.jsx`               | Rotas e páginas institucionais                             |
| `src/components/Layout.jsx` | Cabeçalho, navegação por perfil, rodapé                    |
| `src/components/UI.jsx`     | Campos, painéis, modais, badges e exportação CSV           |
| `src/context/Store.jsx`     | Estado compartilhado e persistência local                  |
| `src/data/demo.js`          | Eventos, fornecedores, inventário e pessoas fictícias      |
| `src/services/events.js`    | Carregamento assíncrono do catálogo                        |
| `src/pages/Home.jsx`        | Página inicial                                             |
| `src/pages/Account.jsx`     | Entrada, cadastro, recuperação e escolha de perfil         |
| `src/pages/Participant.jsx` | Catálogo, detalhes, ingressos e comunidade                 |
| `src/pages/Organizer.jsx`   | Painel, editor, consolidação e fornecedores                |
| `src/pages/Supplier.jsx`    | Oportunidades, cotações, propostas e inventário            |
| `src/pages/Admin.jsx`       | Painel, relatórios e moderação                             |
| `src/pages/Profile.jsx`     | Configurações de perfil                                    |
| `src/components/Icon.jsx`   | Ícones SVG compartilhados e marcas de acesso social        |
| `src/access.css`            | Fidelidade das telas de acesso, seleção de perfil e perfil |
| `scripts/serve.mjs`         | Servidor local da versão pronta, sem dependências externas |
| `src/styles.css`            | Estilos da página inicial                                  |
| `src/workspace.css`         | Estilos compartilhados das áreas internas e breakpoints    |
| `public/images`             | Imagens originais extraídas do arquivo fornecido           |
| `reference/screens`         | Referências visuais exportadas pelo usuário                |

## Correspondência com as telas recebidas

| Tela de referência | Página implementada                               |
| ------------------ | ------------------------------------------------- |
| 1                  | `/`                                               |
| 2, 11, 12          | `/cadastro`, com seleção de perfil                |
| 3                  | `/entrar`                                         |
| 4                  | `/organizador`                                    |
| 5                  | `/organizador/novo`                               |
| 6                  | `/organizador/eventos/primavera/consolidar`       |
| 7                  | `/eventos/lollapalooza`                           |
| 8                  | `/organizador/eventos/primavera/editar`           |
| 9, 10              | `/perfil`, nos perfis organizador e administrador |
| 13                 | `/perfis`                                         |
| 14                 | `/fornecedor`                                     |
| 15                 | `/eventos`                                        |
| 16                 | `/admin`                                          |
| 17                 | `/admin/relatorios/tim-maia`                      |
| 18                 | `/admin/moderacao`                                |
| 19                 | `/fornecedor/inventario`                          |
| 20                 | `/fornecedor/propostas`                           |
| 21                 | `/fornecedor/cotacao/tim-maia`                    |

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

Consulte `VALIDACAO.md` para os fluxos e tamanhos de tela verificados. A versão de produção fica em `dist/` após executar o build; `node_modules/` não é incluído no ZIP; `dist/` é incluído para abrir com `npm start`.

## Origem e revisão desta entrega

Esta entrega aproveita o front-end que já estava em `documentos/Entrega 1/FULL STACK/TrocaTicket`, na branch `TelasFórum` de [2026-2-NCC2/Projeto6](https://github.com/2026-2-NCC2/Projeto6/tree/TelasF%C3%B3rum/documentos/Entrega%201/FULL%20STACK/TrocaTicket).

Foram revisados os formulários de acesso e cadastro, o seletor de perfis, os campos de configuração de conta, os ícones compartilhados e a responsividade dos detalhes de eventos. O cabeçalho de acesso segue a referência sem navegação extra. O perfil acompanha a área aberta diretamente pela URL. O servidor local permite navegar e recarregar qualquer rota.

Os dados de painéis e gráficos são fictícios e alguns textos, ícones e espaçamentos das áreas internas são adaptações do material; esta entrega não é uma reprodução pixel a pixel. O rodapé usa a marca TrocaTicket de forma consistente. As telas são HTML/React interativo; as imagens de `reference/screens` servem apenas para consulta.
