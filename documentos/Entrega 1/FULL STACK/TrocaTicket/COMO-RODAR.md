# Como rodar o TrocaTicket (Entrega 1) no seu computador

Guia para quem acabou de receber o projeto. Ele foi escrito pensando em Windows. Quando o comando muda
no macOS ou no Linux, isso aparece logo abaixo.

O TrocaTicket roda em três partes, cada uma numa porta:

```text
Navegador ──► Site (Vite) ──► API (Node.js) ──► MySQL
              porta 5173      porta 3000         porta do seu MySQL (normalmente 3306)
```

- **Site:** é o endereço que você abre no navegador, `http://127.0.0.1:5173`.
- **API:** o site chama a API em `http://127.0.0.1:3000/api`.
- **MySQL:** só a API conversa com o banco. O navegador nunca vê usuário nem senha do MySQL.

> **Importante:** o site tem um modo de demonstração que funciona **sem** API e sem banco. Por isso,
> ver a página inicial (ou entrar por "Explorar demo") **não prova** que o banco está ligado. A seção 8
> mostra como conferir de verdade.

**Resumo para quem tem pressa:**

1. Instale o Node.js 22.12 ou mais novo e deixe o MySQL ligado.
2. Pegue a branch `integracao-site-2.0` e entre em `documentos/Entrega 1/FULL STACK/TrocaTicket`.
3. Copie `server/.env.example` para `server/.env` e preencha a conexão (a porta do MySQL vai em `DB_PORT`).
4. Dê dois cliques em `Iniciar-TrocaTicket.cmd` e abra `http://127.0.0.1:5173`.

---

## 1. O que instalar e como conferir

| Programa | Versão | Para quê |
| --- | --- | --- |
| Node.js (já vem com o npm) | 22.12 ou mais novo (LTS) | rodar o site, a API e os scripts |
| Git | qualquer recente | baixar a branch certa |
| MySQL **ou** MariaDB | MySQL 8.0.16+ ou MariaDB 10.5+ | o banco de dados |
| MySQL Workbench (opcional) | qualquer recente | ver o banco e descobrir a porta do MySQL |

Para conferir, abra o **PowerShell** (menu Iniciar → "PowerShell") e rode, um por vez:

```powershell
node -v
npm -v
git --version
mysql --version
```

- `node -v` precisa mostrar `v22.12.0` ou mais novo (por exemplo, `v22.20.0` ou `v24.x`).
- Se o PowerShell disser que a execução de scripts está desabilitada (`npm.ps1`), use `npm.cmd -v`.
  Em todo este guia, quando isso acontecer, troque `npm` por `npm.cmd`. Outra saída é usar o Git Bash.
- É comum `mysql --version` dar "não reconhecido": o MySQL está instalado, mas o atalho dele não está no
  PATH. Não tem problema, porque o projeto não depende desse comando. Para ver a versão, use o
  Workbench: menu **Server → Server Status**.

**Descubra a porta do seu MySQL.** No Workbench, conecte no seu servidor e rode:

```sql
SELECT @@port, @@version;
```

Anote o número. Ele vai em `DB_PORT` (seção 4). No XAMPP, a porta aparece no painel, na linha do
MySQL, coluna "Port(s)".

No macOS ou no Linux, os mesmos comandos de conferência funcionam no Terminal.

## 2. Pegar a branch certa e achar a pasta da aplicação

O repositório tem **várias versões com nomes parecidos**. A aplicação que a equipe roda é **só esta**:

```text
documentos/Entrega 1/FULL STACK/TrocaTicket      ◄── esta
documentos/Entrega 2/Full Stack/TrocaTicket      (outra versão: ignora DB_PORT e também usa a porta 3000)
documentos/Site/TrocaTicket 2.0                  (protótipo da 2.0: API na porta 3333)
```

Abra o **Git Bash** (ou o PowerShell) na pasta onde você guarda projetos e rode:

```bash
git clone https://github.com/2026-2-NCC2/Projeto6.git
cd Projeto6
git checkout integracao-site-2.0
git log -1 --oneline
```

O último comando mostra o commit mais recente da branch. Se você já tinha o projeto, entre na pasta
`Projeto6` e rode `git fetch origin`, `git checkout integracao-site-2.0` e `git pull`.

