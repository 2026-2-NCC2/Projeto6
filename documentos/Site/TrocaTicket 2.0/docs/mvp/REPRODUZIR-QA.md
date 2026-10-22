# Reproduzir a QA local do MVP

Este roteiro é **opt-in**, exclusivo para MySQL Community **8.0.46** e dados fictícios. Não utiliza o servidor pessoal da porta 3306, o banco M1, MariaDB/XAMPP ou credenciais pessoais. A preparação abaixo é manual; não é executada ao abrir este documento ou ao iniciar o site.

## Instância nova e isolada

1. Use os binários MySQL 8.0.46 já instalados. Confirme que a porta **34763** está livre; se estiver ocupada, identifique o processo antes de continuar. Não encerre um processo desconhecido nem mude o serviço MySQL pessoal.
2. Na raiz do projeto, escolha exatamente `tmp/mysql-qa-mvp-20261018`. **Se essa pasta já existir, aborte a inicialização.** Não inicialize por cima, não apague/renomeie dados para contornar a proteção. Uma instância QA anterior só pode ser reutilizada após conferir sua identidade e integridade; um destino desconhecido exige diagnóstico separado.
3. Para uma pasta realmente nova, este bloco PowerShell faz a conferência antes da inicialização. Ajuste apenas o caminho dos binários se a instalação tiver outro endereço:

```powershell
$qaRoot = (Get-Location).Path # executar na raiz que contém server/
$qaData = Join-Path $qaRoot 'tmp/mysql-qa-mvp-20261018'
$qaMysql = 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe'
if (Test-Path -LiteralPath $qaData) { throw 'Pasta já existe: não inicializar.' }
New-Item -ItemType Directory -Path (Join-Path $qaRoot 'tmp') -Force | Out-Null
& $qaMysql --no-defaults --initialize-insecure `
  '--basedir=C:/Program Files/MySQL/MySQL Server 8.0' "--datadir=$qaData"
if ($LASTEXITCODE -ne 0) { throw 'Inicialização falhou: preservar e diagnosticar.' }
```

`--initialize-insecure` cria **somente nessa instância exclusiva de ensaio** o usuário inicial root sem senha esperado pelas suítes. Não é configuração da aplicação ou recomendação para uma instalação pessoal/publicada. Não exponha essa instância à rede.

4. Crie `tmp/mysql-qa-mvp.ini` com os caminhos absolutos da sua cópia do projeto, usando barras `/`. Exemplo para a pasta deste aluno:

```ini
[mysqld]
basedir="C:/Program Files/MySQL/MySQL Server 8.0"
datadir="C:/Users/tiago/OneDrive/Documentos/ChatGPT/Site/tmp/mysql-qa-mvp-20261018"
bind-address=127.0.0.1
port=34763
mysqlx=0
skip-log-bin
performance-schema=OFF
innodb-buffer-pool-size=32M
log-error="C:/Users/tiago/OneDrive/Documentos/ChatGPT/Site/tmp/mysql-qa-mvp-20261018/qa-servidor.log"
pid-file="C:/Users/tiago/OneDrive/Documentos/ChatGPT/Site/tmp/mysql-qa-mvp-20261018/qa-servidor.pid"
```

5. Inicie esse `mysqld.exe` com `--defaults-file=<caminho-absoluto-do-ini>` como **primeiro argumento**, em um terminal dedicado. Aguarde o log indicar que está pronto. O certificado `ca.pem` deve pertencer à mesma pasta QA. Não substitua o certificado pelo da instância pessoal nem desabilite a verificação TLS para contornar falhas.
6. Antes das suítes, confira via conexão local TLS em **127.0.0.1:34763**: `SELECT VERSION(), @@port, @@datadir, @@foreign_key_checks, @@unique_checks, @@sql_mode;`. O resultado deve indicar versão 8.0.46, porta 34763, a pasta QA acima, FK/UNIQUE ativos e modo estrito. Banco inicial vazio é esperado: a suíte principal cria a base **`trocaticket_mvp_academico`** quando ausente e chama as migrações/seed. Não execute o SQL de criação M1 nesse destino.

## Executar as suítes em sequência

Instale as dependências pelos lockfiles locais conforme o README do projeto. Em **outro terminal PowerShell**, na raiz do projeto, configure as variáveis apenas nessa sessão:

```powershell
$env:TESTE_MYSQL_ISOLADO = '1'
$env:TESTE_MYSQL_PORTA = '34763'
$env:TESTE_MYSQL_DIRETORIO = Join-Path (Get-Location).Path 'tmp/mysql-qa-mvp-20261018'
$env:TESTE_MYSQL_CA = Join-Path $env:TESTE_MYSQL_DIRETORIO 'ca.pem'

