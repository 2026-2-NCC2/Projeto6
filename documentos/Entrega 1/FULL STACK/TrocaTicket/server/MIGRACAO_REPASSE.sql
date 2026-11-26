# Etapa 4. Aplicar após MIGRACAO_PEDIDOS_PAGAMENTOS.sql.
USE trocaticket;
CREATE TABLE IF NOT EXISTS anuncio_ingresso (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ingresso_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  preco_centavos BIGINT NOT NULL CHECK (preco_centavos > 0),
  status ENUM('active','reserved','sold','cancelled') NOT NULL DEFAULT 'active',
  INDEX (ingresso_id, status),
  FOREIGN KEY (ingresso_id) REFERENCES ingresso(id),
  FOREIGN KEY (vendedor_id) REFERENCES usuario(id)
);

SET @sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
  AND table_name='pedido' AND column_name='anuncio_id'), 'DO 0',
  'ALTER TABLE pedido ADD COLUMN anuncio_id INT NULL, ADD FOREIGN KEY (anuncio_id) REFERENCES anuncio_ingresso(id)');
PREPARE etapa FROM @sql; EXECUTE etapa; DEALLOCATE PREPARE etapa;

CREATE TABLE IF NOT EXISTS fila_repasse (
  id INT PRIMARY KEY AUTO_INCREMENT,
  evento_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tipo_ingresso VARCHAR(50) NOT NULL,
  pedido_id INT NULL UNIQUE,
  status ENUM('queued','reserved','completed','left') NOT NULL DEFAULT 'queued',
  INDEX (evento_id, tipo_ingresso, status, id),
  FOREIGN KEY (evento_id) REFERENCES evento(id),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  FOREIGN KEY (pedido_id) REFERENCES pedido(id)
);
CREATE TABLE IF NOT EXISTS convite_ingresso (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ingresso_id INT NOT NULL,
  remetente_id INT NOT NULL,
  destinatario_id INT NOT NULL,
  status ENUM('pending','accepted','rejected','cancelled','expired') NOT NULL DEFAULT 'pending',
  expira_em DATETIME NOT NULL,
  INDEX (ingresso_id, status),
  FOREIGN KEY (ingresso_id) REFERENCES ingresso(id),
  FOREIGN KEY (remetente_id) REFERENCES usuario(id),
  FOREIGN KEY (destinatario_id) REFERENCES usuario(id)
);
SELECT estruturas.tabela, estruturas.coluna
FROM (SELECT 'anuncio_ingresso' tabela, 'preco_centavos' coluna UNION ALL SELECT 'pedido','anuncio_id'
      UNION ALL SELECT 'fila_repasse','pedido_id' UNION ALL SELECT 'convite_ingresso','expira_em') estruturas
LEFT JOIN information_schema.columns c ON c.table_schema=DATABASE() AND c.table_name=estruturas.tabela
    AND c.column_name=estruturas.coluna WHERE c.column_name IS NULL;
