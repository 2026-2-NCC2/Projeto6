# Acessibilidade, idiomas e aparência — 17/10/2026

## Base e orientações

Esta evolução usa os arquivos da primeira entrega presentes em `documentos/Entrega 1/FULL STACK/TrocaTicket/` do repositório local `Projeto6`, versão 0.2.0. Não parte da versão 0.4.1 nem dos projetos de telas separados desta conversa.

Antes de editar foram lidos os README, VALIDACAO, código e configurações relevantes da primeira entrega, o relatório fornecido, a análise das aulas e as orientações disponíveis no repositório. Não foi encontrado AGENTS.md ou regra adicional do professor que impeça esta implementação. Os PDFs de cálculo/gestão e o modelo de extensão não acrescentam regras de frontend. Foram preservados os critérios acadêmicos informados: HTML semântico, CSS responsivo, componentes React, formulários validados, rotas e carregamento assíncrono com erro visível.

Foram consultados os nós do Figma 2:60 (painel), 2:112 (idiomas), 2:147 (mobile) e 9:58 (escuro), com screenshots e contexto de design. A interface adapta esses componentes ao CSS e à estrutura existentes, mantendo o site da primeira entrega. Não foi instalada biblioteca visual, framework de CSS ou dependência nova.

O arquivo de pesquisa é referência técnica. A ferramenta de dicionário sugerida ali não foi incluída porque não faz parte do pedido atual. Não houve publicação, push, commit, branch, PR ou alteração de configurações remotas.

## Funcionalidades

- Painel acessível pelo cabeçalho e pelo botão flutuante, em todas as rotas.
- Fonte de 100% a 200%, em passos de 25%. Tamanhos existentes foram convertidos de px para rem, mantendo a aparência padrão e respeitando a escala do navegador.
- Alto contraste independente do tema, fonte local Verdana/Tahoma, quatro níveis de espaçamento de letras e linhas e links sublinhados/destacados.
- Temas Claro, Escuro e Sistema, com listener de preferência do dispositivo e aplicação inicial antes do React para reduzir o flash de tema incorreto.
- Prévia imediata: fechar sem salvar desfaz o rascunho. Restaurar padrão prepara os valores originais; Salvar confirma e persiste. Quando o armazenamento falha, as alterações salvas permanecem em memória e há um aviso.
- Idiomas português brasileiro, inglês, espanhol, francês, alemão e italiano. A troca de idioma é imediata, persiste e atualiza `html.lang` e o título da página.
- Tradução organizada por grupos de mensagens, sem API de tradução, DOM rewriting ou substituição de nomes de pessoas e eventos. Os dados de negócio e filtros mantêm suas chaves originais; a tradução ocorre na exibição.
- Números e datas formatados pelo locale selecionado; moeda permanece BRL.
- Dialog nativo com foco contido, Escape, fechamento externo e retorno ao botão de abertura. Painel mobile em formato de folha inferior com rolagem, controles nativos rotulados e foco visível.

Preferências usam somente `trocaticket-ui-preferences-v1`, com schema versionado e validação. `trocaticket-v2` e `trocaticket-role` permanecem com seus formatos originais. Alterações dessas preferências em outra aba são sincronizadas.

## Libras

A integração usa o script oficial do [VLibras Widget](https://www.vlibras.gov.br/doc/widget/installation/webpageintegration.html), carregado somente após clicar em Ativar VLibras. Não há cópia local nem execução antecipada do script externo. O serviço v7 inicializa o próprio widget; o carregador espera o botão oficial ficar disponível e evita carregamento duplicado, com timeout e nova tentativa em caso de erro.

Para usar o tradutor, escolha português, ative-o e feche o painel pelo botão indicado. O botão oficial permite abrir o intérprete. VLibras traduz português para Libras, requer internet e pode depender de recursos gráficos do navegador. Sua sinalização automática não substitui intérprete humano nem foi avaliada linguisticamente nesta entrega. A área não promete tradução para outras línguas de sinais. Não há contratação/licença Hand Talk.

## Arquivos

Novos: `src/accessibility/` (preferências, provider, diálogo, controles e carregador VLibras), `src/i18n/` (runtime e mensagens), `src/accessibility.css`, `src/appearance.css`, `src/context/StoreContext.js`, `public/ui-preferences-init.js`, `tests/preferences.test.js`, `tests/i18n.test.js`, `tests/vlibras.test.js` e este documento.

Modificados: `src/main.jsx`, `src/components/Layout.jsx`, `src/components/UI.jsx`, `src/components/Events.jsx`, `src/context/Store.jsx`, todas as páginas existentes, `src/App.jsx`, `src/styles.css`, `src/workspace.css`, `index.html`, `package.json`, `vite.config.js`, `README.md` e `VALIDACAO.md`. `src/data/demo.js`, `src/services/events.js` e `public/data/events.json` receberam apenas formatação para atender à verificação já disponível.

O catálogo reúne 662 mensagens em cada um dos cinco idiomas adicionais. O build separa as traduções em um arquivo próprio para manter os pacotes abaixo do alerta de tamanho do Vite. As verificações e os resultados estão registrados em VALIDACAO.md.

O contexto comercial foi separado do componente Provider para evitar o erro de contexto nulo observado durante Fast Refresh. Seu contrato de dados foi mantido. O modal compartilhado também passou a distinguir clique no conteúdo de clique no fundo e seu botão fechar tem type=button.

## Executar e verificar

Na pasta que contém package.json:

```sh
npm install
npm run dev
npm test
npm run format:check
npm run build
```

Requer Node.js >=22.12. No Windows com restrição ao npm.ps1, use npm.cmd. A instalação e as verificações também podem usar pnpm e o lockfile existente. Não é necessário instalar dependências adicionais para estas funções. O dev server informa a URL local disponível.

Checklist manual:

1. Abra o painel, altere fonte, espaçamentos e links; confira o resultado e salve. Recarregue.
2. Altere uma opção e feche com Escape: o último salvamento deve ser restaurado, com foco no botão de abertura.
3. Selecione Escuro; ative e desative alto contraste. Ao desativá-lo, o tema escolhido deve reaparecer.
4. Selecione Sistema e altere a aparência do dispositivo. A escolha Claro/Escuro deve prevalecer quando selecionada explicitamente.
5. Troque entre os seis idiomas; navegue entre home, login, perfis e áreas internas. Digite num formulário antes de trocar para conferir preservação do texto.
6. Em 390px ou 320px, abra o painel, role até o final e use fonte em 200%.
7. Ative VLibras com internet; se indisponível, confira erro e nova tentativa.

## Limites

A base continua sendo o frontend demonstrativo da primeira entrega: não foram adicionados backend, autenticação, pagamentos ou tradução de conteúdo gerado por usuários. Textos dentro de imagens e nomes próprios mantêm o conteúdo original. Os controles nativos de data/arquivo também seguem a linguagem do navegador/sistema. As mensagens traduzidas podem receber revisão editorial pela equipe.

Esta entrega não constitui certificação WCAG ou auditoria completa de todas as telas. A aparência padrão foi preservada; eventuais problemas anteriores da base que não se relacionam às funcionalidades solicitadas permanecem sob avaliação própria.
