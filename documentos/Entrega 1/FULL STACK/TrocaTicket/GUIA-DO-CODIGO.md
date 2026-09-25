# Entendendo o projeto TrocaTicket

Este guia explica o projeto com os conceitos básicos de React e JavaScript usados nas telas. Leia os arquivos e experimente mudar os exemplos antes da apresentação.

## Por onde começar

1. `src/main.jsx` inicia o React e disponibiliza os dados compartilhados.
2. `src/App.jsx` relaciona cada endereço à sua página. Por exemplo, `/ingressos` abre `Wallet.jsx`.
3. `src/components/Layout.jsx` monta o cabeçalho, menu, conteúdo e rodapé.
4. `src/pages` contém as telas. Comece por `SupplierDirectory.jsx`, que usa estados, filtros e listas.
5. `src/data/demo.js` guarda dados fictícios. `public/data/events.json` simula a resposta de uma API.
6. `src/context/Store.jsx` compartilha os dados entre telas e salva alterações no navegador.

## Conceitos usados

- Um **componente** é uma função que retorna JSX (a marcação da interface).
- **Props** são informações passadas para um componente: `<Badge>Confirmado</Badge>` mostra um status.
- `useState` guarda valores que podem mudar. Na carteira, `busca` guarda o texto digitado.
- `filter` escolhe os registros que serão exibidos. `map` transforma registros em linhas ou cartões.
- `onClick`, `onChange` e `onSubmit` executam funções quando a pessoa interage.
- `useEffect` executa tarefas ligadas ao ciclo da tela, como salvar alterações no armazenamento local.
- `Link` muda de página dentro da aplicação. `useParams` lê um id presente no endereço.
- `fetch` carrega os eventos de forma assíncrona. A interface mostra carregamento, erro ou resultados.

## Exemplo: como a revenda funciona

Em `Wallet.jsx`, a pessoa seleciona um ingresso e abre o formulário. A função `confirmar` verifica o preço usando `validAmount`. Se estiver correto, `alterarIngresso` cria uma cópia do ingresso com status `Anunciado` e chama `update`. O React atualiza a tela e o Store salva o resultado no localStorage.

A mesma ideia é usada para transferir, cancelar e desfazer uma transferência. Tudo é uma simulação; não há venda real.

## Por que usar componentes compartilhados?

`Panel`, `Field`, `Modal` e `Badge` evitam repetir a mesma marcação em todas as páginas. As páginas continuam usando funções e estados comuns, sem Redux, classes ou uma biblioteca de componentes adicional.

## Como apresentar e testar

1. Abra os quatro perfis pela tela `/perfis`.
2. Mostre o filtro de fornecedores e vincule um parceiro a um novo evento.
3. Cadastre e consolide um evento, depois publique para aparecer no catálogo.
4. Simule uma reserva e abra a carteira de ingressos.
5. Demonstre revenda, transferência e as mensagens de validação.
6. Recarregue a página para mostrar a persistência no navegador.
7. Abra `/eventos?erro=1` para demonstrar o erro de carregamento e tentar novamente.
8. No terminal, execute `npm test` e `npm run build`.

## O que ainda depende de backend

Login real, controle de acesso, pagamentos, e-mails, contratos, QR Code válido e histórico de autenticação. O botão da carteira abre a impressão do navegador, onde é possível escolher Salvar como PDF. Não existe geração de ingresso oficial.

## Trabalho em grupo

Usem o mesmo projeto e combinem quem altera cada página. Cada integrante deve fazer seus próprios commits no repositório. Antes de juntar alterações, comparem rotas e componentes compartilhados e rodem o build. O ZIP não cria histórico de participação dos integrantes.
