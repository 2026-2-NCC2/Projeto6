# MIGRAÇÃO — revenda, fila de espera e transferência com aceite (etapa 4 da integração com a TrocaTicket 2.0)
#
# Adaptada das tabelas mvp_anuncio, mvp_fila e mvp_convite da TrocaTicket 2.0 ao banco da main:
#   - anuncio_ingresso: ingresso anunciado para revenda (preço em centavos, até o valor que o dono pagou);
#   - pedido.anuncio_id: a compra de um anúncio usa o mesmo pedido/pagamento simulado da etapa 3;
#   - fila_repasse: fila de espera por evento e tipo de ingresso; quem chega primeiro recebe a reserva;
#   - convite_ingresso: transferência gratuita; o dono só muda quando a outra conta aceita.
# Nenhum dinheiro real é movimentado.
#
# Ordem: SCRIPT_BANCO_V2.sql -> MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql -> MIGRACAO_SESSAO_LOGIN.sql
#        -> MIGRACAO_PEDIDOS_PAGAMENTOS.sql -> este arquivo.
# Pode ser executada mais de uma vez e não apaga dados. Compatível com MySQL 8 e MariaDB 10.5+.
# Se o seu banco tiver outro nome, ajuste o USE.

USE trocaticket;

CREATE TABLE IF NOT EXISTS anuncio_ingresso(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    ingresso_id INT NOT NULL,
    vendedor_id INT NOT NULL,
    preco_centavos BIGINT NOT NULL,
    status ENUM('active', 'reserved', 'sold', 'cancelled') NOT NULL DEFAULT 'active',

    INDEX idx_anuncio_ingresso (ingresso_id, status),
    INDEX idx_anuncio_vendedor (vendedor_id, status),

    CONSTRAINT chk_anuncio_preco
        CHECK (preco_centavos > 0),

    CONSTRAINT fk_anuncio_ingresso
        FOREIGN KEY (ingresso_id) REFERENCES ingresso(id) ON DELETE CASCADE,

    CONSTRAINT fk_anuncio_vendedor
        FOREIGN KEY (vendedor_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# A reserva de um anúncio é um pedido (status, prazo e pagamento da etapa 3) ligado ao anúncio.
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'pedido'
      AND column_name = 'anuncio_id') = 0,
  'ALTER TABLE pedido ADD COLUMN anuncio_id INT NULL, ADD CONSTRAINT fk_pedido_anuncio FOREIGN KEY (anuncio_id) REFERENCES anuncio_ingresso(id) ON DELETE SET NULL',
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

CREATE TABLE IF NOT EXISTS fila_repasse(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo_ingresso VARCHAR(50) NOT NULL,
    pedido_id INT NULL UNIQUE,
    status ENUM('queued', 'reserved', 'completed', 'left', 'expired') NOT NULL DEFAULT 'queued',

    INDEX idx_fila_vez (evento_id, tipo_ingresso, status, id),
    INDEX idx_fila_usuario (usuario_id, status),

    CONSTRAINT chk_fila_tipo
        CHECK (tipo_ingresso IN ('Inteira', 'Meia-entrada')),

    CONSTRAINT fk_fila_evento
        FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

    CONSTRAINT fk_fila_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

    CONSTRAINT fk_fila_pedido
        FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE SET NULL
);

# Bancos que aplicaram a primeira versão deste arquivo: a fila ganha a situação "expired"
# (a reserva venceu e a vez passou para o próximo).
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'fila_repasse'
      AND column_name = 'status' AND column_type LIKE '%expired%') = 0,
  "ALTER TABLE fila_repasse MODIFY status ENUM('queued', 'reserved', 'completed', 'left', 'expired') NOT NULL DEFAULT 'queued'",
  'DO 0');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

# Sem CHECK entre remetente e destinatário: o MySQL 8 não aceita CHECK em coluna com ação de
# chave estrangeira. A API recusa convite para a própria conta.
CREATE TABLE IF NOT EXISTS convite_ingresso(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    ingresso_id INT NOT NULL,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    expira_em DATETIME NOT NULL,

    INDEX idx_convite_ingresso (ingresso_id, status),
    INDEX idx_convite_destinatario (destinatario_id, status),
    INDEX idx_convite_remetente (remetente_id, status),

    CONSTRAINT fk_convite_ingresso
        FOREIGN KEY (ingresso_id) REFERENCES ingresso(id) ON DELETE CASCADE,

    CONSTRAINT fk_convite_remetente
        FOREIGN KEY (remetente_id) REFERENCES usuario(id) ON DELETE CASCADE,

    CONSTRAINT fk_convite_destinatario
        FOREIGN KEY (destinatario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Conferência: deve voltar vazia.
SELECT estruturas.tabela, estruturas.coluna
  FROM (SELECT 'anuncio_ingresso' AS tabela, 'preco_centavos' AS coluna
        UNION ALL SELECT 'pedido', 'anuncio_id'
        UNION ALL SELECT 'fila_repasse', 'pedido_id'
        UNION ALL SELECT 'fila_repasse', 'status'
        UNION ALL SELECT 'convite_ingresso', 'expira_em') estruturas
  LEFT JOIN information_schema.columns c
    ON c.table_schema = DATABASE() AND c.table_name = estruturas.tabela
   AND c.column_name = estruturas.coluna
   AND (estruturas.coluna <> 'status' OR c.column_type LIKE '%expired%')
 WHERE c.column_name IS NULL;