> Recebeu o ZIP antes de a correção estar no GitHub? Siga o `LEIA-PRIMEIRO.txt` do ZIP. Ele traz a
> branch num arquivo `.bundle` e os comandos para usá-la.

Agora entre na pasta da aplicação. As aspas são necessárias por causa dos espaços.

PowerShell:

```powershell
cd "documentos\Entrega 1\FULL STACK\TrocaTicket"
dir
```

Git Bash, macOS ou Linux:

```bash
cd "documentos/Entrega 1/FULL STACK/TrocaTicket"
ls
```

**Como saber que está no lugar certo:** a lista mostra `Iniciar-TrocaTicket.cmd`, `COMO-RODAR.md`,
`package.json`, `server` e `src`, e existe o arquivo `server/config.js`. A partir daqui, **"pasta do
app"** quer dizer esta pasta.

## 3. As três portas, sem confusão

| Porta | De quem é | Onde muda | Quando mexer |
| --- | --- | --- | --- |
| **5173** | do **site** (o endereço que você abre) | fixa em `vite.config.js` | não mude |
| **3000** | da **API** (o site chama a API aqui) | `PORT` em `server/.env` | só se outro programa precisar da 3000 |
| **3306** (padrão) | do **MySQL** | `DB_PORT` em `server/.env` | sempre que o seu MySQL usar outra porta |

A porta do MySQL é a mesma que aparece na conexão do Workbench. Ela **não** tem nada a ver com a 3000
nem com a 5173.

## 4. Configurar a conexão: um arquivo só, `server/.env`

Toda a configuração local fica em **`server/.env`**, dentro da pasta do app. Esse arquivo vale para a
API, para o preparo do banco, para o `criar-admin`, para os testes e para o iniciador. Não importa em
que pasta o terminal esteja aberto. O arquivo não vai para o GitHub (está no `.gitignore`).

**Jeito automático:** se `server/.env` não existir, o iniciador (seção 7) faz as perguntas e cria o
arquivo para você. A conexão só é guardada depois de funcionar.

**Jeito manual:** copie o exemplo e edite.

PowerShell, na pasta do app:

```powershell
Copy-Item server\.env.example server\.env
notepad server\.env
```

Git Bash, macOS ou Linux, na pasta do app:

```bash
cp server/.env.example server/.env
code server/.env
```

O `code` abre no VS Code. No macOS, `open -e server/.env` abre no TextEdit.

Preencha estas linhas:

| Linha | O que colocar | Exemplo |
| --- | --- | --- |
| `DB_HOST` | endereço do MySQL | `127.0.0.1` |
| `DB_PORT` | **porta do MySQL**, só o número | `3306` (ou `3307`, se o seu usar essa) |
| `DB_USER` | usuário do MySQL (o mesmo do Workbench) | `root` |
| `DB_PASSWORD` | senha do **seu** MySQL local (vazio se não tiver) | |
| `DB_NAME` | nome do banco do projeto | `trocaticket` |
| `PORT` | porta da **API**; deixe `3000` | `3000` |

Cuidados que evitam quase todos os problemas:

- O nome tem que ser exatamente **`.env`**, dentro de **`server`**. No Bloco de Notas, em "Salvar
  como", escolha **Tipo: Todos os arquivos** para não virar `.env.txt`.
- A porta vai só em `DB_PORT`. Não escreva `DB_HOST=127.0.0.1:3307`.
- Se a senha tiver `#`, espaço ou aspas, coloque-a entre aspas simples: `DB_PASSWORD='minha#senha'`.
  Sem aspas, o `#` corta o resto da linha.
- Nunca copie esses valores para variáveis `VITE_*`, porque elas vão para o navegador.
- Não use o banco compartilhado do grupo para testes. Use um nome só seu, como `trocaticket_local`.

**Quem tem prioridade:** se a mesma variável (por exemplo, `DB_PORT`) também existir como variável de
ambiente do Windows ou do terminal, **a variável de ambiente vale mais que o arquivo**. Variável vazia
não conta. A API mostra isso ao iniciar (veja "Variável de ambiente" na seção 10).

## 5. Instalar as dependências

O iniciador (seção 7) instala tudo sozinho na primeira vez. Se preferir fazer à mão, rode na **pasta do
app**, em qualquer terminal:

```bash
npm ci
npm --prefix server ci
```

