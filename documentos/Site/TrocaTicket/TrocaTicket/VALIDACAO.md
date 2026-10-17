# Validação da entrega

Verificação realizada em 22/09/2026.

## Build e código

- Build de produção com Vite concluído, sem avisos.
- Arquivos React, JavaScript, CSS, JSON e README formatados com Prettier.
- Plugin oficial React configurado para atualização durante o desenvolvimento.
- Arquivos e imagens empacotados sem dependências instaladas, cache ou estado pessoal do navegador.

## Fluxos verificados no navegador

- Escolha do perfil e navegação para o painel do organizador.
- Formulário de evento vazio exibe erros nos campos obrigatórios.
- Criação de evento, cálculo de custos, consolidação e publicação local.
- Evento publicado mantém o estado após recarregar a página.
- Cotação inicial de R$ 114.200,00 recalculada para R$ 117.200,00 após alterar o preço unitário de 12 módulos de R$ 3.750,00 para R$ 4.000,00.
- Envio da proposta preserva o total calculado na lista de propostas.
- Adição de item ao inventário e desativação, com opção de reativação.
- Moderação bloqueia aprovação sem os três critérios conferidos; aprovação válida move o cadastro para o filtro de aprovados.
- Cadastro vazio exibe erros; formulário preenchido com dados fictícios válidos abre a área do participante.
- Favorito adicionado e reserva simulada de 2 meias-entradas, total de R$ 540,00, encontrada em Meus Ingressos.
- Falha de catálogo em `/eventos?erro=1`, recuperação por Tentar novamente, busca sem resultados e página 404.
- Imagens da página de detalhes carregadas sem erro.
- Nenhum erro de console observado na inspeção final em uma nova aba após a configuração do plugin React.

## Revisão visual e responsividade

Revisão visual em desktop (1280 px) e celular (390 px). Sem transbordamento horizontal do documento nas páginas verificadas: organizador, novo evento, oportunidades, cotação, inventário, propostas, administração, relatório, perfil e cadastro. Tabelas extensas usam rolagem dentro de seu próprio contêiner.

Foram ajustados tamanhos de títulos, espaçamento dos painéis, contraste dos estados, menu móvel, disposição dos formulários, quebra de cartões, indicadores de foco e modais.

## Limites da verificação

Teste manual dos principais fluxos; não constitui cobertura automatizada completa. O clique de exportação CSV foi executado sem erro de console, mas o navegador integrado não confirmou o evento de download; confirme o salvamento no Chrome/Edge ao avaliar essa função. Não houve teste de autenticação, pagamentos, e-mail ou serviços reais, pois não há backend nesta entrega.

## Atualização local — acessibilidade, idiomas e aparência (17/10/2026)

Base: primeira entrega (0.2.0), em documentos/Entrega 1/FULL STACK/TrocaTicket do repositório Projeto6. Os registros anteriores deste arquivo foram preservados.

Verificações concluídas:

- Sete testes Node aprovados: sanitização, persistência e falha de storage, independência tema/contraste, inicialização antecipada, catálogos/interpolação, preservação de conteúdo sem tradução e carregamento único/nova tentativa do VLibras.
- 662 mensagens por idioma adicional, com paridade de chaves, conteúdo não vazio e parâmetros preservados em inglês, espanhol, francês, alemão e italiano.
- Prettier aprovado em src, public/data, script de inicialização, testes, configuração e documentos. Três arquivos antigos exigiram somente formatação: data/demo.js, services/events.js e public/data/events.json.
- Build Vite aprovado sem alertas após separar o catálogo de traduções em um arquivo de produção próprio: aplicação aproximadamente 361 kB, traduções 193 kB e CSS 63 kB antes de gzip.
- No navegador: mudanças reais de fonte, letras, linhas, família tipográfica, links, tema e alto contraste; salvar/recarregar; cancelar prévia; restaurar padrão; Escape e retorno de foco; Sistema resolvendo a preferência do dispositivo.
- Troca de idioma preservou texto digitado no formulário do organizador. Os seis idiomas foram conferidos na versão compilada.
- Passagem por 23 rotas, incluindo áreas públicas, perfil, catálogo, organizador, fornecedor, administrador e 404. Telas internas verificadas em 390px sem transbordamento horizontal da página. Detalhes de evento usam carregamento assíncrono, portanto o título pode aparecer após a primeira leitura.
- Painel mobile alemão a 200%: corrigido excesso de largura nos botões; painel ficou com largura interna igual à largura rolável (374px em viewport390px). Rolagem vertical preservada.
- Contexto comercial separado do Provider após erro de Fast Refresh durante desenvolvimento. Na aba nova com versão compilada, nenhum erro de console foi observado.
- VLibras oficial carregou uma única vez e abriu sua interface v7.12.2. A sinalização completa do avatar e sua qualidade linguística não foram avaliadas; o serviço continua dependente de conexão e recursos gráficos.
- Referências de teclado/labels/foco/modal mantidas; não é certificação WCAG ou auditoria automatizada de todas as combinações.

Limites: não foi feita alternância real da aparência do sistema operacional durante o teste; a resolução foi verificada por testes e pelo modo Sistema no navegador atual, e o listener está implementado. A base continua demonstrativa, sem backend/autenticação/pagamentos. Não foram realizadas operações de gravação Git, alterações remotas ou publicação.
