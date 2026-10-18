# Estudar o TrocaTicket pelas aulas

A versão 0.4.2 reorganiza a aplicação existente. Não cria outro site nem troca o banco. Os exemplos continuam fictícios, as rotas e os formatos da API foram mantidos.

## Caminho de uma ação

1. Uma página em `src/mvp/paginas/` ou nos demais módulos de tela exibe os campos e recebe a ação.
2. `src/mvp/api.js` faz a requisição com `fetch`, sessão e tratamento de falha.
3. O Express recebe a rota em `server/src/catalog.js`, `b2b.js` ou `transacoes/rotas.js`.
4. Validadores conferem os dados; a autorização identifica a conta e o proprietário.
5. Repositórios ou serviços de transação consultam/gravam o MySQL.
6. A resposta atualiza o estado React. Uma falha permanece visível para o usuário.

## Correspondência com as aulas fornecidas

| Aula  | Conceito                                      | Onde estudar no projeto                                                 |
| ----- | --------------------------------------------- | ----------------------------------------------------------------------- |
| 01–02 | HTML semântico, CSS e responsividade          | JSX das páginas e estilos em `src/`                                     |
| 03–05 | Funções, validação, cálculos e erros          | `src/services/rules.js`, `server/src/validadores/` e `http.js`          |
| 06–07 | Componentes, props, estado e efeitos          | `src/mvp/paginas/EditarEvento.jsx` e `componentes/CategoriasEvento.jsx` |
| 08    | Rotas, links, parâmetros e 404                | `src/mvp/IntegratedApp.jsx`                                             |
| 09    | Express, JSON e códigos HTTP                  | `server/src/app.js`, `catalog.js` e `b2b.js`                            |
| 10    | Pool MySQL e repositórios separados das rotas | `server/src/db.js` e `server/src/repositorios/`                         |
| 11–12 | Autenticação, autorização, validação e erros  | `server/src/auth.js`, `passwords.js`, `validadores/` e `app.js`         |

O padrão foi aproximado das aulas: páginas menores, componentes por props, funções nomeadas, SQL nos repositórios e validação separada. Os nomes novos são em português; nomes antigos de exportações e campos JSON continuam onde preservam a compatibilidade.

## Páginas de negócio

O antigo `Business.jsx` passou a encaminhar as importações para oito arquivos: MeusEventos, EditarEvento, CatalogoFornecedores, OrcamentoEvento, InventarioFornecedor, OportunidadesFornecedor, PrepararProposta e MinhasPropostas. Componentes compartilhados pequenos ficam em `src/mvp/componentes/`.

Para estudar uma edição, comece em `EditarEvento.jsx`, acompanhe o envio pelo cliente API e encontre a rota correspondente em `catalog.js`. O SQL fica em `repositorios/catalogoRepositorio.js`, com parâmetros separados dos valores do usuário.

## Regras dos ingressos

`server/src/transacoes/servico.js` só monta o serviço. As funções foram agrupadas em reservas/fila, pagamentos, transferências, carteira/portaria e atendimento/configuração. O contexto compartilhado centraliza a mesma transação, locks e prazos; não abre uma transação independente para cada função.

Fila, concorrência, teto por aquisição e repetição idempotente ultrapassam os exemplos básicos dos starters. Esses mecanismos são necessários para os fluxos solicitados. Seus testes e comentários explicam os motivos; não foram retirados para encurtar o código.

## Diferenças que continuam existindo

As aulas de autenticação utilizam **bcrypt e JWT**. O TrocaTicket continua com **scrypt e sessão opaca em cookie HttpOnly, acompanhada de CSRF**. Essa escolha foi mantida para preservar contas e funcionamento. Portanto, o projeto acompanha os conceitos e a separação didática, mas não é uma cópia literal da implementação do professor.

O projeto também tem hooks compartilhados de consulta e envio, idiomas e preferências. Eles resolvem repetições de várias telas; vale estudar primeiro `useState`, `useEffect` e `fetch` e depois ler `src/mvp/shared.jsx`.

Os starters disponíveis contêm exercícios/TODOs e não incluem a rubrica completa. Não é possível garantir uma nota ou afirmar que escolhas técnicas diferentes foram exigidas pelo professor.

## Rodar verificações

Na raiz: `npm.cmd test`, `npm.cmd run format:check` e `npm.cmd run build`. Na pasta `server`: `npm.cmd test`. Testes de integração com MySQL são separados e optativos; veja o roteiro técnico se precisar reproduzi-los. O iniciador normal não executa ensaios de escrita no seu banco pessoal.

`src/pages/` e `src/LegacyApp.jsx` pertencem ao protótipo anterior, disponível apenas no modo `VITE_APP_MODE=demo`. Para estudar a aplicação integrada atual, comece em `src/mvp/`. Esse modo antigo foi preservado para consulta, não é a origem das transações MySQL.
