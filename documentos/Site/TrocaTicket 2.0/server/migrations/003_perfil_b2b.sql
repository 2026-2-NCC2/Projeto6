-- Extensões próprias do MVP; o baseline M1 fica intacto.
CREATE TABLE mvp_perfil (
  usuario_id INT NOT NULL PRIMARY KEY,
  phone VARCHAR(20) NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  CONSTRAINT FK_mvp_perfil_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE mvp_produto (
  produto_id INT NOT NULL PRIMARY KEY,
  price_cents INT NOT NULL,
  stock INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT 1,
  CONSTRAINT FK_mvp_produto FOREIGN KEY (produto_id) REFERENCES produto_servico(id),
  CONSTRAINT CK_mvp_produto_preco CHECK (price_cents>=0),
  CONSTRAINT CK_mvp_produto_estoque CHECK (stock>=0),
  CONSTRAINT CK_mvp_produto_ativo CHECK (active IN (0,1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE mvp_proposta (
  oferta_id INT NOT NULL PRIMARY KEY,
  quantity INT NOT NULL,
  unit_cents INT NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  CONSTRAINT FK_mvp_proposta FOREIGN KEY (oferta_id) REFERENCES oferta(id),
  CONSTRAINT CK_mvp_proposta_quantidade CHECK (quantity>0),
  CONSTRAINT CK_mvp_proposta_valor CHECK (unit_cents>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
