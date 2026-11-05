# Validação desta entrega — 31/10/2026

## Resultado

- `npm ci --no-audit --no-fund`, `npm run build` e `npm run format:check`: concluídos com sucesso.
- As 21 referências têm páginas/estados correspondentes; veja a tabela de rotas no README.
- 42 verificações de carregamento: 21 estados no tamanho nativo das referências e os mesmos 21 em 390 × 844.
- Todos retornaram HTTP 200, renderizaram conteúdo e terminaram sem erros de JavaScript/console, imagens quebradas ou rolagem horizontal da página.
- O bundle compilado entregue corresponde aos arquivos de código desta pasta.

## Ambiente e limites da verificação

A execução local do ambiente de trabalho não permitiu rede, servidor HTTP ou Chromium. Por isso o build e a inspeção foram executados em uma sessão temporária do Firecrawl, usando Node, Vite e Chromium/Playwright em `http://127.0.0.1:4174`. Nenhum site foi publicado.

O plugin Browser não estava disponível. Foram capturadas telas completas e inspecionadas visualmente, junto das imagens originais. Os testes de estado usaram preenchimento de campos, seleção de opções e ativação de controles pelo DOM. Cliques físicos e teclas da sessão remota se mostraram inconsistentes; um teste instrumentado confirmou que Escape não entregava eventos keydown ao documento. Portanto, a entrega não declara validação completa de interação física por mouse/teclado ou do fechamento nativo por Escape. O evento de cancelamento do modal foi validado.

## Fluxos verificados

- Login vazio apresenta erros; mostrar/ocultar senha altera o campo; acesso válido abre os perfis.
- Lembrar de mim recupera somente o identificador. A senha de teste não apareceu no armazenamento local.
- A seleção de organizador abre o painel; o perfil mantém o contexto escolhido.
- Cancelar restaura o nome anterior; salvar fuso horário persiste após recarregar.
- Google abre o aviso de integração pendente; cancelamento do modal remove a janela.
- Cadastro rejeita confirmação de senha diferente; cadastro de fornecedor abre oportunidades.
- Pesquisa por Tim Maia deixa uma oportunidade visível.
- Duas meias-entradas totalizam R$ 540,00; confirmação cria reserva local na página de ingressos.
- Alterar o primeiro preço da cotação para R$ 4.000,00 recalcula o total para R$ 117.200,00; enviar inclui a proposta na lista local.
- Menu móvel foi aberto e a navegação para Novo Evento foi exercitada.

## Conferência visual

Referências: `reference/screens/01-0.png` a `21-0.png`. Os tamanhos nativos variam de 1280 a 1284 pixels de largura; também foi verificado celular de 390 pixels.

| Aspecto           | Conferência e ajuste                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Cores             | Fundo claro das áreas internas, cabeçalho preto, azul dos formulários e roxo dos destaques mantidos.                      |
| Formulários       | Cartão de 460 px, campos com ícones, olhos de senha, abas e opções Google/Apple aproximados das referências 02/03/11/12.  |
| Cabeçalho         | Navegação extra removida das telas de acesso; logo e barra arredondada preservados.                                       |
| Seleção de perfil | Os quatro cartões foram substituídos pelo seletor compacto da referência 13.                                              |
| Ícones            | Símbolos improvisados de acesso, perfis da home e notificações substituídos por SVG.                                      |
| Perfil            | CPF de demonstração, fuso, campos de senha, preferência 2FA e histórico local incluídos para cobrir as referências 09/10. |
| Responsividade    | Corrigida a largura mínima do grid dos detalhes, que ultrapassava a tela de 390 px.                                       |
| Imagens           | Assets originais usados como imagens reais; nenhum screenshot é usado como interface.                                     |

Textos acima da dobra das telas de acesso foram alinhados às referências, incluindo “Entrar no Sistema”, “OU CONTINUE COM” e “Selecione o tipo de perfil”. O resto do projeto mantém adaptações de conteúdo e dados demonstrativos; não é uma reprodução pixel a pixel. Alguns ícones internos, fontes, espaços, totais, contagens, textos e controles diferem das imagens. O rodapé usa TrocaTicket em vez de Ticketboom. A indicação de protótipo tem contraste maior para leitura.

## Escopo funcional

É somente front-end. Autenticação, OAuth, senha, 2FA, reserva, cotação e relatórios não se conectam a sistemas reais. Formulários de senha nunca persistem as senhas. Os dados de navegação e negócio são de demonstração e ficam neste navegador. Os testes não cobrem todos os possíveis dados, tamanhos de tela, navegadores, leitores de tela ou integrações externas.
