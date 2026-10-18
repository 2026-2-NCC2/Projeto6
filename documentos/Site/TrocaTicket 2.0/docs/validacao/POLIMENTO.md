# Reorganização e validação — versão 0.4.2

Concluída em 18/10/2026. Evolução local da aplicação integrada 0.4.1; backend 2.0.1. Sem alteração de dependências, contrato da API, autenticação, SQL de migração ou regras de negócio. Nenhum banco pessoal foi acessado para esses ensaios.

## Uso diário

`Iniciar-TrocaTicket.cmd` é o único iniciador da raiz. Na primeira abertura coleta a conexão; as seguintes reutilizam `config/conexao.local.json`. A senha é protegida pela API do Windows, vinculada ao usuário, e não é guardada em texto puro nesse arquivo. Configurações privadas não entram no pacote nem no Git.

O iniciador confere dependências, migrações e seed de maneira protegida e abre API/Vite e navegador. Migrações íntegras e seed já registrado não reinicializam os dados. Só uma janela precisa permanecer aberta. Enter/Ctrl+C encerra os filhos; a perda da janela pai também é detectada. Os processos filhos têm um canal de comunicação com o iniciador para encerrar se ele desaparecer.

Se as portas estiverem ocupadas por algo desconhecido, o início é recusado; nenhum processo externo é encerrado. Uma segunda abertura reconhece a execução desta pasta e abre o endereço existente.

Configuração precisa ser refeita ao trocar de computador/usuário Windows. O comportamento de conexão foi validado com credenciais de QA, não com a senha pessoal do aluno. Instalação por npm exige internet na primeira execução; os lockfiles e o procedimento `npm ci` foram preservados. A ramificação de instalação automática fica dispensada quando os pacotes já estão presentes.

## Organização dos arquivos

- Um guia principal, `README.md`, explica o uso diário. `docs/README.md` organiza as consultas técnicas.
- ZIPs, cópias de versões, bancos históricos, comandos antigos e lockfiles pnpm foram arquivados em `historico/`, sem exclusão. Análises anteriores ficam em `docs/historico/`, identificadas como histórico.
- O pacote atual contém a aplicação e sua documentação vigente; não distribui cópias históricas concorrentes.
- `docs/ESTUDAR-O-CODIGO.md` relaciona arquivos e aulas, explica as diferenças de autenticação e indica o caminho de uma ação.
- npm é o procedimento principal, com lockfile na raiz e outro na API; cada um corresponde ao respectivo conjunto de dependências.

Os movimentos estão registrados em [arquivamento.json](polimento/arquivamento.json). Arquivos físicos da instância de ensaio em `tmp/` foram preservados e não entram no pacote.

## Código

| Área                   | Antes                                      | Depois                                                                                  |
| ---------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Telas de negócio       | `Business.jsx`, 991 linhas                 | 11 linhas de compatibilidade, oito páginas de 23–287 linhas e três componentes de 44–99 |
| Serviço de ingressos   | `servico.js`, 1.118 linhas                 | Composição de 23 linhas; módulos por fluxo e contexto compartilhado                     |
| Eventos e B2B          | Consultas e validação misturadas às rotas  | Repositórios, validadores e controladores nomeados                                      |
| Apresentação do código | Trechos com múltiplas instruções por linha | Formatação uniforme também no backend e testes                                          |

As exportações antigas e as chaves JSON foram mantidas. Repositórios recebem o pool ou a conexão transacional correta; não criam outra transação por consulta. O serviço mantém limites de transação, ordem de locks, credenciais, prazos e idempotência. Não foram criadas tabelas ou migrações novas nesta reorganização.

A separação se aproxima das aulas 06–12. A autenticação continua diferente do exemplo do professor: scrypt/cookie/CSRF em vez de bcrypt/JWT. O guia registra essa diferença; não se afirma cópia literal das aulas ou adequação a uma rubrica não fornecida.

## Verificações executadas

