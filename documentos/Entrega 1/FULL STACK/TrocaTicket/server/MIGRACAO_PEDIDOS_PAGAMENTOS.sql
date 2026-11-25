# MIGRAÇÃO — pedidos, pagamento simulado e estornos (etapa 3 da integração com a TrocaTicket 2.0)
#
# Adaptada das tabelas mvp_pedido, mvp_estorno e mvp_idempotencia da TrocaTicket 2.0 ao banco da main:
#   - pedido: reserva de ingressos com prazo, pagamento simulado e situação do pedido;
#   - ingresso.pedido_id: liga cada ingresso emitido ao pedido que o gerou;
#   - estorno: devolução simulada, um registro por ingresso devolvido;
#   - pedido_idempotencia: evita pedido ou pagamento em dobro quando a mesma ação é repetida.
# Nenhum dinheiro real é movimentado e nenhum dado de pagamento é guardado.
#
# Ordem: SCRIPT_BANCO_V2.sql -> MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql -> MIGRACAO_SESSAO_LOGIN.sql -> este arquivo.
# Pode ser executada mais de uma vez e não apaga dados. Compatível com MySQL 8 e MariaDB 10.5+.
# Se o seu banco tiver outro nome, ajuste o USE.

USE trocaticket;

CREATE TABLE IF NOT EXISTS pedido(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    evento_id INT NOT NULL,
    tipo_ingresso VARCHAR(50) NOT NULL,
    quantidade INT NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'reservado',
    forma_pagamento VARCHAR(20) NULL,
    motivo VARCHAR(255) NULL,
    criado_em DATETIME NOT NULL,
    expira_em DATETIME NOT NULL,
    pago_em DATETIME NULL,
    atualizado_em DATETIME NOT NULL,

    INDEX idx_pedido_usuario (usuario_id, status),
    INDEX idx_pedido_evento (evento_id, status),

    CONSTRAINT chk_pedido_tipo
        CHECK (tipo_ingresso IN ('Inteira', 'Meia-entrada')),

    CONSTRAINT chk_pedido_quantidade
        CHECK (quantidade BETWEEN 1 AND 6),

    CONSTRAINT chk_pedido_valores
        CHECK (valor_unitario >= 0 AND valor_total >= 0),

    CONSTRAINT chk_pedido_status
        CHECK (status IN ('reservado', 'pago', 'cancelado', 'expirado', 'recusado', 'estornado', 'estornado_parcial')),

    CONSTRAINT chk_pedido_forma
        CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('pix', 'cartao', 'gratuito', 'direto')),

    CONSTRAINT fk_pedido_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

    CONSTRAINT fk_pedido_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE
);

# Cada ingresso emitido aponta para o pedido de origem (NULL nos ingressos antigos).
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'ingresso'
      AND column_name = 'pedido_id') = 0,
  'ALTER TABLE ingresso ADD COLUMN pedido_id INT NULL, ADD CONSTRAINT fk_ingresso_pedido FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE SET NULL',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

CREATE TABLE IF NOT EXISTS estorno(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    ingresso_id INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    criado_em DATETIME NOT NULL,

    UNIQUE KEY uq_estorno_ingresso (ingresso_id),

    CONSTRAINT chk_estorno_valor
        CHECK (valor >= 0),

    CONSTRAINT fk_estorno_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE CASCADE,

    CONSTRAINT fk_estorno_ingresso
        FOREIGN KEY (ingresso_id) REFERENCES ingresso(id) ON DELETE CASCADE
);

# Uma chave por ação do site: repetir a mesma ação devolve a mesma resposta.
CREATE TABLE IF NOT EXISTS pedido_idempotencia(
    usuario_id INT NOT NULL,
    chave VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    operacao VARCHAR(40) NOT NULL,
    hash_conteudo CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    status_http INT NULL,
    resposta_json LONGTEXT NULL,
    criado_em DATETIME NOT NULL,

    PRIMARY KEY (usuario_id, chave),

    CONSTRAINT fk_idempotencia_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Conferência: o resultado deve vir VAZIO. Cada linha é uma estrutura ausente.
SELECT esperado.tabela, esperado.coluna AS coluna_ausente
  FROM (
    SELECT 'pedido' AS tabela, 'id' AS coluna
    UNION ALL SELECT 'pedido', 'usuario_id'
    UNION ALL SELECT 'pedido', 'evento_id'
    UNION ALL SELECT 'pedido', 'tipo_ingresso'
    UNION ALL SELECT 'pedido', 'quantidade'
    UNION ALL SELECT 'pedido', 'valor_unitario'
    UNION ALL SELECT 'pedido', 'valor_total'
    UNION ALL SELECT 'pedido', 'status'
    UNION ALL SELECT 'pedido', 'forma_pagamento'
    UNION ALL SELECT 'pedido', 'motivo'
    UNION ALL SELECT 'pedido', 'criado_em'
    UNION ALL SELECT 'pedido', 'expira_em'
    UNION ALL SELECT 'pedido', 'pago_em'
    UNION ALL SELECT 'pedido', 'atualizado_em'
    UNION ALL SELECT 'ingresso', 'pedido_id'
    UNION ALL SELECT 'estorno', 'pedido_id'
    UNION ALL SELECT 'estorno', 'ingresso_id'
    UNION ALL SELECT 'estorno', 'valor'
    UNION ALL SELECT 'estorno', 'motivo'
    UNION ALL SELECT 'estorno', 'criado_em'
    UNION ALL SELECT 'pedido_idempotencia', 'usuario_id'
    UNION ALL SELECT 'pedido_idempotencia', 'chave'
    UNION ALL SELECT 'pedido_idempotencia', 'operacao'
    UNION ALL SELECT 'pedido_idempotencia', 'hash_conteudo'
    UNION ALL SELECT 'pedido_idempotencia', 'status_http'
    UNION ALL SELECT 'pedido_idempotencia', 'resposta_json'
    UNION ALL SELECT 'pedido_idempotencia', 'criado_em'
  ) AS esperado
  LEFT JOIN information_schema.columns c
    ON c.table_schema = DATABASE()
   AND c.table_name = esperado.tabela
   AND c.column_name = esperado.coluna
 WHERE c.column_name IS NULL;
