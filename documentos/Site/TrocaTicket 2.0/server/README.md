# API acadêmica local do TrocaTicket

Express, JavaScript e mysql2, seguindo a organização didática das aulas 9–12. Esta API integra o frontend 0.4.2 da raiz e usa **somente `trocaticket_mvp_academico`**, uma base nova. O banco M1 `trocaticket_dev_mysql_20261018` não é migrado, importado, apagado ou redefinido.

Requer Node 22.12 ou posterior e MySQL 8.0.16 ou posterior da série 8, com InnoDB e constraints ativas. Workbench é o cliente; o servidor MySQL precisa estar iniciado. MariaDB/XAMPP não substitui o motor validado nesta entrega.

Para abrir normalmente, use apenas `Iniciar-TrocaTicket.cmd` e o [guia principal](../README.md). As instruções abaixo são alternativas técnicas para estudar ou depurar a API separadamente.

## Configuração manual da API

1. Execute `npm.cmd ci --ignore-scripts` nesta pasta.
2. Copie `.env.example` para `.env` e preencha suas credenciais **somente no computador**. Não envie esse arquivo ou senha para o GitHub, chat ou frontend. `DB_NAME` permanece `trocaticket_mvp_academico`. Não use variáveis `VITE_*` para senha ou usuário MySQL.
3. Execute `npm.cmd run migrate`. A rotina cria a base nova se estiver ausente, recusa adotar uma base sem histórico e aplica os arquivos numerados de `migrations/`.
4. Execute `npm.cmd run seed` uma vez para os dados fictícios. A segunda execução reconhece o checkpoint e preserva contas, senhas e operações já feitas.
5. Execute `npm.cmd start`. A API escuta somente `127.0.0.1:3333`. Abra `/api/saude` nesse endereço para conferir a conexão. O frontend utiliza o proxy `/api` do Vite.

O iniciador da raiz pode fornecer as mesmas configurações apenas ao processo, evitando escrever `.env`. Para uma conta MySQL realmente sem senha, `DB_PASSWORD_EMPTY=1` permite representar explicitamente a senha vazia quando o PowerShell remover uma variável vazia; essa opção não cria conta nem altera credenciais. A senha das contas abaixo é diferente da credencial MySQL.

Não foram executados `GRANT`, criação de usuário MySQL ou alterações de privilégios. No ambiente do aluno, prefira uma conta da aplicação com permissões apenas na base nova, e mantenha a credencial de migração separada quando disponível. As permissões da conexão usada continuam sob controle local do aluno.

## Contas fictícias

Senha inicial de demonstração: `Demo-Academica-2026!`. Pode ser substituída por `DEMO_PASSWORD` antes do primeiro seed. O banco guarda somente hashes scrypt com sal independente, nunca essa senha em texto puro.

| Email | Perfil e estado inicial |
| --- | --- |
| ana.demo@example.com | Participante aprovado |
| bruna.demo@example.com | Participante aprovado |
| caio.demo@example.com | Participante aprovado |
| organizador.demo@example.com | Organizador aprovado |
| fornecedor.demo@example.com | Fornecedor aprovado |
| admin.demo@example.com | Participante com permissão administrativa adicional |
| organizador.pendente@example.com | Organizador pendente |
| fornecedor.pendente@example.com | Fornecedor pendente |

O seed cria Festival do Campus fictício em 15/12/2030 às 19h de São Paulo (22h UTC), capacidade 30: inteira de R$ 100 com estoque 20 e meia de R$ 50 com estoque 10. Não há ingressos pré-emitidos; a compra simulada gera unidades individuais. Inclui um serviço fictício e uma proposta B2B pendente. Os dados são para apresentação, sem contrato, ingresso, identidade ou pagamento real.

Use duas sessões separadas do navegador para representar Ana e Bruna. Trocar o perfil visual não autentica outra pessoa. O administrador aprovado controla os cenários dos simuladores; um participante não pode enviar `status=aprovado` para forçar um resultado financeiro.

## Integridade, tempo e limites

Migrações registram checksum do arquivo e impressão SHA-256 da estrutura MySQL. Uma segunda aplicação só prossegue se o histórico e a estrutura coincidirem. Não edite uma migração já aplicada. Divergência ou DDL parcial interrompe o processo para diagnóstico; não há reset, exclusão de tabela, desativação de FK/CHECK ou adoção silenciosa via `IF NOT EXISTS`.

**DDL MySQL tem commit implícito.** Se a aplicação de uma migração falhar, preserve a instância e o log, confira o catálogo e o histórico e prepare uma correção versionada. Uma transação não desfaz `CREATE/ALTER`. Para uma base com dados, obtenha cópia de segurança local apropriada antes de uma futura mudança; restauração e reparos destrutivos não fazem parte dos iniciadores.

As operações de negócio usam transação InnoDB e locks. O estoque B2B considera propostas aceitas de cada produto e não é o estoque de ingresso. Preços e totais de negócio são calculados em centavos no servidor. A API de evento exige datas ISO com `Z` ou offset explícito; grava UTC. As datas históricas do M1 não foram convertidas nem reinterpretadas.

Sessões opacas ficam em cookie HttpOnly/SameSite=Lax; token CSRF em memória do cliente. Escritas exigem `Origin` local permitido e, após autenticação, `X-CSRF-Token`. Não armazenar sessão/senha em localStorage. O modo local usa HTTP e cookie sem Secure; `SECURE_COOKIES=true` só é apropriado para HTTPS de uma eventual etapa futura autorizada. Esta entrega não publica nem expõe o MySQL à rede.

## Contratos e testes

- [API de sessão, catálogo e B2B](API-BACKEND.md)
- [Fluxos transacionais e simuladores](docs/API-TRANSACOES.md)
- `npm.cmd test`: testes puros e a integração real optativa. Um teste ignorado por falta da configuração de QA não equivale a teste aprovado.
- A integração real exige a instância isolada explicitamente identificada; veja o início de `tests/mvp-integracao.test.js`. Não apontar testes de escrita para o M1 nem para uma base pessoal com dados.

Recuperação de senha, OAuth, email/SMS, emissor comercial, Pix/cartão e identidade civil real não são integrados. Pagamento, emissor e portaria são simuladores locais identificados. Isso não certifica segurança comercial, identidade única ou eliminação de fraude.