O primeiro comando instala o site. O segundo instala a API, dentro de `server`. O terminal continua na
pasta do app nos dois.

## 6. Preparar o banco do zero

### Caminho automático (recomendado)

O iniciador prepara o banco toda vez que abre. Para preparar **sem** abrir o site, rode na pasta do app:

```bash
npm run preparar-banco
```

Ele usa a mesma conexão de `server/.env` e:

1. cria o banco `DB_NAME`, se ele não existir;
2. se o banco estiver vazio, aplica o script base
   `documentos/Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql`;
3. aplica as migrações de `server/`, nesta ordem: `MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql`,
   `MIGRACAO_SESSAO_LOGIN.sql`, `MIGRACAO_PEDIDOS_PAGAMENTOS.sql`, `MIGRACAO_REPASSE.sql`,
   `MIGRACAO_PORTARIA_ATENDIMENTO.sql` e `MIGRACAO_ADMINISTRACAO.sql`.

Ele nunca apaga tabelas nem dados, e pode ser rodado de novo sem problema. Se o banco tiver tabelas que
não são do TrocaTicket, ele recusa sem mexer em nada.

Saída esperada:

```text
Preparando o banco trocaticket_local em 127.0.0.1:3307 (configuração: ...\server\.env).
Aplicando SCRIPT_BANCO_V2.sql...
...
Banco pronto (8.0.xx). Banco criado. Tabelas base criadas. Migrações conferidas.
```

### Caminho manual (Workbench)

Use quando o seu usuário do MySQL não puder criar bancos ou quando você quiser rodar os SQL à mão. No
Workbench, abra cada arquivo (**File → Open SQL Script**) e execute (ícone do raio), **nesta ordem**:

1. `documentos/Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql`
2. `server/MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql`
3. `server/MIGRACAO_SESSAO_LOGIN.sql`
4. `server/MIGRACAO_PEDIDOS_PAGAMENTOS.sql`
5. `server/MIGRACAO_REPASSE.sql`
6. `server/MIGRACAO_PORTARIA_ATENDIMENTO.sql`
7. `server/MIGRACAO_ADMINISTRACAO.sql`

- Esses arquivos fixam o nome **`trocaticket`** (`CREATE DATABASE trocaticket` e `USE trocaticket`).
  No caminho manual, use `DB_NAME=trocaticket`. Para outro nome, prefira o caminho automático.
- A última consulta de cada migração deve voltar **vazia**.
- Sem a pasta `documentos/Entrega 2` (por exemplo, se você recebeu só a pasta do app), use a cópia do
  `SCRIPT_BANCO_V2.sql` que vem na pasta `banco/` do ZIP. Para o caminho automático, aponte para ela
  em `server/.env`, por exemplo `SCRIPT_BANCO=C:/caminho/banco/SCRIPT_BANCO_V2.sql`.

Para importar pelo terminal (Git Bash, macOS ou Linux, na pasta do app), repare: `-P` **maiúsculo** é a
porta e `-p` minúsculo pede a senha.

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p < "../../../Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql"
```

## 7. Iniciar a aplicação (jeito mais simples)

Com o MySQL ligado, dê **dois cliques** em `Iniciar-TrocaTicket.cmd` (Windows) ou
`Iniciar-TrocaTicket.command` (Mac), na pasta do app. Também funciona rodar `npm start` na pasta do app
(PowerShell, Git Bash ou Terminal).

A janela mostra de onde veio a configuração e para onde cada parte vai conectar:

```text
Configuração lida:
  Configuração: C:\...\TrocaTicket\server\.env
  MySQL: 127.0.0.1:3307, banco trocaticket_local (usuário definido, senha definida)
  Origem: server/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, PORT)

Conferindo o banco trocaticket_local em 127.0.0.1:3307 (os dados existentes são preservados)...
  Banco pronto (...). Tabelas base já existiam. Migrações conferidas.
Iniciando a API...
Iniciando o site...

Pronto! Abra http://127.0.0.1:5173
  site http://127.0.0.1:5173 -> API http://127.0.0.1:3000/api -> MySQL 127.0.0.1:3307 (banco trocaticket_local)
```

Abra **exatamente** `http://127.0.0.1:5173` (o iniciador já abre o navegador). Deixe a janela aberta
enquanto usa o sistema. Os registros ficam em `logs/` (`api.log`, `site.log` e `banco.log`).

