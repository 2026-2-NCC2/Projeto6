# TrocaTicket

Projeto acadêmico com React, Express e MySQL. Pagamentos, emissão e portaria são simulados.

## Abrir o sistema

1. Deixe seu **servidor MySQL iniciado**, como quando usa o Workbench.
2. Dê dois cliques em **`Iniciar-TrocaTicket.cmd`**.
3. Na primeira abertura, informe usuário, porta e senha da sua conexão MySQL. Depois, basta abrir o mesmo iniciador.

O iniciador instala as dependências quando necessário, confere a base, abre a API e o site e mostra o endereço no navegador. **Não precisa preparar o banco nem abrir dois terminais manualmente a cada uso.** Deixe a única janela aberta; pressione **Enter** ou **Ctrl+C** nela para encerrar.

É necessário Node.js 22.12 ou posterior com npm e MySQL 8 da série validada (8.0.16+; testes em 8.0.46). A primeira instalação precisa de internet. Workbench é o cliente; seu servidor MySQL precisa estar ligado.

A conexão fica em `config/conexao.local.json`, com a senha protegida pelo usuário do Windows. Esse arquivo é privado e fica fora do ZIP. Para trocar a conexão, execute `Iniciar-TrocaTicket.cmd configurar`. Ao copiar o projeto para outro computador/usuário, configure novamente.

## Entrar para demonstrar

As mesmas contas também aparecem na página inicial, na seção **Acesso para testes**. O botão **Usar esta conta** preenche e-mail e senha inicial na tela de login; confirme em **Entrar**. Se uma senha foi alterada no perfil, use a senha atual.

Senha inicial das contas abaixo: **`Demo-Academica-2026!`**. É a senha do site, diferente da senha MySQL.

| Perfil                        | E-mail fictício                |
| ----------------------------- | ------------------------------ |
| Participante                  | `ana.demo@example.com`         |
| Outra participante            | `bruna.demo@example.com`       |
| Destinatário de transferência | `caio.demo@example.com`        |
| Organizador                   | `organizador.demo@example.com` |
| Fornecedor                    | `fornecedor.demo@example.com`  |
| Administrador                 | `admin.demo@example.com`       |

Depois de entrar como administrador, clique em **Administração** no cabeçalho. Use sessões separadas do navegador para demonstrar usuários simultâneos. As senhas já alteradas no perfil são preservadas.

## Onde está cada coisa

- `src/`: telas e componentes React.
- `server/`: API, regras e acesso ao MySQL.
- `scripts/`: inicialização local; não precisa editar para usar.
- `docs/`: explicações para estudar e consultar quando necessário.
- `historico/`: versões e pacotes anteriores, preservados somente na pasta de trabalho.

Este é o único guia necessário para abrir o sistema. Para estudar o código, consulte [o mapa das aulas e arquivos](docs/ESTUDAR-O-CODIGO.md). Para apresentação, consulte [o roteiro](docs/mvp/ROTEIRO-APRESENTACAO.md). Outros documentos estão no [índice técnico](docs/README.md).

## Se não abrir

A janela mostra a etapa que falhou. Confira se o MySQL está iniciado e se a conexão informada funciona no Workbench. Detalhes ficam em `logs/`. Se uma porta estiver ocupada, feche a execução anterior do projeto e tente novamente. O iniciador não encerra programas desconhecidos.

A aplicação usa `trocaticket_mvp_academico`; o banco M1 antigo é preservado. Configuração, senhas locais, logs, dependências e histórico não são enviados no ZIP.

Para compartilhar o frontend de demonstração, use [o site no GitHub Pages](https://tiago-u12.github.io/projeto-faculdade/). Nessa versão, os dados são fictícios e ficam apenas no navegador de cada visitante; o sistema completo com API e MySQL continua nesta pasta. Os ajustes de acessibilidade, idiomas e aparência são compartilhados entre as duas versões.
