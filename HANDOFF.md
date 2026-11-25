# Continuidade da integração

Objetivo do usuário: integrar na Entrega 1 o servidor, banco, autenticação, modelos, APIs e regras da main ao visual de alteraçõesMiguel. Trabalhar em branch nova e incrementalmente. Antes de editar, comparar todos os arquivos, decidir quais copiar, adaptar ou dispensar e conferir imports, assets, rotas e dependências. Substituir o tema por tokens, classes, toggle e persistência da referência e verificar legibilidade em todas as páginas nos dois temas. Integrar homes pública e autenticada com fundo estendido, elementos centralizados, banner Troca-Papo no fim e demais elementos da referência. Na home autenticada incluir cards personalizados, card interativo temporal e “Bem-vindo de volta, (nome do usuário)” usando sessão real. Preservar contratos e pedir orientação sobre ambiguidades ou riscos. Rodar build, iniciar, testar login, logout, temas, homes, rotas principais e chamadas reais à API, corrigir erros e reportar os resultados. Ao terminar a etapa 4, parar e aguardar confirmação.

Ler CHECKPOINT.md e DIAGNOSTICO.md. Conferir git status, branch, commits e diff antes de continuar do último ponto verificado. Atualizar ambos os documentos a cada etapa com decisões, arquivos, erros, soluções, testes e pendências. Documentar preventivamente no repositório ou Drive quando autorizado, sem credenciais. Quando solicitado “Transferir para o Claude” ou “Gerar checkpoint”, entregar ambos com requisitos, situação real e próximo passo. Economizar tokens sem sacrificar qualidade, segurança ou continuidade.

Aplicação em documentos/Entrega 1/FULL STACK/TrocaTicket. O próximo passo inicial é portar o tema. Preservar a Entrega 2.
Tema portado; a etapa seguinte é integrar as homes e validar no navegador.
Homes integradas; prosseguir com testes reais da etapa 4. Usar schema versionado da Entrega 2 só no banco de teste.

Migração oficial ausente em todo o repositório; complementar criada com autorização e validada em bancos descartáveis. Etapa 4 concluída.
Branch integracao-main-miguel publicada por um colega (b477108). O usuário pediu para trazer a TrocaTicket 2.0 para a Entrega 1 por etapas, mantendo a Entrega 1 como base; cada etapa vai numa branch nova e termina com testes e parada para confirmação.

## Retomada atual

A etapa 1 da integração com a 2.0 (login com sessão) está concluída e testada na branch local integracao-site-2.0-etapa1-sessao, criada a partir de b477108. Detalhes, arquivos e resultados estão em CHECKPOINT.md. Essa etapa muda o contrato da API da main, como o usuário aceitou: as rotas de conta passam a exigir sessão e as gravações exigem X-CSRF-Token. URLs e formatos de resposta foram mantidos. Commit local, sem publicação e sem merge. A publicação depende de um colega com permissão de escrita, porque o app do Claude não tem acesso à organização 2026-2-NCC2. Aguardar confirmação do usuário antes da etapa 2.

Próximas etapas sugeridas, a confirmar com o usuário:
2. Testes automatizados da API (como na 2.0) e iniciador de um clique.
3. Compra simulada completa: pedido, pagamento, cancelamento e estorno.
4. Revenda, fila de espera e transferência com aceite.
5. Portaria e atendimento.
6. Administração ligada ao banco e exigência de aprovação de contas.
7. Idiomas.

Pendências para a equipe:
1. Confirmar se existe uma migração oficial. Se existir, compará-la com a complementar e substituí-la.
2. Decidir se as estruturas das duas migrações entram no SCRIPT_BANCO_V2.sql, o que altera a Entrega 2. Por enquanto, o README da Entrega 1 orienta a aplicar as migrações também em instalações novas.
3. Corrigir o histórico de trocas depois do aceite: quem propôs vê "Proposta recebida" e quem aceitou deixa de ver a troca. O problema está no server.js da main e está descrito em CHECKPOINT.md.
4. Combinar com o grupo a mudança de contrato da API: o site da Entrega 1 já foi adaptado, mas outros clientes da API precisam enviar o cookie e o token.

Para usar as migrações num banco local de testes: importar SCRIPT_BANCO_V2.sql, depois MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql e depois MIGRACAO_SESSAO_LOGIN.sql, pelo cliente mysql ou pelo Workbench. A última consulta de cada arquivo deve voltar vazia. Não aplicar em banco compartilhado sem aval da equipe.

Para recuperar os commits a partir de um clone que contenha 24f169ad133372252051e0e4b9d7bf85f6ba3a6c, usar git bundle verify no arquivo integracao-main-miguel.bundle e git fetch com o caminho do arquivo e refs/heads/integracao-main-miguel. Em clone novo, git switch -c integracao-main-miguel FETCH_HEAD. O commit esperado está no LEIA-PRIMEIRO.txt que acompanha o bundle. Para a etapa 1, um clone com integracao-main-miguel já basta como base, porque o bundle novo traz só o commit da etapa. Se a branch já existir, comparar os commits e preservar o trabalho local. Verificar permissão antes de publicar a branch. Nenhuma credencial faz parte deste material.