### Iniciar à mão (dois terminais)

Faz a mesma coisa, com a **mesma** configuração de `server/.env`. A diferença é que **não** prepara o
banco: rode `npm run preparar-banco` antes, uma vez.

Terminal 1, na pasta do app (API):

```bash
npm run api
```

Terminal 2, na pasta do app (site):

```bash
npm run dev
```

Ao subir, a API mostra no terminal o arquivo de configuração usado, o MySQL de destino e
`Banco conectado: ...` ou o motivo da falha.

## 8. Conferir que site, API e banco estão funcionando juntos

1. **API e banco:** na janela do iniciador (ou no terminal da API, ou em `logs/api.log`) deve aparecer
   `Banco conectado: <banco> em <endereço>:<porta>`.
2. **Uma chamada real:** abra `http://127.0.0.1:3000/api/eventos/publicados` no navegador.
   - Uma lista `[...]` (pode ser `[]`) quer dizer que a API e o banco estão funcionando.
   - `{"error":"Erro interno..."}` quer dizer que a API está no ar, mas o banco falhou.
   - "Não é possível acessar esse site" quer dizer que a API não está rodando.
3. **Dados de verdade, sem demonstração:** no site, clique em **Criar conta**, cadastre uma conta de
   teste (dados fictícios), clique em **Sair** e entre de novo com o mesmo e-mail e senha. Deve aparecer
   "Boas-vindas de volta, (seu nome)!", com o seu nome no topo. Em **Meu perfil**, o nome e o e-mail
   vêm do banco. Se quiser, confira no Workbench (troque `trocaticket` pelo seu `DB_NAME`):

   ```sql
   SELECT id, nome, email FROM trocaticket.usuario ORDER BY id DESC LIMIT 1;
   ```

4. **(Opcional)** No navegador, aperte F12, vá em **Rede** e faça login. As chamadas vão para
   `http://127.0.0.1:3000/api/...` com status `200`.

## 9. Parar, trocar a porta e iniciar de novo

- **Parar:** aperte **Enter** na janela do iniciador (ou Ctrl+C, ou feche a janela). À mão, use Ctrl+C
  em cada terminal.
- **Depois de mudar `server/.env`, reinicie a API.** Pelo iniciador: pare e abra de novo. À mão: Ctrl+C
  no terminal da API e `npm run api` de novo. A configuração só é lida quando a API começa.
  - Se você usa `npm run dev` dentro de `server` (nodemon), ele **não** reinicia sozinho quando o
    `.env` muda. Digite `rs` e Enter, ou pare e inicie de novo.
- **Mudar coisas do banco** (`DB_*`) não exige reiniciar o site nem gerar build: o site não conhece o
  banco.
- **Mudar a porta da API** (`PORT`) exige reiniciar a API **e** o site. O iniciador avisa o site
  sozinho. À mão, veja "Site apontando para a API errada" na seção 10. Num build (`npm run build`), o
  endereço da API fica gravado: gere o build de novo.

### Exemplo prático: "meu MySQL usa a porta 3307"

1. No Workbench, rode `SELECT @@port;` e confirme que aparece `3307`.
2. Pare o TrocaTicket (Enter na janela do iniciador).
3. Abra `server/.env`, troque a linha para `DB_PORT=3307` e salve.
4. Inicie de novo (dois cliques em `Iniciar-TrocaTicket.cmd`).
5. Confira na janela: `MySQL: 127.0.0.1:3307, ...` e `Banco pronto`. No log da API, deve aparecer
   `Banco conectado: ... em 127.0.0.1:3307`.

