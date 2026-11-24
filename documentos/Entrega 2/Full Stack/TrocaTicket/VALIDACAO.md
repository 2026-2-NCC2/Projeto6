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