node --test server/tests/mvp-integracao.test.js
if ($LASTEXITCODE -ne 0) { throw 'Parar: suíte principal reprovada.' }
node --test server/tests/b2b-integracao.test.js
if ($LASTEXITCODE -ne 0) { throw 'Parar: B2B reprovado.' }
node --test server/tests/migrations-integracao.test.js
if ($LASTEXITCODE -ne 0) { throw 'Parar: migrações reprovadas.' }
node --test server/tests/complementos-integracao.test.js
if ($LASTEXITCODE -ne 0) { throw 'Parar: complementos reprovados.' }
```

**Ordem obrigatória: principal → B2B → migrações → complementos.** A principal prepara base/migrações/seed; as demais esperam essa preparação. Elas compartilham a configuração dos simuladores e criam fixtures persistentes fictícias. Não execute arquivos em paralelo, curingas, `Promise.all` de suítes ou `npm test` com o opt-in ativado. Não execute simultaneamente uma apresentação manual que altere o mesmo banco/simuladores.

As guardas dos próprios arquivos conferem versão, diretório físico (`@@datadir`), porta e certificado antes de operações; os complementos exigem exatamente porta 34763 e nome `mysql-qa-mvp-20261018`. O runner em `server/src/migrations.js` confere destino, modo estrito, FKs/UNIQUE, histórico/checksums e fingerprint do esquema. Divergências devem interromper o ensaio, sem adotar tabelas desconhecidas nem reduzir constraints. DDL do MySQL não é uma transação atômica: em falha parcial, preserve os arquivos/base e diagnostique antes de continuar.

O teste de metadados altera temporariamente checksum/fingerprint **dentro de transação com rollback** para provar a recusa; não faz ALTER no esquema real para simular divergência. As suítes não são um procedimento de limpeza/reset: mantenha os registros produzidos como evidência. A reaplicação preserva definições e seed, mas novas execuções de cenários podem acrescentar fixtures.

Feche o terminal dos testes ao terminar, removendo as variáveis opt-in daquela sessão. Nos comandos normais sem `TESTE_MYSQL_ISOLADO=1`, os testes de integração aparecem como **ignorados**, nunca como aprovados. A instância QA pode ser encerrada com `mysqladmin` apontando explicitamente para **127.0.0.1:34763**, protocolo TCP e a CA QA, após conferir novamente a identidade; não pare o serviço pessoal da porta 3306 nem remova a pasta de dados.

## Interface e evidências

Os fluxos manuais estão em `docs/mvp/ROTEIRO-APRESENTACAO.md`. As suítes HTTP abrem suas próprias portas locais temporárias; não dependem de manter API/Vite em 3333/5173 para provar as transações. A apresentação manual usa API e site conforme seus iniciadores.

O teste automatizado da interface nesta entrega usou **Edge headless com contextos isolados**, sem o perfil pessoal do navegador. Playwright/Edge usados na QA são ferramentas do ambiente de verificação, não dependências de produção do TrocaTicket. Não é necessário instalá-los para abrir o projeto e executar o roteiro manual.

Confira em `docs/validacao/polimento/` os JSONs de cada suíte e os registros de UI. Evidências com API interceptada provam apenas comportamento da interface; os relatórios MySQL identificam a instância real de ensaio. Nenhum resultado histórico substitui rodar e conferir o ambiente atual.