| Verificação                                              | Resultado                                                                         | Evidência                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Testes da raiz                                           | **23 aprovados**, incluindo dois testes de configuração e supervisão de processos | [log](polimento/frontend-tests.log)                     |
| Testes puros da API                                      | **14 aprovados**, quatro integrações ignoradas sem opt-in                         | [log](polimento/backend-tests.log)                      |
| Integração principal HTTP/MySQL                          | **15 casos aprovados**                                                            | [T01–T15](polimento/aceite-mysql.json)                  |
| Perfil, eventos e B2B                                    | **8 casos aprovados**                                                             | [B01–B08](polimento/b2b-mysql.json)                     |
| Proteção das migrações                                   | **3 casos aprovados**                                                             | [M01–M03](polimento/migrations-mysql.json)              |
| Expiração, limite e idempotência complementares          | **5 casos aprovados**                                                             | [C01–C05](polimento/complementos-mysql.json)            |
| Iniciador completo com conexão de QA salva               | **4 grupos aprovados**                                                            | [relatório](polimento/iniciador-real.json)              |
| Interface com API/MySQL reais de ensaio                  | **8 grupos aprovados**, nenhuma exceção JavaScript                                | [relatório](polimento/interface/resultado-ui-real.json) |
| Formulários de negócio em navegador com API interceptada | **9 grupos aprovados**, nenhuma exceção JavaScript                                | [relatório](polimento/interface-negocios.json)          |
| Formatação                                               | Aprovada                                                                          | [log](polimento/format.log)                             |
| Build Vite                                               | Aprovado                                                                          | [log](polimento/build.log)                              |

As quatro suítes reais foram executadas sequencialmente no MySQL 8.0.46 em 127.0.0.1:34763, com TLS e diretório exclusivo conferido. São **31 casos**; o Node também contabiliza os quatro contêineres, totalizando 35 testes de integração. Os quatro ignorados na execução padrão não foram somados aos aprovados.

O ensaio de migrações adulterou apenas metadados não confirmados e fez ROLLBACK; não provocou ALTER real no esquema. As expirações usam horários passados apenas de fixtures recém-criadas. Os dados fictícios anteriores permaneceram na QA, sem reset.

A abertura automática do navegador pessoal foi desativada no ensaio; o roteiro usou Edge isolado. O iniciador abriu API e frontend reais com configuração de ensaio, reconheceu uma segunda abertura, manteve a configuração inalterada e encerrou em Enter/fechamento do processo pai. A proteção DPAPI e senha vazia foram verificadas separadamente com dados inteiramente fictícios. O teste também comprovou que perder o canal do iniciador encerra seu filho e preserva outro servidor independente.

O roteiro visual real fez cadastro em três sessões, compra, repasse com teto, gratuidade, persistência, teclado/mobile, idioma/tema, erro/recuperação e portaria com entrada única. Os nove grupos com API interceptada conferem especificamente as páginas extraídas e seus formulários; são uma prova de interface distinta da persistência MySQL. Uma asserção de idioma foi ajustada para aguardar a resposta assíncrona antes de procurar o nome do evento; não foi alterada a aplicação para satisfazer o teste.

## Limites preservados

### Contas de demonstração na home

A home ganhou uma seção de seis contas fictícias, senha inicial e atalho no destaque. O botão de cada perfil preenche o login mediante um identificador permitido; não envia senha pela URL, não autentica automaticamente e não concede permissões. O cadastro ignora esse atalho. Senhas alteradas continuam sendo verificadas pelo backend normalmente.

Os 23 testes da raiz, a formatação e o build passaram novamente. [Quatro grupos de navegador](polimento/contas-home.json) com API interceptada conferiram os seis preenchimentos, ausência de login automático, envio normal sem campo administrativo, erro de senha, identificador desconhecido, cadastro e mobile390px. Não houve conexão MySQL nesse ajuste. As capturas desktop/mobile ficam junto ao relatório.

Pagamentos, emissor e portaria continuam simulados; câmera/offline, email/SMS, OAuth e identidade civil real não foram integrados. A interface não foi redesenhada. O modo legado continua explícito e separado. Este trabalho melhora organização e uso; não é uma certificação de segurança comercial, acessibilidade integral ou ausência de todo erro.

O banco M1, MySQL pessoal e GitHub foram preservados. Não houve commit, branch, push, PR ou publicação. O novo ZIP exclui configurações privadas, histórico, logs de processo, dependências, build gerado, arquivos físicos de banco e certificados. O manifesto registra as fontes distribuídas; o relatório do pacote fica em `docs/validacao/pacote.json` ao lado das evidências locais.
