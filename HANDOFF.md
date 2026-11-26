# Continuidade da integração

## Situação em 26/11/2026 — etapa 4 concluída

Branch integracao-site-2.0, a partir de b477108. A etapa 4 da 2.0 (revenda, fila de espera e transferência com aceite) está concluída e testada; detalhes, decisões e resultados estão na primeira seção de CHECKPOINT.md. Nada foi publicado e não houve merge.

Para retomar:
1. Restaure o bundle mais recente conforme o LEIA-PRIMEIRO.txt do ZIP e confira o commit esperado.
2. Em um MySQL ou MariaDB local que possa criar bancos, rode `npm test` na pasta do app (os testes criam e apagam bancos `trocaticket_teste_*`).
3. Com API e site iniciados num banco descartável, os roteiros de navegador ficam em `scripts/e2e/`: `navegador.py --fluxo regressao|compra|recusado` (o fluxo `recusado` exige a API com `PAGAMENTO_SIMULADO=recusado`) e `repasse.py [--axe caminho/axe.min.js] [--fotos pasta]`.
4. Aguarde a orientação do usuário para publicar ou avançar às etapas 5 (portaria e atendimento), 6 (administração e aprovação de contas) e 7 (idiomas). Não salve credenciais.

Objetivo do usuário: integrar na Entrega 1 o servidor, banco, autenticação, modelos, APIs e regras da main ao visual de alteraçõesMiguel. Trabalhar em branch nova e incrementalmente. Antes de editar, comparar todos os arquivos, decidir quais copiar, adaptar ou dispensar e conferir imports, assets, rotas e dependências. Substituir o tema por tokens, classes, toggle e persistência da referência e verificar legibilidade em todas as páginas nos dois temas. Integrar homes pública e autenticada com fundo estendido, elementos centralizados, banner Troca-Papo no fim e demais elementos da referência. Na home autenticada incluir cards personalizados, card interativo temporal e “Bem-vindo de volta, (nome do usuário)” usando sessão real. Preservar contratos e pedir orientação sobre ambiguidades ou riscos. Rodar build, iniciar, testar login, logout, temas, homes, rotas principais e chamadas reais à API, corrigir erros e reportar os resultados. Ao terminar a etapa 4, parar e aguardar confirmação.

Ler CHECKPOINT.md e DIAGNOSTICO.md. Conferir git status, branch, commits e diff antes de continuar do último ponto verificado. Atualizar ambos os documentos a cada etapa com decisões, arquivos, erros, soluções, testes e pendências. Documentar preventivamente no repositório ou Drive quando autorizado, sem credenciais. Quando solicitado “Transferir para o Claude” ou “Gerar checkpoint”, entregar ambos com requisitos, situação real e próximo passo. Economizar tokens sem sacrificar qualidade, segurança ou continuidade.

A aplicação integrada está em documentos/Entrega 1/FULL STACK/TrocaTicket. O esquema-base da Entrega 2 e as migrações da Entrega 1 são usados em bancos de teste.

Migração oficial ausente em todo o repositório; complementar criada com autorização e validada em bancos descartáveis. Etapa 4 concluída.
Branch integracao-main-miguel publicada por um colega (b477108). O usuário pediu para trazer a TrocaTicket 2.0 para a Entrega 1 por etapas, mantendo a Entrega 1 como base. Cada etapa termina com testes e parada para confirmação. O usuário prefere publicar só quando todas as etapas terminarem.

## Histórico até a compra simulada

As etapas 1 (login com sessão), 2 (testes automáticos e iniciador), 3 (compra simulada completa: pedido, pagamento, cancelamento e estorno) e 4 (revenda, fila de espera e transferência com aceite) estão concluídas e testadas na branch local integracao-site-2.0, criada a partir de b477108, com um commit por etapa. A etapa 1 foi desenvolvida como integracao-site-2.0-etapa1-sessao, nome que deixou de ser usado. Detalhes, arquivos e resultados estão em CHECKPOINT.md.

A etapa 1 muda o contrato da API da main, como o usuário aceitou: as rotas de conta passam a exigir sessão e as gravações exigem X-CSRF-Token. URLs e formatos de resposta foram mantidos. A etapa 3 acrescenta rotas /api/pedidos (com Idempotency-Key) e mantém a compra direta antiga, que agora gera um pedido pago e respeita o limite de 6 por conta e evento. O cancelamento de ingresso passou a registrar estorno e a ser recusado depois que o evento começa.

Nada foi publicado e não houve merge. Ao fim de cada etapa, o usuário recebe um ZIP acumulado (bundle a partir de b477108 e instruções para o colega publicar). A publicação depende de um colega com permissão de escrita, porque o app do Claude não tem acesso à organização 2026-2-NCC2. Aguardar confirmação do usuário antes da etapa 4.

Para retomar: aplicar o bundle mais recente sobre um clone que contenha b477108 (ver LEIA-PRIMEIRO.txt do ZIP), depois rodar npm test (com um MySQL local que possa criar bancos) e o iniciador.

Próximas etapas sugeridas, a confirmar com o usuário (a 4, revenda, fila de espera e transferência com aceite, foi concluída em 26/11/2026):
5. Portaria e atendimento.
6. Administração ligada ao banco e exigência de aprovação de contas.
7. Idiomas.

Pendências para a equipe:
1. Confirmar se existe uma migração oficial. Se existir, compará-la com a complementar e substituí-la.
2. Decidir se as estruturas das migrações entram no SCRIPT_BANCO_V2.sql, o que altera a Entrega 2. Por enquanto, o README da Entrega 1 orienta a aplicar as migrações também em instalações novas.
3. Corrigir o histórico de trocas depois do aceite: quem propôs vê "Proposta recebida" e quem aceitou deixa de ver a troca. O problema está no server.js da main e está descrito em CHECKPOINT.md.
4. Combinar com o grupo a mudança de contrato da API: o site da Entrega 1 já foi adaptado, mas outros clientes da API precisam enviar o cookie e o token.

Para usar as migrações num banco local de testes: importar SCRIPT_BANCO_V2.sql e depois, nesta ordem, MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql, MIGRACAO_SESSAO_LOGIN.sql, MIGRACAO_PEDIDOS_PAGAMENTOS.sql e MIGRACAO_REPASSE.sql, pelo cliente mysql ou pelo Workbench (o iniciador faz isso sozinho). A última consulta de cada arquivo deve voltar vazia. Não aplicar em banco compartilhado sem aval da equipe.

Para recuperar os commits a partir de um clone que contenha 24f169ad133372252051e0e4b9d7bf85f6ba3a6c, usar git bundle verify no arquivo integracao-main-miguel.bundle e git fetch com o caminho do arquivo e refs/heads/integracao-main-miguel. Em clone novo, git switch -c integracao-main-miguel FETCH_HEAD. O commit esperado está no LEIA-PRIMEIRO.txt que acompanha o bundle. Para as etapas da integração com a 2.0, um clone com integracao-main-miguel já basta como base, porque o bundle traz só os commits novos. Se a branch já existir, comparar os commits e preservar o trabalho local. Verificar permissão antes de publicar a branch. Nenhuma credencial faz parte deste material.
