-- Novos conceitos separados do M1. DDL MySQL pode confirmar implicitamente.
CREATE TABLE sessao (
 id_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 usuario_id INT NOT NULL, csrf_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 expira_em DATETIME(3) NOT NULL, revogada_em DATETIME(3), criada_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 FOREIGN KEY(usuario_id) REFERENCES usuario(id), INDEX(usuario_id), INDEX(expira_em)
) ENGINE=InnoDB;
CREATE TABLE mvp_seed (chave VARCHAR(80) PRIMARY KEY, criado_em DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3))) ENGINE=InnoDB;
CREATE TABLE mvp_evento (
 evento_id INT PRIMARY KEY, status VARCHAR(16) NOT NULL DEFAULT 'draft', description TEXT NOT NULL,
 category VARCHAR(80) NOT NULL DEFAULT 'Cultural', ends_at DATETIME(3),
 FOREIGN KEY(evento_id) REFERENCES evento(id), CHECK(status IN ('draft','published','closed','cancelled'))
) ENGINE=InnoDB;
CREATE TABLE mvp_categoria (
 id INT AUTO_INCREMENT PRIMARY KEY, event_id INT NOT NULL, name VARCHAR(100) NOT NULL,
 kind VARCHAR(8) NOT NULL DEFAULT 'full', price_cents INT NOT NULL, stock INT NOT NULL,
 sales_open BOOLEAN NOT NULL DEFAULT TRUE,
 FOREIGN KEY(event_id) REFERENCES evento(id), CHECK(kind IN ('full','half')),
 CHECK(price_cents>=0), CHECK(stock>=0), CHECK(sales_open IN (0,1)), INDEX(event_id)
) ENGINE=InnoDB;
CREATE TABLE mvp_config (
 id TINYINT PRIMARY KEY, payment_scenario VARCHAR(16) NOT NULL DEFAULT 'approved',
 issuer_scenario VARCHAR(24) NOT NULL DEFAULT 'success', reservation_minutes INT NOT NULL DEFAULT 10,
 invitation_minutes INT NOT NULL DEFAULT 10, account_limit INT NOT NULL DEFAULT 4,
 CHECK(id=1), CHECK(payment_scenario IN ('approved','rejected','unavailable')),
 CHECK(issuer_scenario IN ('success','temporary_failure')),
 CHECK(reservation_minutes BETWEEN 1 AND 60), CHECK(invitation_minutes BETWEEN 1 AND 60), CHECK(account_limit BETWEEN 1 AND 20)
) ENGINE=InnoDB;
INSERT INTO mvp_config(id) VALUES(1);
CREATE TABLE mvp_pedido (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_id INT NOT NULL, category_id INT NOT NULL,
 kind VARCHAR(8) NOT NULL, quantity INT NOT NULL, amount_cents INT NOT NULL,
 payment_state VARCHAR(16) NOT NULL DEFAULT 'pending', delivery_state VARCHAR(16) NOT NULL DEFAULT 'reserved',
 listing_id INT, ticket_id INT, expires_at DATETIME(3) NOT NULL,
 active_ticket INT GENERATED ALWAYS AS (CASE WHEN kind='resale' AND delivery_state IN ('reserved','pending') THEN ticket_id ELSE NULL END) STORED,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)), updated_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 FOREIGN KEY(user_id) REFERENCES usuario(id), FOREIGN KEY(event_id) REFERENCES evento(id), FOREIGN KEY(category_id) REFERENCES mvp_categoria(id),
 CHECK(kind IN ('primary','resale')), CHECK(quantity BETWEEN 1 AND 20), CHECK(amount_cents>=0),
 CHECK((kind='primary' AND listing_id IS NULL AND ticket_id IS NULL) OR (kind='resale' AND quantity=1 AND listing_id IS NOT NULL AND ticket_id IS NOT NULL)),
 CHECK(payment_state IN ('pending','approved','rejected','unavailable','refunded')),
 CHECK(delivery_state IN ('reserved','pending','delivered','cancelled','refunded','expired')),
 UNIQUE(active_ticket), INDEX(event_id,delivery_state), INDEX(user_id), INDEX(expires_at,delivery_state)
) ENGINE=InnoDB;
CREATE TABLE mvp_unidade (
 ticket_id INT PRIMARY KEY, category_id INT NOT NULL, original_cents INT NOT NULL, cost_cents INT NOT NULL,
 state VARCHAR(12) NOT NULL DEFAULT 'valid', credential CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 FOREIGN KEY(ticket_id) REFERENCES ingresso(id), FOREIGN KEY(category_id) REFERENCES mvp_categoria(id),
 CHECK(original_cents>=0), CHECK(cost_cents>=0), CHECK(cost_cents<=original_cents), CHECK(state IN ('valid','used','cancelled'))
) ENGINE=InnoDB;
CREATE TABLE mvp_anuncio (
 id INT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, seller_id INT NOT NULL, price_cents INT NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'active', created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 active_ticket INT GENERATED ALWAYS AS (CASE WHEN status IN ('active','reserved') THEN ticket_id ELSE NULL END) STORED,
 UNIQUE(active_ticket), FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id), FOREIGN KEY(seller_id) REFERENCES usuario(id),
 CHECK(price_cents>0), CHECK(status IN ('active','reserved','sold','cancelled')), INDEX(ticket_id)
) ENGINE=InnoDB;
ALTER TABLE mvp_pedido ADD FOREIGN KEY(listing_id) REFERENCES mvp_anuncio(id), ADD FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id);
CREATE TABLE mvp_pedido_unidade (
 order_id INT NOT NULL, ticket_id INT NOT NULL, PRIMARY KEY(order_id,ticket_id),
 FOREIGN KEY(order_id) REFERENCES mvp_pedido(id), FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id)
) ENGINE=InnoDB;
CREATE TABLE mvp_fila (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, event_id INT NOT NULL, category_id INT NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'queued', order_id INT, half_declared BOOLEAN NOT NULL DEFAULT FALSE,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 active_user INT GENERATED ALWAYS AS (CASE WHEN status IN ('queued','reserved') THEN user_id ELSE NULL END) STORED,
 UNIQUE(event_id,category_id,active_user), FOREIGN KEY(user_id) REFERENCES usuario(id), FOREIGN KEY(event_id) REFERENCES evento(id),
 FOREIGN KEY(category_id) REFERENCES mvp_categoria(id), FOREIGN KEY(order_id) REFERENCES mvp_pedido(id),
 CHECK(status IN ('queued','reserved','completed','left','expired')), CHECK(half_declared IN (0,1)), INDEX(event_id,category_id,created_at,id)
) ENGINE=InnoDB;
CREATE TABLE mvp_convite (
 id INT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, from_user_id INT NOT NULL, to_user_id INT NOT NULL,
 status VARCHAR(12) NOT NULL DEFAULT 'pending', expires_at DATETIME(3) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 active_ticket INT GENERATED ALWAYS AS (CASE WHEN status='pending' THEN ticket_id ELSE NULL END) STORED,
 UNIQUE(active_ticket), FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id), FOREIGN KEY(from_user_id) REFERENCES usuario(id),
 FOREIGN KEY(to_user_id) REFERENCES usuario(id), CHECK(from_user_id<>to_user_id),
 CHECK(status IN ('pending','accepted','rejected','cancelled','expired')), INDEX(to_user_id,status), INDEX(expires_at,status)
) ENGINE=InnoDB;
CREATE TABLE mvp_historico (
 id INT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL, kind VARCHAR(16) NOT NULL,
 from_user_id INT, to_user_id INT NOT NULL, amount_cents INT NOT NULL, order_id INT,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id), FOREIGN KEY(from_user_id) REFERENCES usuario(id),
 FOREIGN KEY(to_user_id) REFERENCES usuario(id), FOREIGN KEY(order_id) REFERENCES mvp_pedido(id),
 CHECK(kind IN ('issued','resold','gifted','cancelled','entered')), CHECK(amount_cents>=0), INDEX(ticket_id), INDEX(to_user_id)
) ENGINE=InnoDB;
CREATE TABLE mvp_credencial_revogada (
 token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY, ticket_id INT NOT NULL,
 revoked_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)), FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id)
) ENGINE=InnoDB;
CREATE TABLE mvp_entrada (
 ticket_id INT PRIMARY KEY, operator_id INT NOT NULL, entered_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 FOREIGN KEY(ticket_id) REFERENCES mvp_unidade(ticket_id), FOREIGN KEY(operator_id) REFERENCES usuario(id)
) ENGINE=InnoDB;
CREATE TABLE mvp_estorno (
 order_id INT PRIMARY KEY, amount_cents INT NOT NULL, reason VARCHAR(500) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)), FOREIGN KEY(order_id) REFERENCES mvp_pedido(id), CHECK(amount_cents>=0)
) ENGINE=InnoDB;
CREATE TABLE mvp_idempotencia (
 user_id INT NOT NULL, request_key VARCHAR(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, response_json JSON,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)), PRIMARY KEY(user_id,request_key), FOREIGN KEY(user_id) REFERENCES usuario(id)
) ENGINE=InnoDB;
CREATE TABLE mvp_atendimento (
 id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, order_id INT, listing_id INT, subject VARCHAR(150) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'open', created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)),
 FOREIGN KEY(user_id) REFERENCES usuario(id), FOREIGN KEY(order_id) REFERENCES mvp_pedido(id), FOREIGN KEY(listing_id) REFERENCES mvp_anuncio(id),
 CHECK(status IN ('open','reviewing','closed')), CHECK(order_id IS NOT NULL OR listing_id IS NOT NULL)
) ENGINE=InnoDB;
CREATE TABLE mvp_atendimento_mensagem (
 id INT AUTO_INCREMENT PRIMARY KEY, support_id INT NOT NULL, user_id INT NOT NULL, message VARCHAR(2000) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT (UTC_TIMESTAMP(3)), FOREIGN KEY(support_id) REFERENCES mvp_atendimento(id), FOREIGN KEY(user_id) REFERENCES usuario(id)
) ENGINE=InnoDB;
