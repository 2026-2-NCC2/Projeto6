# Revisão de acessibilidade, aparência e idiomas

Data: 19/10/2026. Correções aplicadas ao projeto completo local e à demonstração do GitHub Pages. Nenhuma mudança em autenticação, API, SQL, dependências ou dados do MySQL.

## Correções

- Superfícies de cartões, login, formulários, tabelas, modais, notificações e rodapé usam pares de cores de cada tema. O botão Criar conta mantém texto escuro sobre fundo branco.
- Estados selecionados, erros, selos, favoritos e controles receberam cores adequadas para os modos claro, escuro e alto contraste.
- Cartões, abas, botões e resumos se reorganizam com fonte ampliada; selos longos quebram linha. Tabelas conservam sua rolagem interna.
- O painel mantém o foco em Tab/Shift+Tab e o devolve ao botão ao fechar. Aparência e alto contraste continuam independentes.
- Idiomas agora alcançam os textos estáticos das telas de demonstração, contadores, validações e rótulos acessíveis. Valores usados por filtros e dados fictícios não são traduzidos nem alterados.
- Uma atualização de preferências em outra aba preserva a prévia ainda não salva. Falhas do armazenamento permanecem sinalizadas até um salvamento bem-sucedido.
- A execução local do Vite ignora documentos e arquivos gerados, evitando falhas de observação de arquivos bloqueados pelo OneDrive. A observação de `src/` permanece ativa e foi conferida em execução.

## Validação executada

- Projeto completo: 23 testes e build de produção aprovados.
- Cópia pública: 22 testes, formatação e build aprovados.
- Matriz de 59 rotas: claro, escuro, claro com alto contraste e escuro com alto contraste; 236 verificações, sem falhas de contraste de texto sobre superfícies sólidas e sem exceções JavaScript. Cada cenário confere os atributos efetivamente aplicados antes de medir.
- Leitura no celular: 59 rotas com fonte125% e 200%, fonte legível, espaçamento máximo entre letras/linhas e links destacados. Após corrigir um selo longo do relatório, as 27 rotas de demonstração foram rechecadas sem transbordamento; as 32 rotas oficiais já haviam passado.
- Nas duas versões: efeito real da ampliação, espaçamento e fonte; salvar/recarregar; cancelar; restaurar sem apagar dados de negócio; Sistema reagindo ao dispositivo; seis idiomas; painel com fonte200%, Tab e Escape.
- Casos adicionais: sincronização entre duas abas, armazenamento removido/bloqueado, falha de quota e recuperação, carregamento do VLibras somente após clique e repetição após falha.
- Traduções: paridade de chaves e parâmetros nos cinco idiomas adicionais; 40 combinações de páginas/idiomas e 35 verificações de filtros e validações dos fluxos.

Os testes das telas oficiais usaram respostas fictícias interceptadas em um navegador isolado. Eles validam a interface, não transações do banco. O MySQL pessoal não foi acessado.

O medidor de contraste cobre texto em superfícies sólidas; imagens e gradientes não recebem uma certificação automática. A tela dos prints e o painel também foram conferidos visualmente.

## Arquivos principais

- `src/appearance.css`, `src/styles/mvp.css` e `src/accessibility.css`.
- `src/accessibility/PreferenceDialog.jsx` e `PreferencesProvider.jsx`.
- Telas em `src/pages/`, componentes compartilhados e `src/mvp/Catalog.jsx`.
- `src/i18n/index.js`, `legacyFlowMessages.js` e `personalizationMessages.js`.

## Publicação e serviço externo

Commit: `ea55def773c60119c1397ed695965e0d5e907693`.

Ajuste adicional de observação de arquivos: `3bad8773edb205b08ec4c70da2228ef12526b687`.

Endereço: https://tiago-u12.github.io/projeto-faculdade/

Publicação concluída com sucesso no [GitHub Actions](https://github.com/Tiago-U12/projeto-faculdade/actions/runs/39193773859). O endereço público passou novamente nos testes dos seis acessos, 14 rotas, imagens, persistência e controles. A tela dos prints passou em oito combinações de tema/contraste e largura, sem falhas na medição de contraste ou rolagem lateral. Resultados em `publicado-contraste.json`.

A compatibilidade do carregador VLibras foi conferida com o script oficial e a [documentação de integração](https://www.vlibras.gov.br/doc/widget/installation/webpageintegration.html). Falha e repetição foram ensaiadas com integração simulada. O funcionamento remoto depende do serviço externo; não foi feita uma avaliação humana da qualidade da tradução para Libras.

Abra a versão completa pelo `Iniciar-TrocaTicket.cmd` da raiz. A demonstração pública mantém somente dados fictícios no navegador de cada visitante. Para testar o tema, abra o botão de acessibilidade no cabeçalho e salve as preferências; use Ctrl+F5 se o navegador ainda exibir arquivos anteriores.
