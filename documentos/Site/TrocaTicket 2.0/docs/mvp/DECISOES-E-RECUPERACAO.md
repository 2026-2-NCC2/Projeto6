# Decisões, compatibilidade e recuperação — MVP acadêmico

Referência desta entrega: 18/10/2026. A especificação principal é o documento
`trocaticket_prompt_completo_codex.md`, fornecido pelo usuário. O contrato das
rotas está em `server/docs/API-TRANSACOES.md`; este documento explica decisões
e recuperação, sem substituir aquele contrato nem as evidências dos testes.

## Origem das decisões

| Origem                                             | Decisão aplicada                                                                                                                                                                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuário, confirmado na conversa e na especificação | Manter MySQL e Workbench; desenvolver somente localmente; preservar o projeto atual; nenhuma alteração no GitHub ou publicação.                                                                                                              |
| Especificação do MVP                               | Contas e conteúdo fictícios; pagamentos, emissor e portaria simulados; fluxo transacional persistido; sem identidade civil, cartão, Pix ou e-mail reais.                                                                                     |
| Especificação do MVP                               | Perfil 1 participante, 2 organizador, 3 fornecedor; administrador é permissão adicional de servidor; organizador/fornecedor pendentes no cadastro público.                                                                                   |
| Especificação do MVP                               | Teto pelo menor valor entre original e custo do titular; R$ 100 → R$ 70 limita o próximo repasse a R$ 70; presente torna custo e teto iguais a zero.                                                                                         |
| Padrão didático proposto pela especificação        | Reserva e convite de 10 minutos; limite de 4 unidades ativas/reservadas por conta/evento; configurações administrativas limitadas e verificadas no servidor. Esses números não são obrigações legais nem exigências atribuídas ao professor. |
| Material de aulas disponível no projeto            | React/JavaScript, componentes, Express, mysql2, validações, consultas parametrizadas e separação simples de responsabilidades. As aulas servem como orientação de implementação.                                                             |
| Decisão técnica para preservar o existente         | Frontend canônico da raiz, versão 0.4.1; backend integrado na pasta `server/`; base nova exclusiva `trocaticket_mvp_academico`, sem importar silenciosamente os dados M1.                                                                    |

O enunciado/rubrica específico do professor não foi localizado no material
conferido. Não foi inventada exigência de número de tabelas, triggers,
procedures, views, classes ou linhas por arquivo. As regras de transação acima
vêm do pedido e da especificação do MVP, não de uma alegação de autoria do
professor. Anexos antigos de SQL Server são referências históricas; não mudam
a escolha humana posterior por MySQL.

## Base nova e fronteira com M1

O nome reservado para esta aplicação é **`trocaticket_mvp_academico`**. A
configuração recusa outro nome de banco e limita o host a `127.0.0.1` ou
`localhost`. A porta continua configurável, para permitir o MySQL pessoal e
uma instância separada de teste. A conferência de versão do usuário mostrou
MySQL 8.0.46; uma imagem de `DATABASE() = NULL` indica conexão sem banco
selecionado, não demonstra criação ou migração do MVP.

O banco anterior **`trocaticket_dev_mysql_20261018` permanece separado**. O
iniciador do MVP não executa o SQL único M1 nem ativa suas flags. Os comandos de
migração e seed têm verificações de destino; não adotam uma base ocupada sem
histórico compatível. Nenhuma migração desta entrega apaga o M1, desliga
constraints ou converte suas contas/ingressos.

As tabelas-base M1 foram reutilizadas no desenho da base nova. Os conceitos
adicionais têm tabelas próprias: configuração do evento/categoria, pedido,
unidade, anúncio, fila, convite, histórico, credencial revogada, entrada,
estorno, atendimento, sessão e metadados. Produtos/serviços e ofertas B2B
continuam separados dos anúncios de ingresso.

**Não existe importação automática dos ingressos legados.** O `V` do campo
antigo `ingresso.status` continua sem novo significado implícito. A carteira
transacional consulta somente ingressos associados a `mvp_unidade`; o estado
novo é `valid`, `used` ou `cancelled`. Migrar um legado exigiria mapear origem,
titularidade, valores e estados com aprovação explícita. Da mesma forma, não
se converte `admin=FALSE` em administrador nem se presume fuso de datas antigas.

Datas novas são gravadas em UTC. A interface apresenta America/Sao_Paulo, e o
formulário de evento envia uma data com fuso explícito. Não há conversão de
datas do M1 pessoal nesta entrega.

## Aplicação e reaplicação de migrações

O runner em `server/src/migrations.js` aplica arquivos ordenados de
`server/migrations/`. Ele verifica destino, motor/versão, modo SQL estrito e
FKs/unicidades ativas, além de obter um bloqueio nomeado para evitar dois
runners simultâneos. Esta implementação aceita MySQL 8.0.16+ da série 8;
MariaDB e SQL Server não são destinos equivalentes.

O histórico `mvp_migracao` guarda, para cada arquivo:

- **Checksum SHA-256** do conteúdo do SQL. Alterar um arquivo já aplicado
  faz a reaplicação parar; a correção deve ser uma migração nova e revisável.
- **Fingerprint SHA-256 da estrutura**, usando `SHOW CREATE TABLE`, preservando
  colunas, constraints e índices. O contador variável de `AUTO_INCREMENT` é
  removido da comparação. O histórico de migração fica fora desse cálculo.
- A versão aplicada e a data UTC.

Views, triggers, rotinas ou eventos inesperados também interrompem a
verificação. Uma alteração estrutural fora do histórico não é aceita
silenciosamente. Dados novos não alteram esse fingerprint: ele não é uma cópia
de segurança nem uma auditoria de todas as alterações de conteúdo.

