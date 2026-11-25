# Continuidade da integração

Objetivo do usuário: integrar na Entrega 1 o servidor, banco, autenticação, modelos, APIs e regras da main ao visual de alteraçõesMiguel. Trabalhar em branch nova e incrementalmente. Antes de editar, comparar todos os arquivos, decidir quais copiar, adaptar ou dispensar e conferir imports, assets, rotas e dependências. Substituir o tema por tokens, classes, toggle e persistência da referência e verificar legibilidade em todas as páginas nos dois temas. Integrar homes pública e autenticada com fundo estendido, elementos centralizados, banner Troca-Papo no fim e demais elementos da referência. Na home autenticada incluir cards personalizados, card interativo temporal e “Bem-vindo de volta, (nome do usuário)” usando sessão real. Preservar contratos e pedir orientação sobre ambiguidades ou riscos. Rodar build, iniciar, testar login, logout, temas, homes, rotas principais e chamadas reais à API, corrigir erros e reportar os resultados. Ao terminar a etapa 4, parar e aguardar confirmação.

Ler CHECKPOINT.md e DIAGNOSTICO.md. Conferir git status, branch, commits e diff antes de continuar do último ponto verificado. Atualizar ambos os documentos a cada etapa com decisões, arquivos, erros, soluções, testes e pendências. Documentar preventivamente no repositório ou Drive quando autorizado, sem credenciais. Quando solicitado “Transferir para o Claude” ou “Gerar checkpoint”, entregar ambos com requisitos, situação real e próximo passo. Economizar tokens sem sacrificar qualidade, segurança ou continuidade.

Aplicação em documentos/Entrega 1/FULL STACK/TrocaTicket. O próximo passo inicial é portar o tema. Preservar a Entrega 2.
Tema portado; a etapa seguinte é integrar as homes e validar no navegador.
Homes integradas; prosseguir com testes reais da etapa 4. Usar schema versionado da Entrega 2 só no banco de teste.

Migração oficial ausente em todo o repositório; complementar criada com autorização e validada em bancos descartáveis. Etapa 4 concluída.

## Retomada atual

As etapas 1–4 estão verificadas e registradas na branch local integracao-main-miguel. Os resultados, códigos HTTP e decisões estão em CHECKPOINT.md. A pendência do banco foi resolvida com a migração complementar documentos/Entrega 1/FULL STACK/TrocaTicket/server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql. O usuário autorizou o arquivo, que foi testado só em MariaDB 10.11 e MySQL 8.0 descartáveis. Com ela, favoritos, ingressos, trocas, comunidade e as rotas de fornecedores deixaram de responder HTTP 500, e o fluxo completo pelo navegador passou. Commit apenas local, sem publicação e sem merge. Aguardar confirmação do usuário.

Pendências para a equipe:
1. Confirmar se existe uma migração oficial. Se existir, compará-la com a complementar e substituí-la.
2. Alinhar a documentação do banco. O README diz que o script base dispensa a migração, mas o SCRIPT_BANCO_V2.sql não tem as estruturas. Decidir entre incorporá-las ao script base, o que altera a Entrega 2, ou orientar no README a aplicar a migração também em instalações novas.
3. Corrigir o histórico de trocas depois do aceite: quem propôs vê "Proposta recebida" e quem aceitou deixa de ver a troca. O problema está no server.js da main e está descrito em CHECKPOINT.md.
4. Publicar a branch quando houver permissão de escrita. A tentativa anterior recebeu HTTP 403.

Para usar a migração num banco local de testes: importar SCRIPT_BANCO_V2.sql e depois o arquivo da migração, pelo cliente mysql ou pelo Workbench. A última consulta do arquivo deve voltar vazia. Não aplicar em banco compartilhado sem aval da equipe.

Para recuperar os commits a partir de um clone que contenha 24f169ad133372252051e0e4b9d7bf85f6ba3a6c, usar git bundle verify no arquivo integracao-main-miguel.bundle e git fetch com o caminho do arquivo e refs/heads/integracao-main-miguel. Em clone novo, git switch -c integracao-main-miguel FETCH_HEAD. O commit esperado está no LEIA-PRIMEIRO.txt que acompanha o bundle. Se a branch já existir, comparar os commits e preservar o trabalho local. Verificar permissão antes de publicar a branch. Nenhuma credencial faz parte deste material.
