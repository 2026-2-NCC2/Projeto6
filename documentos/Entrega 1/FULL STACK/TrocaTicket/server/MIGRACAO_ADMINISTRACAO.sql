# MIGRAÇÃO — administração e aprovação de contas (etapa 6 da integração com a TrocaTicket 2.0)
#
#   - aprovacao_conta: histórico das decisões da administração sobre cada conta (quem decidiu,
#     situação e motivo). A situação atual continua em usuario.status_aprovacao (A, P ou R).
#   - evento.cancelado_em, motivo_cancelamento e cancelado_por: registro do cancelamento do evento,
#     que também estorna quem pagou (feito pela API).
#   - Contas já existentes: na PRIMEIRA aplicação deste arquivo, as contas pendentes (P) são
#     aprovadas, porque até aqui ninguém aprovava contas e elas já estavam em uso. Depois disso,
#     contas novas de organizador e fornecedor ficam pendentes até a administração aprovar.
#
# Ordem: SCRIPT_BANCO_V2.sql -> MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql -> MIGRACAO_SESSAO_LOGIN.sql
#        -> MIGRACAO_PEDIDOS_PAGAMENTOS.sql -> MIGRACAO_REPASSE.sql -> MIGRACAO_PORTARIA_ATENDIMENTO.sql
#        -> este arquivo.
# Pode ser executada mais de uma vez e não apaga dados. Compatível com MySQL 8 e MariaDB 10.5+.
# Se o seu banco tiver outro nome, ajuste o USE.

USE trocaticket;

# Primeira aplicação? (a tabela de histórico ainda não existe)
SET @primeira_vez = (SELECT COUNT(*) = 0 FROM information_schema.tables
                      WHERE table_schema = DATABASE() AND table_name = 'aprovacao_conta');

CREATE TABLE IF NOT EXISTS aprovacao_conta(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    admin_id INT NULL,
    situacao CHAR(1) NOT NULL,
    motivo VARCHAR(500) NULL,
    criado_em DATETIME NOT NULL,

    INDEX idx_aprovacao_usuario (usuario_id, id),

    CONSTRAINT chk_aprovacao_situacao
        CHECK (situacao IN ('A', 'P', 'R')),

    CONSTRAINT fk_aprovacao_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

    CONSTRAINT fk_aprovacao_admin
        FOREIGN KEY (admin_id) REFERENCES usuario(id) ON DELETE SET NULL
);

# Contas anteriores à exigência de aprovação: aprovadas uma única vez, com registro no histórico.
SET @sql = IF(@primeira_vez,
  "INSERT INTO aprovacao_conta (usuario_id, admin_id, situacao, motivo, criado_em)
   SELECT id, NULL, 'A', 'Conta anterior à exigência de aprovação', UTC_TIMESTAMP()
     FROM usuario WHERE status_aprovacao = 'P'",
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

SET @sql = IF(@primeira_vez, "UPDATE usuario SET status_aprovacao = 'A' WHERE status_aprovacao = 'P'", 'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

# Registro do cancelamento do evento.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'evento' AND column_name = 'cancelado_em') = 0,
  'ALTER TABLE evento ADD COLUMN cancelado_em DATETIME NULL, ADD COLUMN motivo_cancelamento VARCHAR(500) NULL, ADD COLUMN cancelado_por INT NULL, ADD CONSTRAINT fk_evento_cancelado_por FOREIGN KEY (cancelado_por) REFERENCES usuario(id) ON DELETE SET NULL',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

# Conferência: deve voltar vazia.
SELECT estruturas.tabela, estruturas.coluna
  FROM (SELECT 'aprovacao_conta' AS tabela, 'situacao' AS coluna
        UNION ALL SELECT 'evento', 'cancelado_em'
        UNION ALL SELECT 'evento', 'motivo_cancelamento'
        UNION ALL SELECT 'evento', 'cancelado_por') estruturas
  LEFT JOIN information_schema.columns c
    ON c.table_schema = DATABASE() AND c.table_name = estruturas.tabela
   AND c.column_name = estruturas.coluna
 WHERE c.column_name IS NULL;
