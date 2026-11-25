# MIGRAÇÃO COMPLEMENTAR (não oficial) — TrocaTicket
#
# O README cita MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql, mas o arquivo oficial não
# existe em nenhuma branch do repositório. Esta versão foi escrita a partir das
# consultas de server/server.js e completa o banco criado por SCRIPT_BANCO_V2.sql:
#   - fornecedor_detalhes: endereco, notificacoes e dois_fatores_ativo
#   - ingresso: disponivel_troca
#   - tabelas evento_fornecedor, evento_favorito, comunidade_mensagem e troca_ingresso
#
# Pode ser executada mais de uma vez: só cria o que estiver ausente e não apaga dados.
# Compatível com MySQL 8 e MariaDB 10.5+. Se o seu banco tiver outro nome, ajuste o USE.
# Se a equipe publicar a migração oficial, ela deve substituir este arquivo.

USE trocaticket;

# ---------------------------------------------------------------------------
# Colunas novas em tabelas existentes (condicionais, para permitir reaplicar)
# ---------------------------------------------------------------------------

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'fornecedor_detalhes'
      AND column_name = 'endereco') = 0,
  'ALTER TABLE fornecedor_detalhes ADD COLUMN endereco JSON NULL',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'fornecedor_detalhes'
      AND column_name = 'notificacoes') = 0,
  'ALTER TABLE fornecedor_detalhes ADD COLUMN notificacoes JSON NULL',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'fornecedor_detalhes'
      AND column_name = 'dois_fatores_ativo') = 0,
  'ALTER TABLE fornecedor_detalhes ADD COLUMN dois_fatores_ativo BOOLEAN NOT NULL DEFAULT FALSE',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ingresso'
      AND column_name = 'disponivel_troca') = 0,
  'ALTER TABLE ingresso ADD COLUMN disponivel_troca BOOLEAN NOT NULL DEFAULT FALSE',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

# ---------------------------------------------------------------------------
# Tabelas novas
# ---------------------------------------------------------------------------

# Fornecedores vinculados pelo organizador a um evento.
# A chave primária composta evita vínculo duplicado (a API usa INSERT IGNORE).
CREATE TABLE IF NOT EXISTS evento_fornecedor(
    evento_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
    data_vinculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (evento_id, fornecedor_id),

    CONSTRAINT fk_evento_fornecedor_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

    CONSTRAINT fk_evento_fornecedor_fornecedor
        FOREIGN KEY (fornecedor_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Eventos favoritos do participante (um registro por par usuário/evento).
CREATE TABLE IF NOT EXISTS evento_favorito(
    usuario_id INT NOT NULL,
    evento_id INT NOT NULL,
    data_favorito DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (usuario_id, evento_id),

    CONSTRAINT fk_favorito_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

    CONSTRAINT fk_favorito_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE
);

# Mensagens da comunidade (a API limita o texto a 500 caracteres).
CREATE TABLE IF NOT EXISTS comunidade_mensagem(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    texto VARCHAR(500) NOT NULL,
    data_publicacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_comunidade_data (data_publicacao),

    CONSTRAINT fk_comunidade_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Solicitações de troca direta entre dois ingressos.
# A API garante que os ingressos são diferentes; não há CHECK entre as duas colunas
# porque o MySQL 8 proíbe CHECK em colunas usadas por ações de chave estrangeira.
CREATE TABLE IF NOT EXISTS troca_ingresso(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    ingresso_solicitado_id INT NOT NULL,
    ingresso_ofertado_id INT NOT NULL,
    solicitante_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    data_solicitacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_resposta DATETIME NULL,

    INDEX idx_troca_status (status),

    CONSTRAINT chk_troca_status
        CHECK (status IN ('Pendente', 'Aceita', 'Recusada', 'Cancelada')),

    CONSTRAINT fk_troca_ingresso_solicitado
        FOREIGN KEY (ingresso_solicitado_id) REFERENCES ingresso(id) ON DELETE CASCADE,

    CONSTRAINT fk_troca_ingresso_ofertado
        FOREIGN KEY (ingresso_ofertado_id) REFERENCES ingresso(id) ON DELETE CASCADE,

    CONSTRAINT fk_troca_solicitante
        FOREIGN KEY (solicitante_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# ---------------------------------------------------------------------------
# Conferência: o resultado deve vir VAZIO. Cada linha é uma estrutura ausente.
# (Se uma tabela já existia com outro formato, CREATE TABLE IF NOT EXISTS não a altera.)
# ---------------------------------------------------------------------------

SELECT esperado.tabela, esperado.coluna AS coluna_ausente
  FROM (
    SELECT 'fornecedor_detalhes' AS tabela, 'endereco' AS coluna
    UNION ALL SELECT 'fornecedor_detalhes', 'notificacoes'
    UNION ALL SELECT 'fornecedor_detalhes', 'dois_fatores_ativo'
    UNION ALL SELECT 'ingresso', 'disponivel_troca'
    UNION ALL SELECT 'evento_fornecedor', 'evento_id'
    UNION ALL SELECT 'evento_fornecedor', 'fornecedor_id'
    UNION ALL SELECT 'evento_fornecedor', 'data_vinculo'
    UNION ALL SELECT 'evento_favorito', 'usuario_id'
    UNION ALL SELECT 'evento_favorito', 'evento_id'
    UNION ALL SELECT 'evento_favorito', 'data_favorito'
    UNION ALL SELECT 'comunidade_mensagem', 'id'
    UNION ALL SELECT 'comunidade_mensagem', 'usuario_id'
    UNION ALL SELECT 'comunidade_mensagem', 'texto'
    UNION ALL SELECT 'comunidade_mensagem', 'data_publicacao'
    UNION ALL SELECT 'troca_ingresso', 'id'
    UNION ALL SELECT 'troca_ingresso', 'ingresso_solicitado_id'
    UNION ALL SELECT 'troca_ingresso', 'ingresso_ofertado_id'
    UNION ALL SELECT 'troca_ingresso', 'solicitante_id'
    UNION ALL SELECT 'troca_ingresso', 'status'
    UNION ALL SELECT 'troca_ingresso', 'data_solicitacao'
    UNION ALL SELECT 'troca_ingresso', 'data_resposta'
  ) AS esperado
  LEFT JOIN information_schema.columns c
    ON c.table_schema = DATABASE()
   AND c.table_name = esperado.tabela
   AND c.column_name = esperado.coluna
 WHERE c.column_name IS NULL;