Se ainda aparecer outra porta, a janela mostra o motivo numa linha `Atenção:` (veja "Variável de
ambiente" abaixo).

## 10. Problemas comuns

Para cada caso: **o que você vê** e **o que conferir primeiro**.

### Porta ocupada (3000 ou 5173)

**Você vê:**

- No iniciador: `A porta 3000 da API está em uso...` ou `A porta 5173 do site está em uso...`.
- Na API à mão: `A porta 3000 já está em uso. Provavelmente há outra API aberta...`.
- No site à mão: `Error: Port 5173 is already in use`.

**Confira primeiro:** se há outra janela do TrocaTicket aberta. Pode ser uma antiga, outra pasta ou
outra versão: a Entrega 2 e a TrocaTicket 2.0 também usam a 5173, e a Entrega 2 usa a 3000. Feche-a e
inicie de novo.

Enquanto uma API antiga estiver aberta, o site continua falando com ela e com o banco que **ela** usa.
Por isso pode parecer que a sua configuração nova "não pegou".

Para descobrir quem usa a porta, no PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
Get-Process -Id NUMERO_QUE_APARECEU
Stop-Process -Id NUMERO_QUE_APARECEU
```

No macOS ou no Linux:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill NUMERO_DO_PID
```

### Conexão recusada (o MySQL não respondeu)

**Você vê:** `Nada respondeu em 127.0.0.1:3307. O MySQL está ligado? DB_PORT, em server/.env, é a porta
dele?`. No site, o login mostra "Erro interno ao realizar login.".

**Confira primeiro:**

1. Se o MySQL está ligado. No Windows, abra **Serviços**, procure "MySQL80" (ou parecido) e clique em
   Iniciar. No XAMPP, clique em "Start" no MySQL.
2. Se o `DB_PORT` é igual ao `SELECT @@port;` do Workbench.

A mensagem sempre mostra o endereço e a porta que a API **realmente** tentou.

### Acesso negado no MySQL

**Você vê:** `O MySQL em 127.0.0.1:3306 recusou o usuário ou a senha (DB_USER e DB_PASSWORD em
server/.env).`

**Confira primeiro:** se `DB_USER` e `DB_PASSWORD` são os mesmos que funcionam no Workbench. Se a senha
tiver `#`, espaço ou aspas, ela precisa estar entre aspas simples. Também dá para refazer a conexão
pelo iniciador: `Iniciar-TrocaTicket.cmd configurar`, ou `npm start -- configurar`.

### Banco inexistente ou sem as tabelas

**Você vê:**

- `O banco trocaticket_local não existe em ...`; ou
- ao iniciar a API: `Banco ... conectado, mas faltam tabelas do projeto`.

**Confira primeiro:** se o nome em `DB_NAME` está certo. Depois, prepare o banco: pelo iniciador, ou com
`npm run preparar-banco` na pasta do app (seção 6).

### `.env` na pasta errada ou com o nome errado

**Você vê:** ao iniciar, a API mostra
`Configuração: ...\server\.env (não encontrado)` e usa os padrões (porta 3306). Às vezes também aparece
`Existe server/.env.txt` ou `Há um .env com DB_* na pasta do site`.

**Confira primeiro:** se o arquivo é exatamente `server\.env`, **dentro da Entrega 1**. Rode
`dir server\.env` no PowerShell (ou `ls -a server` no Git Bash ou no macOS). Para ver o nome completo
dos arquivos no Explorador do Windows, ligue **Exibir → Extensões de nomes de arquivos**.

A linha `Configuração:` mostra o caminho completo do arquivo lido. Se aparecer `Entrega 2` ou
`TrocaTicket 2.0` nele, você abriu a versão errada.

### Variável de ambiente valendo mais que o arquivo

**Você vê:** `Atenção: DB_PORT está definida numa variável de ambiente (3306), que tem prioridade sobre
server/.env (3307).`

**Confira primeiro:** quais variáveis `DB_` existem. Os comandos abaixo mostram só os **nomes**, sem
os valores.

PowerShell:

```powershell
Get-ChildItem Env: | Where-Object Name -like 'DB_*' | Select-Object Name
Remove-Item Env:DB_PORT
```

Git Bash, macOS ou Linux:

```bash
env | grep -o '^DB_[A-Z_]*'
unset DB_PORT
```

O `Remove-Item` e o `unset` valem só para aquele terminal. Se a variável voltar, ela está salva no
sistema:

- no Windows, procure no menu Iniciar "Editar as variáveis de ambiente para sua conta", remova a
  variável, feche e abra o terminal de novo;
- no macOS ou no Linux, procure a linha no `~/.zshrc` ou no `~/.bashrc`.

### Site apontando para a API errada

**Você vê:**

- o login diz "Origem não permitida"; ou
- aparecem dados de outro banco ou de outra versão; ou
- você mudou `server/.env` e nada mudou.

**Confira primeiro:**

1. Se o endereço no navegador é exatamente `http://127.0.0.1:5173`, e não 5174 nem outra porta.
2. Se só existe **uma** API aberta (veja "Porta ocupada").
3. Se a linha `Configuração:` da API mostra o `server\.env` da Entrega 1.
4. Se mudou a porta da API (`PORT`), use o iniciador, que avisa o site sozinho. À mão, informe o novo
   endereço ao site antes de abrir. No PowerShell:

   ```powershell
   $env:VITE_API_URL="http://127.0.0.1:3001/api"; npm run dev
   ```

   No Git Bash, no macOS ou no Linux:

   ```bash
   VITE_API_URL=http://127.0.0.1:3001/api npm run dev
   ```

### Outros

- **`Failed to load url /src/main.jsx`:** o terminal não está na pasta do app (seção 2).
- **`npm.ps1 não pode ser carregado`:** use `npm.cmd` no lugar de `npm`, ou o Git Bash.
- **`DB_PORT inválida ("3307;")`:** a API e o iniciador recusam valores que não são só números. Arrume a
  linha em `server/.env`.

## 11. Testes automáticos e build

Na pasta do app:

```bash
npm test
npm run build
```

- `npm test` roda os testes do site e da API. Os testes de integração precisam de um MySQL cujo usuário
  possa criar bancos. Eles criam e apagam bancos temporários `trocaticket_teste_...` e **nunca** usam
  o `DB_NAME`. Sem MySQL configurado, esses testes aparecem como pulados.
- `npm run build` gera o site de produção em `dist/`.

## Referência: de onde vem cada configuração

Regra geral para todas as variáveis da API: **variável de ambiente (não vazia) > `server/.env` > valor
padrão**. A API, o preparo do banco, o `criar-admin`, os testes e o iniciador leem do mesmo jeito,
pelo `server/config.js`.

| Variável | Para que serve | Quem lê | Onde configurar | Padrão |
| --- | --- | --- | --- | --- |
| `DB_HOST` | endereço do MySQL | API, preparo do banco, criar-admin, testes, iniciador | `server/.env` | `127.0.0.1` |
| `DB_PORT` | porta do MySQL | os mesmos | `server/.env` | `3306` |
| `DB_USER` | usuário do MySQL | os mesmos | `server/.env` | vazio (o iniciador pergunta) |
| `DB_PASSWORD` | senha do MySQL | os mesmos | `server/.env` | vazio |
| `DB_NAME` | banco do projeto | API, preparo do banco, criar-admin, iniciador (os testes usam bancos temporários) | `server/.env` | `trocaticket` |
| `PORT` | porta da API | API e iniciador | `server/.env` | `3000` |
| `CORS_ORIGINS` | endereços do site aceitos pela API | API | `server/.env` (opcional) | `localhost` e `127.0.0.1`, portas 5173 e 4173 |
| `SESSION_HOURS`, `COOKIE_SECURE` | duração e segurança da sessão | API | `server/.env` (opcional) | `8`, `false` |
| `PAGAMENTO_SIMULADO`, `RESERVA_MINUTOS`, `CONVITE_MINUTOS` | regras simuladas | API | `server/.env` (opcional) | `aprovado`, `15`, `1440` |
| `SCRIPT_BANCO` | outro caminho para o `SCRIPT_BANCO_V2.sql` | preparo do banco e iniciador | `server/.env` (opcional) | `documentos/Entrega 2/PROJETOS EM BANCO DE DADOS/SCRIPT_BANCO_V2.sql` |
| `VITE_API_URL` | endereço da API usado pelo site | site (Vite), ao iniciar ou no build | variável de ambiente ao rodar `npm run dev` ou `npm run build`; o iniciador define sozinho se `PORT` não for 3000 | mesmo endereço do site, porta `3000` |
| porta do site | onde o site abre | Vite | `vite.config.js` (fixa) | `5173` (preview: `4173`) |
| `CRIAR_ADMIN_NOME`, `CRIAR_ADMIN_EMAIL`, `CRIAR_ADMIN_SENHA` | automação do `npm run criar-admin` | criar-admin | só como variável de ambiente, nunca em arquivo | — |

Para o `VITE_API_URL`, a ordem é: a variável que você definir > a que o iniciador define > o padrão.