O seed é uma operação DML em transação InnoDB. Ele cria somente dados fictícios
com emails reservados em `example.com` e senhas com hash. O checkpoint
`mvp-academico-v1` impede duplicar o seed; se encontrar email reservado sem
checkpoint, recusa a colisão em vez de alterar uma conta existente. Reaplicar
não redefine senhas, permissões ou operações já feitas na demonstração.

## DDL e recuperação sem reset

**CREATE/ALTER no MySQL pode confirmar implicitamente.** O runner não promete
rollback integral de um arquivo DDL. Uma falha no meio de uma migração pode
deixar parte da estrutura aplicada; o histórico só é gravado quando os comandos
daquele arquivo terminam. A próxima execução detecta a diferença e para.

Antes de uma migração futura em base com dados, exporte pelo Workbench uma
cópia local de estrutura e dados do banco MVP, com nome/data identificados.
Preserve também os arquivos SQL e os checksums da versão anterior. Não use
dados ou credenciais reais nos materiais de apresentação. A credencial de
migração pode precisar de CREATE/ALTER; ela não deve ser confundida com a
conta MySQL da aplicação, cujo cadastro público nunca concede privilégios.

Se houver falha parcial, checksum ou fingerprint divergente:

1. Pare a inicialização e registre qual migração/comando falhou. Preserve a
   base e os arquivos; não execute novamente o SQL M1 para tentar corrigir.
2. Faça uma exportação local do estado atual e confira o catálogo e
   `SHOW CREATE TABLE` das tabelas envolvidas, comparando com o SQL esperado.
3. Diferencie falha DDL parcial de alteração manual e de falta de permissão.
   Uma falha de conexão não autoriza trocar o destino ou ignorar integridade.
4. Prepare uma correção concreta e compatível com os dados preservados.
   Qualquer exclusão, perda de informação, reconstrução ou mudança de
   privilégios depende da autorização ainda necessária. Não há reparo
   destrutivo automático nesta entrega.
5. Valide a recuperação em uma instância de teste isolada antes de executá-la
   na base de demonstração com dados que se deseja preservar.

Não edite checksums/fingerprints para encobrir divergência, não remova registros
do histórico, não use DROP/TRUNCATE/reset e não desligue FKs/CHECKs. Uma base
com migração incompleta exige diagnóstico; o aplicativo não a adota apenas
porque tabelas com nomes iguais existem. Não foi executada uma restauração
destrutiva como parte dos testes desta entrega.

## Transações e limites da simulação

As operações de ingresso usam transações InnoDB, leitura `READ COMMITTED` e
bloqueio do evento para serializar estoque, limites, titularidade e entrada.
Unicidades adicionais protegem anúncio, convite e reserva secundária ativos;
a entrada e o estorno têm chaves únicas. A idempotência associa conta, chave,
operação e conteúdo. Essas proteções são conferidas no servidor, inclusive em
chamadas diretas, sem depender dos botões ou do cronômetro React.

Pagamento aprovado e entrega concluída são estados diferentes. Falha do
emissor deixa entrega pendente, com recuperação ou estorno simulado. Convite
gratuito preserva dono e credencial até o aceite; o aceite revoga a credencial
anterior e registra custo zero. Expirações usam o relógio UTC do servidor,
são reconciliadas na inicialização, periodicamente e nas operações relacionadas.

Os adaptadores `PagamentoSimulado` e `EmissorSimulado` são locais e não fazem
chamadas financeiras. Apenas a administração configura os cenários protegidos.
Taxas e cobrança real são zero. Não há saldo, saque, Pix, cartão, escrow,
seguro ou pagamento real a vendedor. O cancelamento do evento reconcilia cada
pedido fictício aprovado uma vez; mantém histórico e não recria ingresso usado.
Uma disputa após entrega/uso é atendimento demonstrativo, não restauração
automática de direito de terceiro.

O limite é por **conta fictícia**, sem prova de identidade única. A credencial
opaca e a leitura única demonstram controles centralizados online; não tornam
o sistema uma ticketeira oficial, não provam ausência de fraude e não oferecem
validação offline em várias catracas. Não há biometria, KYC ou autenticação por
documento civil. A política de meia-entrada é uma declaração fictícia.

Preferências, idiomas, temas e favoritos podem continuar no navegador; contas,
pedidos, titularidade e estoque do modo integrado vêm do backend/MySQL. Uma
falha de API não deve ser apresentada como operação salva no banco. O modo
anterior de demonstração local permanece separado para preservar o projeto.

Recuperação por email, OAuth, envio de mensagens, câmera/QR automático e
serviços comerciais externos não fazem parte do MVP. A alternativa manual de
credencial é o fluxo demonstrável de portaria. Os avisos da interface deixam
explícito: **“Demonstração acadêmica • sem pagamentos ou ingressos reais”.**

## Evidência e execução

Os testes unitários verificam regras, mas não comprovam locks do MySQL. A suíte
`server/tests/mvp-integracao.test.js` só executa escrita com opt-in de instância
QA, porta diferente de 3306 e diretório exclusivo conferido por consulta. Ela
produz `docs/validacao/polimento/aceite-mysql.json`. Os resultados desta entrega devem ser
consultados junto do relatório de validação; testes históricos M1 não substituem
esta suíte. Nenhuma evidência de QA comprova uso da senha ou migração da conexão
pessoal do usuário.

Os comandos de migração/seed da aplicação devem ser executados a partir de
`server/`, com credenciais locais no ambiente ou arquivo de configuração
ignorado. Consulte o README da entrega para os iniciadores e para abrir duas
sessões de navegador independentes. Não inclua `.env`, senhas ou arquivos de
dados/keys da instância QA nos ZIPs de compartilhamento.
