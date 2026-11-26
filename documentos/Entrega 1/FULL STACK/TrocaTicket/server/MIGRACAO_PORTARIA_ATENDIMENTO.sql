# MIGRAÇÃO — portaria e atendimento (etapa 5 da integração com a TrocaTicket 2.0)
#
# Adaptada das tabelas mvp_entrada, mvp_atendimento e mvp_atendimento_mensagem da TrocaTicket 2.0:
#   - entrada_portaria: uma linha por ingresso que entrou no evento (a chave primária impede a
#     segunda entrada com o mesmo ingresso);
#   - atendimento: solicitação ou denúncia ligada a um pedido ou a um anúncio de revenda;
#   - atendimento_mensagem: histórico de mensagens de quem pediu e da organização do evento.
# A portaria é simulada: o código vem de Meus ingressos e não há leitura de câmera.
#
# Ordem: SCRIPT_BANCO_V2.sql -> MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql -> MIGRACAO_SESSAO_LOGIN.sql
#        -> MIGRACAO_PEDIDOS_PAGAMENTOS.sql -> MIGRACAO_REPASSE.sql -> este arquivo.
# Pode ser executada mais de uma vez e não apaga dados. Compatível com MySQL 8 e MariaDB 10.5+.
# Se o seu banco tiver outro nome, ajuste o USE.

USE trocaticket;

CREATE TABLE IF NOT EXISTS entrada_portaria(
    ingresso_id INT NOT NULL PRIMARY KEY,
    evento_id INT NOT NULL,
    operador_id INT NOT NULL,
    entrou_em DATETIME NOT NULL,

    INDEX idx_entrada_evento (evento_id, entrou_em),

    CONSTRAINT fk_entrada_ingresso
        FOREIGN KEY (ingresso_id) REFERENCES ingresso(id) ON DELETE CASCADE,

    CONSTRAINT fk_entrada_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

    CONSTRAINT fk_entrada_operador
        FOREIGN KEY (operador_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Sem CHECK "pedido ou anúncio": o MySQL 8 não aceita CHECK em coluna com ação de chave
# estrangeira (ON DELETE SET NULL). A API exige exatamente um dos dois.
CREATE TABLE IF NOT EXISTS atendimento(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    evento_id INT NOT NULL,
    pedido_id INT NULL,
    anuncio_id INT NULL,
    assunto VARCHAR(150) NOT NULL,
    status ENUM('aberto', 'em_analise', 'encerrado') NOT NULL DEFAULT 'aberto',
    criado_em DATETIME NOT NULL,
    atualizado_em DATETIME NOT NULL,

    INDEX idx_atendimento_usuario (usuario_id, status),
    INDEX idx_atendimento_evento (evento_id, status),

    CONSTRAINT fk_atendimento_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

    CONSTRAINT fk_atendimento_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

    CONSTRAINT fk_atendimento_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE SET NULL,

    CONSTRAINT fk_atendimento_anuncio
        FOREIGN KEY (anuncio_id) REFERENCES anuncio_ingresso(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS atendimento_mensagem(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    atendimento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    mensagem VARCHAR(2000) NOT NULL,
    criado_em DATETIME NOT NULL,

    INDEX idx_mensagem_atendimento (atendimento_id, id),

    CONSTRAINT fk_mensagem_atendimento
        FOREIGN KEY (atendimento_id) REFERENCES atendimento(id) ON DELETE CASCADE,

    CONSTRAINT fk_mensagem_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Conferência: deve voltar vazia.
SELECT estruturas.tabela, estruturas.coluna
  FROM (SELECT 'entrada_portaria' AS tabela, 'operador_id' AS coluna
        UNION ALL SELECT 'atendimento', 'anuncio_id'
        UNION ALL SELECT 'atendimento', 'status'
        UNION ALL SELECT 'atendimento_mensagem', 'mensagem') estruturas
  LEFT JOIN information_schema.columns c
    ON c.table_schema = DATABASE() AND c.table_name = estruturas.tabela
   AND c.column_name = estruturas.coluna
 WHERE c.column_name IS NULL;
