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

## Atualização de 23/09/2026 — protótipo com 27 exports

- Sete testes automatizados de regras aprovados: datas e horários, moeda, reserva, totais de cotações, CSV, dados persistidos e busca sem acentos.
- Carteira: preço negativo recusado; anúncio por R$ 700 salvo e mantido após recarregar; retirada de anúncio; transferência fictícia e reversão verificadas pela interface.
- Fornecedores: filtro Campinas retorna PalcoMix; detalhes levam ao novo evento com esse parceiro selecionado; abas de materiais e propostas abrem corretamente.
- Detalhes do organizador: links de editar/consolidar presentes e botão de reserva ausente.
- Configurações: perfil de administrador e de participante correspondem à área navegada.
- Carteira e fornecedores conferidos em desktop (1280 px) e celular (390 px). Carteira, fornecedores, perfil, detalhes e cotação conferidos em 320 px sem transbordamento horizontal da página após correção. Tabelas mantêm rolagem interna.
- Contexto compartilhado separado do componente Provider para corrigir erro observado durante atualização automática do código. Sessão nova terminou sem erros no console.
- Prévia de exportação CSV abre com conteúdo disponível para copiar. A gravação pelo gerenciador de downloads do navegador e o salvamento PDF pelo diálogo de impressão não foram confirmados automaticamente.
- Imagens e arquivos de código mantidos no pacote; node_modules, caches e dados pessoais do navegador excluídos.

Não é uma certificação de ausência de qualquer erro. Autenticação, pagamentos, transferência real, custódia e emissão de ingressos continuam fora do escopo do front-end demonstrativo.

## Revisão adicional — versão 0.4.1

Correções:

- Editar evento publicado mantém seu status e a presença no catálogo; botão passa a indicar Salvar alterações.
- Capacidade não pode ficar abaixo das reservas ativas, inclusive ingressos anunciados. Cancelamentos liberam capacidade.
- Restauração dos dados preserva registros válidos, remove ids duplicados e limpa campos opcionais inválidos (confirmações, preços, itens de proposta, destinatário e preço de revenda).
- Valores monetários não aceitam booleanos, null ou arrays convertidos implicitamente em números.
- Rascunhos de cotação com quantidade incorreta de preços usam os valores iniciais corretos.
- Alterações na carteira mantêm o ingresso selecionado na primeira página e limpam o filtro de status para que ele continue visível.
- Validação de login pendente não redireciona após sair da tela; requisições canceladas não sobrescrevem o catálogo.

Verificação desta revisão:

- 11 testes automatizados aprovados, incluindo respostas válidas/inválidas da API, falhas HTTP e abortamento.
- Build de produção e formatação aprovados.
- 21 rotas abriram com título principal e sem excesso de largura em 390 px, incluindo 404. Nenhum erro capturado no console nessa passagem.
- Testes de interação confirmaram: edição mantém publicação; reserva fracionada bloqueada; capacidade inferior a dois ingressos reservados bloqueada; nova tentativa recupera catálogo após falha simulada.
- Referências estáticas às imagens locais verificadas sem arquivos ausentes.

As verificações são específicas aos casos acima. Não substituem testes de backend ou transações reais, que não existem neste projeto.
