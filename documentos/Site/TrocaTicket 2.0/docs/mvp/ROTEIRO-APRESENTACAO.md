# Roteiro de apresentação — TrocaTicket MVP acadêmico

**18/10/2026.** Use a aplicação integrada da raiz 0.4.2 e a base nova `trocaticket_mvp_academico`. O banco M1 anterior permanece separado. Este roteiro descreve operações persistidas pela API/MySQL; pagamentos, emissão e portaria continuam sendo simuladores acadêmicos locais.

> Demonstração acadêmica • sem pagamentos ou ingressos reais.

## Preparação e contas fictícias

Abra `Iniciar-TrocaTicket.cmd`; a configuração e o preparo são conferidos pelo próprio iniciador. O endereço usual é [http://127.0.0.1:5173](http://127.0.0.1:5173). Se a API estiver indisponível, a interface informa a falha; ela não inventa operações salvas no navegador.

Todas as contas abaixo são fornecidas pelo seed e usam a senha fictícia **`Demo-Academica-2026!`**. Essa é uma senha de demonstração da aplicação, **não** a senha do MySQL. Caso a senha do seed tenha sido configurada com outro valor, use o valor configurado; reaplicar o seed não redefine contas existentes.

| Conta                     | E-mail fictício                    | Papel na apresentação                                         |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Ana Demo                  | `ana.demo@example.com`             | Primeira titular; compra por R$ 100 e anuncia por R$ 70.      |
| Bruna Demo                | `bruna.demo@example.com`           | Entra na fila, compra o repasse e convida Caio gratuitamente. |
| Caio Demo                 | `caio.demo@example.com`            | Aceita a gratuidade; passa a ter custo e teto zero.           |
| Organizador Demo          | `organizador.demo@example.com`     | Eventos, categorias, orçamento e portaria de seus eventos.    |
| Fornecedor Demo           | `fornecedor.demo@example.com`      | Inventário, propostas e oportunidades.                        |
| Admin Demo                | `admin.demo@example.com`           | Aprovações, atendimento e cenários dos simuladores.           |
| Organizador Pendente Demo | `organizador.pendente@example.com` | Demonstra bloqueio de operações antes da aprovação.           |
| Fornecedor Pendente Demo  | `fornecedor.pendente@example.com`  | Demonstra aprovação administrativa.                           |

Abra [Entrar](http://127.0.0.1:5173/entrar) em sessões independentes. Por exemplo: Edge normal para Ana, Edge InPrivate para Bruna e Chrome para Caio. Duas abas normais do mesmo navegador compartilham a sessão; duas janelas InPrivate também podem compartilhá-la. Alternativamente, use **Sair** antes de entrar com outra conta. O perfil exibido vem da sessão do servidor, não de um seletor de permissões.

O seed cria o **Festival do Campus fictício**, em dezembro de 2030, com capacidade 30: categoria Inteira a R$ 100,00, estoque 20; Meia-entrada a R$ 50,00, estoque 10. Não presuma IDs fixos: abra os itens pelos links da interface. Se os registros já tiverem sido usados em ensaios, crie outro evento fictício com o organizador; não apague nem resete dados para repetir a apresentação.

## Fluxo principal: R$ 100 → R$ 70 → gratuidade

### 1. Compra primária e ingresso individual — Ana

1. Em **Eventos**, abra o Festival e selecione a categoria **Inteira**, quantidade **1**.
2. Confira preço unitário, total simulado e **Cobrança real R$ 0,00**. Clique em **Reservar ingresso**.
3. Em **Acompanhar pedido**, observe o prazo da reserva e os estados separados de pagamento e entrega. Clique em **Confirmar compra simulada**.
4. Com o simulador padrão aprovado/sucesso, o pedido fica entregue. Abra **Ver ingresso na carteira**.
5. Na carteira, anote o identificador `DEMO-...` e copie o **código A**. Confira valor original R$ 100, custo R$ 100 e teto R$ 100. A quantidade comprada corresponde a unidades individuais, cada uma com seu código.

### 2. Fila e repasse por R$ 70 — Ana e Bruna

1. Na sessão de Bruna, abra o mesmo evento e a mesma categoria Inteira. Clique em **Entrar na fila de repasse**. Consulte **Pedidos e fila** para ver sua posição.
2. Em Ana, abra o ingresso na carteira e clique em **Repassar ingresso**. Digite `400,00`: a interface recusa o valor acima do teto e não publica o anúncio. O backend também verifica esse teto em chamadas diretas, conforme os testes de integração.
3. Substitua por `70,00` e clique em **Publicar anúncio de demonstração**. O anúncio pode ficar reservado imediatamente para Bruna, que já estava na fila.
4. Em Bruna, atualize **Pedidos e fila** e abra **Ver oportunidade reservada**. Confirme a compra simulada de R$ 70,00 dentro do prazo.
5. Na carteira de Bruna, confirme **valor original R$ 100, custo de aquisição R$ 70 e teto do próximo repasse R$ 70**. Copie o **código B**.
6. Tente preparar um novo repasse por R$ 100: ele deve ser recusado por exceder R$ 70. O preço de um lote atual mais caro não aumenta o teto da unidade. Não publique outro anúncio antes da gratuidade; se tiver publicado, retire-o enquanto não houver reserva.
7. Em Ana, consulte o histórico pelo endereço anotado do ingresso: a participação anterior permanece registrada, mas a credencial vigente não é mostrada para quem já não é titular.

### 3. Conferir código revogado sem consumir o ingresso

Entre como organizador responsável e abra [Portaria simulada](http://127.0.0.1:5173/portaria). Selecione o evento e informe o **código A**, anterior ao repasse: a entrada deve ser recusada como código desconhecido ou revogado.

**Não valide o código B ainda.** Validar um código vigente marca o ingresso como utilizado e impediria a transferência gratuita da próxima etapa. A portaria não precisa de câmera: existe campo manual acessível para o código.

### 4. Convite gratuito e aceite — Bruna e Caio

1. Em Bruna, abra a unidade e **Transferir gratuitamente**. Informe `caio.demo@example.com`, leia a consequência de custo/teto zero, confirme a declaração e envie o convite.
2. Antes do aceite, Bruna continua titular. O convite pendente bloqueia operações conflitantes. Enviar convite não troca imediatamente a titularidade e não envia e-mail real.
3. Em Caio, abra [Transferências gratuitas](http://127.0.0.1:5173/transferencias). Leia o aviso e clique em **Entendi, aceitar gratuitamente**. Não há checkout, taxa ou pagamento obrigatório neste fluxo.
4. Na carteira de Caio, confira **custo de aquisição R$ 0,00 e teto R$ 0,00**. Ele só pode transferir novamente gratuitamente. Copie o **código C**, diferente do código B.
5. O histórico da unidade conserva emissão, repasse e gratuidade. A categoria Inteira não é alterada. Em uma segunda unidade, pode-se demonstrar **Recusar convite** ou **Cancelar convite**: o titular anterior permanece dono.

### 5. Entrada única — organizador e Caio

1. Na portaria do evento, tente o **código B**: ele foi revogado na gratuidade e deve ser recusado.
2. Informe o **código C**: a primeira validação autoriza a entrada acadêmica e marca a unidade como utilizada.
3. Informe novamente o código C: a segunda leitura é recusada. Na carteira, atualize e confira **Utilizado**; novas operações de repasse/gratuidade não ficam disponíveis.
4. Consulte **Ver histórico e ingresso atual** para apresentar o registro de entrada. Nenhum código demonstrativo é um ingresso externo real.

## Falhas, recuperação e estorno simulados

Use **novos pedidos** para esses cenários. Não reaproveite a unidade já utilizada do fluxo principal. Os controles em `/admin` afetam as próximas operações da base compartilhada; combine o cenário com os colegas antes de alterá-lo.

| Etapa                | Ação na interface                                                                                                                                                                                      | Resultado a apresentar                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrega pendente     | Admin: **Cenário de pagamento fictício = Aprovado** e **Cenário de emissão e transferência = Falha temporária**; **Salvar cenários de demonstração**. Participante reserva e confirma uma nova compra. | Pagamento aprovado, entrega pendente. A carteira não mostra uma emissão inexistente como entregue.                                                                                                          |
| Recuperar            | Admin muda emissão para **Sucesso** e salva. Participante abre o pedido pendente e **Tentar entregar novamente**.                                                                                      | A entrega conclui uma vez; o ingresso individual aparece na carteira. Atualizar/repetir a operação não deve duplicar unidades.                                                                              |
| Estornar             | Faça outro pedido com emissão em falha temporária. No pedido pendente, **Solicitar estorno simulado**.                                                                                                 | O estado fica estornado, sem cobrança real, sem ingresso falsamente entregue e sem segundo estorno em repetição. O estorno direto deste fluxo é antes da entrega; após entrega/utilização, use atendimento. |
| Pagamento recusado   | Admin seleciona pagamento **Recusado**, emissão **Sucesso** e salva. Confirme uma nova reserva.                                                                                                        | Pagamento recusado e operação encerrada, sem emitir ingresso. Uma nova tentativa parte de outra reserva.                                                                                                    |
| Serviço indisponível | Repita com pagamento **Indisponível**.                                                                                                                                                                 | Indisponibilidade explícita; não há falso sucesso nem passagem automática para dados locais.                                                                                                                |

Ao terminar, restaure no administrador **Aprovado / Sucesso** e salve. O painel também informa os prazos e o limite configurados. No padrão da demo, reservas e convites vencem em 10 minutos, com limite de quatro unidades por conta e evento, considerando posse válida, reservas vigentes e convites gratuitos pendentes do destinatário. Para demonstrar expiração pela UI, aguarde o prazo e atualize: a confirmação é do relógio do servidor, inclusive após recarregar, e não apenas do cronômetro React.

## Cancelar evento e acompanhar atendimento

Faça o cancelamento em um **evento fictício separado**, criado pelo organizador em `/organizador/novo`, para preservar o Festival e o roteiro principal. Configure capacidade e categorias finitas antes de publicar. Se quiser mostrar a cadeia de repasses, compre uma unidade e conclua um repasse antes de cancelar esse novo evento.

1. Em **Meus eventos → Editar evento**, vá a **Cancelar evento**. Informe um motivo fictício, marque **Confirmo o cancelamento deste evento fictício** e confirme **Cancelar evento e conciliar operações**.
2. Confira o estado cancelado no catálogo, as unidades canceladas e os estados conciliados dos pedidos em cada conta envolvida. O cancelamento é irreversível na interface; repetir a solicitação não deve duplicar estornos. O histórico é preservado.
3. Em qualquer pedido acessível, abra **Abrir solicitação**. Isso preenche o vínculo do pedido em `/atendimentos?pedido=...`. Para um anúncio, use **Denunciar anúncio** no detalhe do evento, que abre `/atendimentos?anuncio=...`.
4. Preencha assunto e mensagem fictícios, sem documentos ou dados financeiros reais, e **Registrar solicitação**. O vínculo é obrigatório e o servidor verifica o acesso.
5. Em Admin, abra **Atendimentos e denúncias**. Localize uma solicitação no histórico, preencha **Resposta administrativa**, escolha **Aberto / Em análise / Encerrado** e salve.
6. Na conta solicitante, atualize para conferir a resposta e a situação persistidas. Atendimento não recria automaticamente um ingresso usado como novo.

## Organizador, fornecedor e orçamento B2B

O fornecedor oferece produtos/serviços para o evento. Essa proposta B2B é diferente de um anúncio de ingresso.

1. Fornecedor: `/fornecedor/inventario` → **Adicionar item**. Preencha nome, descrição fictícia, Produto/Serviço, preço, estoque e situação ativa. **Salvar item**; depois **Editar** deve preencher o formulário com o registro salvo. Desativar o item preserva os registros anteriores.
2. Fornecedor: `/fornecedor` → escolha um evento publicado → **Preparar proposta**. Selecione um produto próprio; o preço de referência é preenchido e pode ser ajustado na proposta. Informe quantidade e descrição e **Enviar proposta**.
3. Fornecedor: `/fornecedor/propostas` para acompanhar o estado. Uma proposta pendente pode ser cancelada pelo próprio fornecedor.
4. Organizador: `/organizador/eventos` → evento → **Propostas e orçamento**. **Aceitar proposta** ou **Recusar proposta**. Apenas as aceitas entram no orçamento calculado pelo servidor.
5. Organizador: `/organizador/fornecedores` para alternar entre **Fornecedores**, **Insumos & Materiais** e **Contratos & Propostas**. Não há contratação ou cobrança comercial real.

Para apresentar aprovação, entre com uma das contas pendentes: ela consegue consultar o próprio perfil, mas as áreas restritas permanecem bloqueadas. Admin aprova em `/admin`. Após a atualização da sessão/reentrada, a conta passa a acessar somente o papel concedido pelo servidor. O cadastro público não cria administradores.

## Teclado, mobile, idiomas e limites

- Use Tab/Shift+Tab nos campos, botões e links. O foco é visível; diálogos podem ser fechados por Escape. No mobile, abra o menu para encontrar Perfil e Notificações.
- No cabeçalho, teste idioma e painel de acessibilidade. Aparência Claro/Escuro/Sistema, contraste, fontes/espaçamento e preferências persistem ao recarregar. Nomes e descrições fictícios vindos do banco não recebem tradução automática.
- O modo integrado usa sessão HttpOnly, CSRF em memória e permissões do backend. Preferências e favoritos podem ficar no navegador; titularidade, estoque e pedidos ficam no MySQL.
- O frontend antigo foi preservado explicitamente em `src/LegacyApp.jsx` com `VITE_APP_MODE=demo`. Rotas como `/perfis`, a antiga troca livre de papel e relatórios/moderação locais antigos pertencem àquela demonstração: no modo integrado, `/perfis` encaminha ao cadastro, `/admin/moderacao` mostra administração e `/admin/relatorios/:id` encaminha à área de atendimento. Não confunda simulações locais antigas com operações persistidas.
- Recuperação por e-mail, OAuth/redes sociais, chat em tempo real, upload de arquivos, câmera e validação offline não estão habilitados. Capa e foto de perfil usam endereços de imagem permitidos. A alternativa de portaria é a digitação manual online.
- Não existem Pix/cartão, dinheiro, ingressos de artistas reais, documento civil obrigatório, biometria, integração comercial de ticketeira ou garantia de eliminação de fraude. Nenhum e-mail/SMS real é enviado. O projeto não foi publicado e não exige alterar o GitHub.

## Evidências de interface e significado

Os arquivos em `docs/validacao/polimento/business/` registram a conferência das telas de negócio com API/MySQL **de ensaio** reais: leitura do editor/categorias, diretório, portaria manual, inventário, cotação e mobile 390px, sem exceções JavaScript. Foram usadas contas fictícias e apenas leitura dos objetos de negócio; esses sete grupos não substituem os testes transacionais/concorrentes nem significam conexão já executada no banco pessoal do aluno.

O JSON identifica esse escopo. As imagens `editar-evento-desktop.png`, `inventario-desktop.png` e `inventario-mobile.png` foram inspecionadas. O editor fotografado pode mostrar um evento cancelado de ensaio, com controles desabilitados corretamente. Use o relatório geral de validação para os resultados de compra, repasse, gratuidade, idempotência e concorrência; este documento é o roteiro reproduzível de apresentação.
