-- Baseline M1 fiel: aplicado somente pelo runner na base nova do MVP.
-- Os CHECKs de CNPJ usam somente funcoes nativas. Os pesos seguem modulo 11.
-- Nao ha funcao armazenada dentro de CHECK nem consulta a cadastro de documentos.
-- 1) Usuarios
CREATE TABLE usuario (
    id INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    url_foto_perfil VARCHAR(500) NULL,
    status_aprovacao CHAR(1) COLLATE utf8mb4_bin NOT NULL DEFAULT ('P'),
    tipo_perfil TINYINT NOT NULL,
    CONSTRAINT PK_usuario PRIMARY KEY (id),
    CONSTRAINT UQ_usuario_email UNIQUE (email),
    CONSTRAINT CK_usuario_status CHECK (status_aprovacao IN ('P','A','R')),
    CONSTRAINT CK_usuario_tipo CHECK (tipo_perfil IN (1,2,3)),
    CONSTRAINT CK_usuario_nome_preenchido CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(nome, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    CONSTRAINT CK_usuario_email_preenchido CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(email, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    CONSTRAINT CK_usuario_hash_preenchido CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(senha_hash, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 2) Detalhes de administrador: existir nesta tabela identifica um administrador.
CREATE TABLE administrador_detalhes (
    usuario_id INT NOT NULL,
    CONSTRAINT PK_administrador_detalhes PRIMARY KEY (usuario_id),
    CONSTRAINT FK_admin_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 3) Detalhes de organizador
CREATE TABLE organizador_detalhes (
    usuario_id INT NOT NULL,
    telefone VARCHAR(11) COLLATE utf8mb4_bin NULL,
    cpf VARCHAR(11) COLLATE utf8mb4_bin NULL,
    cnpj VARCHAR(14) COLLATE utf8mb4_bin NULL,
    CONSTRAINT PK_organizador_detalhes PRIMARY KEY (usuario_id),
    CONSTRAINT FK_organizador_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    CONSTRAINT CK_organizador_documento_exclusivo CHECK (cpf IS NULL OR cnpj IS NULL),
    CONSTRAINT CK_organizador_cpf CHECK (cpf IS NULL OR (OCTET_LENGTH(cpf) = 11 AND cpf REGEXP '^[0-9]{11}$')),
    CONSTRAINT CK_organizador_cnpj CHECK (cnpj IS NULL OR (OCTET_LENGTH(cnpj)=14 AND cnpj REGEXP '^[A-Z0-9]{12}[0-9]{2}$'
        AND ASCII(SUBSTRING(cnpj,13,1))-48 = (CASE WHEN MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*5 + (ASCII(SUBSTRING(cnpj,2,1))-48)*4 + (ASCII(SUBSTRING(cnpj,3,1))-48)*3 + (ASCII(SUBSTRING(cnpj,4,1))-48)*2 + (ASCII(SUBSTRING(cnpj,5,1))-48)*9 + (ASCII(SUBSTRING(cnpj,6,1))-48)*8 + (ASCII(SUBSTRING(cnpj,7,1))-48)*7 + (ASCII(SUBSTRING(cnpj,8,1))-48)*6 + (ASCII(SUBSTRING(cnpj,9,1))-48)*5 + (ASCII(SUBSTRING(cnpj,10,1))-48)*4 + (ASCII(SUBSTRING(cnpj,11,1))-48)*3 + (ASCII(SUBSTRING(cnpj,12,1))-48)*2,11)<2 THEN 0 ELSE 11-MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*5 + (ASCII(SUBSTRING(cnpj,2,1))-48)*4 + (ASCII(SUBSTRING(cnpj,3,1))-48)*3 + (ASCII(SUBSTRING(cnpj,4,1))-48)*2 + (ASCII(SUBSTRING(cnpj,5,1))-48)*9 + (ASCII(SUBSTRING(cnpj,6,1))-48)*8 + (ASCII(SUBSTRING(cnpj,7,1))-48)*7 + (ASCII(SUBSTRING(cnpj,8,1))-48)*6 + (ASCII(SUBSTRING(cnpj,9,1))-48)*5 + (ASCII(SUBSTRING(cnpj,10,1))-48)*4 + (ASCII(SUBSTRING(cnpj,11,1))-48)*3 + (ASCII(SUBSTRING(cnpj,12,1))-48)*2,11) END)
        AND ASCII(SUBSTRING(cnpj,14,1))-48 = (CASE WHEN MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*6 + (ASCII(SUBSTRING(cnpj,2,1))-48)*5 + (ASCII(SUBSTRING(cnpj,3,1))-48)*4 + (ASCII(SUBSTRING(cnpj,4,1))-48)*3 + (ASCII(SUBSTRING(cnpj,5,1))-48)*2 + (ASCII(SUBSTRING(cnpj,6,1))-48)*9 + (ASCII(SUBSTRING(cnpj,7,1))-48)*8 + (ASCII(SUBSTRING(cnpj,8,1))-48)*7 + (ASCII(SUBSTRING(cnpj,9,1))-48)*6 + (ASCII(SUBSTRING(cnpj,10,1))-48)*5 + (ASCII(SUBSTRING(cnpj,11,1))-48)*4 + (ASCII(SUBSTRING(cnpj,12,1))-48)*3 + (ASCII(SUBSTRING(cnpj,13,1))-48)*2,11)<2 THEN 0 ELSE 11-MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*6 + (ASCII(SUBSTRING(cnpj,2,1))-48)*5 + (ASCII(SUBSTRING(cnpj,3,1))-48)*4 + (ASCII(SUBSTRING(cnpj,4,1))-48)*3 + (ASCII(SUBSTRING(cnpj,5,1))-48)*2 + (ASCII(SUBSTRING(cnpj,6,1))-48)*9 + (ASCII(SUBSTRING(cnpj,7,1))-48)*8 + (ASCII(SUBSTRING(cnpj,8,1))-48)*7 + (ASCII(SUBSTRING(cnpj,9,1))-48)*6 + (ASCII(SUBSTRING(cnpj,10,1))-48)*5 + (ASCII(SUBSTRING(cnpj,11,1))-48)*4 + (ASCII(SUBSTRING(cnpj,12,1))-48)*3 + (ASCII(SUBSTRING(cnpj,13,1))-48)*2,11) END))),
    CONSTRAINT CK_organizador_telefone CHECK (telefone IS NULL OR (OCTET_LENGTH(telefone) IN (10,11) AND telefone REGEXP '^[0-9]{10,11}$')),
    UNIQUE KEY UX_organizador_cpf (cpf),
    UNIQUE KEY UX_organizador_cnpj (cnpj)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 4) Detalhes de fornecedor
CREATE TABLE fornecedor_detalhes (
    usuario_id INT NOT NULL,
    descricao_servicos VARCHAR(500) NULL,
    cpf VARCHAR(11) COLLATE utf8mb4_bin NULL,
    cnpj VARCHAR(14) COLLATE utf8mb4_bin NULL,
    CONSTRAINT PK_fornecedor_detalhes PRIMARY KEY (usuario_id),
    CONSTRAINT FK_fornecedor_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    CONSTRAINT CK_fornecedor_documento_exclusivo CHECK (cpf IS NULL OR cnpj IS NULL),
    CONSTRAINT CK_fornecedor_cpf CHECK (cpf IS NULL OR (OCTET_LENGTH(cpf) = 11 AND cpf REGEXP '^[0-9]{11}$')),
    CONSTRAINT CK_fornecedor_cnpj CHECK (cnpj IS NULL OR (OCTET_LENGTH(cnpj)=14 AND cnpj REGEXP '^[A-Z0-9]{12}[0-9]{2}$'
        AND ASCII(SUBSTRING(cnpj,13,1))-48 = (CASE WHEN MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*5 + (ASCII(SUBSTRING(cnpj,2,1))-48)*4 + (ASCII(SUBSTRING(cnpj,3,1))-48)*3 + (ASCII(SUBSTRING(cnpj,4,1))-48)*2 + (ASCII(SUBSTRING(cnpj,5,1))-48)*9 + (ASCII(SUBSTRING(cnpj,6,1))-48)*8 + (ASCII(SUBSTRING(cnpj,7,1))-48)*7 + (ASCII(SUBSTRING(cnpj,8,1))-48)*6 + (ASCII(SUBSTRING(cnpj,9,1))-48)*5 + (ASCII(SUBSTRING(cnpj,10,1))-48)*4 + (ASCII(SUBSTRING(cnpj,11,1))-48)*3 + (ASCII(SUBSTRING(cnpj,12,1))-48)*2,11)<2 THEN 0 ELSE 11-MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*5 + (ASCII(SUBSTRING(cnpj,2,1))-48)*4 + (ASCII(SUBSTRING(cnpj,3,1))-48)*3 + (ASCII(SUBSTRING(cnpj,4,1))-48)*2 + (ASCII(SUBSTRING(cnpj,5,1))-48)*9 + (ASCII(SUBSTRING(cnpj,6,1))-48)*8 + (ASCII(SUBSTRING(cnpj,7,1))-48)*7 + (ASCII(SUBSTRING(cnpj,8,1))-48)*6 + (ASCII(SUBSTRING(cnpj,9,1))-48)*5 + (ASCII(SUBSTRING(cnpj,10,1))-48)*4 + (ASCII(SUBSTRING(cnpj,11,1))-48)*3 + (ASCII(SUBSTRING(cnpj,12,1))-48)*2,11) END)
        AND ASCII(SUBSTRING(cnpj,14,1))-48 = (CASE WHEN MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*6 + (ASCII(SUBSTRING(cnpj,2,1))-48)*5 + (ASCII(SUBSTRING(cnpj,3,1))-48)*4 + (ASCII(SUBSTRING(cnpj,4,1))-48)*3 + (ASCII(SUBSTRING(cnpj,5,1))-48)*2 + (ASCII(SUBSTRING(cnpj,6,1))-48)*9 + (ASCII(SUBSTRING(cnpj,7,1))-48)*8 + (ASCII(SUBSTRING(cnpj,8,1))-48)*7 + (ASCII(SUBSTRING(cnpj,9,1))-48)*6 + (ASCII(SUBSTRING(cnpj,10,1))-48)*5 + (ASCII(SUBSTRING(cnpj,11,1))-48)*4 + (ASCII(SUBSTRING(cnpj,12,1))-48)*3 + (ASCII(SUBSTRING(cnpj,13,1))-48)*2,11)<2 THEN 0 ELSE 11-MOD((ASCII(SUBSTRING(cnpj,1,1))-48)*6 + (ASCII(SUBSTRING(cnpj,2,1))-48)*5 + (ASCII(SUBSTRING(cnpj,3,1))-48)*4 + (ASCII(SUBSTRING(cnpj,4,1))-48)*3 + (ASCII(SUBSTRING(cnpj,5,1))-48)*2 + (ASCII(SUBSTRING(cnpj,6,1))-48)*9 + (ASCII(SUBSTRING(cnpj,7,1))-48)*8 + (ASCII(SUBSTRING(cnpj,8,1))-48)*7 + (ASCII(SUBSTRING(cnpj,9,1))-48)*6 + (ASCII(SUBSTRING(cnpj,10,1))-48)*5 + (ASCII(SUBSTRING(cnpj,11,1))-48)*4 + (ASCII(SUBSTRING(cnpj,12,1))-48)*3 + (ASCII(SUBSTRING(cnpj,13,1))-48)*2,11) END))),
    UNIQUE KEY UX_fornecedor_cpf (cpf),
    UNIQUE KEY UX_fornecedor_cnpj (cnpj)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 5) Eventos: cada evento tem um organizador responsavel.
CREATE TABLE evento (
    id INT NOT NULL AUTO_INCREMENT,
    organizador_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    publico_min INT NOT NULL DEFAULT (1),
    publico_max INT NULL,
    margem_lucro DECIMAL(5,2) NULL,
    is_impulsionado BOOLEAN NOT NULL DEFAULT (FALSE),
    data_hora DATETIME NOT NULL,
    `local` VARCHAR(255) NOT NULL,
    CONSTRAINT PK_evento PRIMARY KEY (id),
    CONSTRAINT FK_evento_organizador FOREIGN KEY (organizador_id) REFERENCES organizador_detalhes(usuario_id),
    CONSTRAINT CK_evento_impulsionado CHECK (is_impulsionado IN (0,1)),
    CONSTRAINT CK_evento_publico_min CHECK (publico_min >= 1),
    CONSTRAINT CK_evento_publico_max CHECK (publico_max IS NULL OR publico_max >= publico_min),
    CONSTRAINT CK_evento_margem CHECK (margem_lucro IS NULL OR margem_lucro BETWEEN 0 AND 100),
    CONSTRAINT CK_evento_titulo_preenchido CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(titulo, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    CONSTRAINT CK_evento_local_preenchido CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(`local`, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    KEY IX_evento_organizador (organizador_id),
    KEY IX_evento_data_hora (data_hora)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 6) Produtos/servicos cadastrados por fornecedores
CREATE TABLE produto_servico (
    id INT NOT NULL AUTO_INCREMENT,
    fornecedor_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao VARCHAR(500) NOT NULL,
    tipo CHAR(1) COLLATE utf8mb4_bin NOT NULL,
    CONSTRAINT PK_produto_servico PRIMARY KEY (id),
    CONSTRAINT UQ_produto_servico_fornecedor UNIQUE (id, fornecedor_id),
    CONSTRAINT FK_produto_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor_detalhes(usuario_id),
    CONSTRAINT CK_produto_tipo CHECK (tipo IN ('P','S')),
    CONSTRAINT CK_produto_nome_preenchido CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(nome, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    CONSTRAINT CK_produto_descricao_preenchida CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(descricao, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    KEY IX_produto_fornecedor (fornecedor_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 7) Ofertas: o par (produto_servico_id, fornecedor_id) impede ofertar
--    um item cadastrado por outro fornecedor.
CREATE TABLE oferta (
    id INT NOT NULL AUTO_INCREMENT,
    status CHAR(1) COLLATE utf8mb4_bin NOT NULL DEFAULT ('P'),
    valor DECIMAL(10,2) NOT NULL,
    evento_id INT NOT NULL,
    produto_servico_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
    CONSTRAINT PK_oferta PRIMARY KEY (id),
    CONSTRAINT CK_oferta_valor CHECK (valor >= 0),
    CONSTRAINT CK_oferta_status CHECK (status IN ('P','A','R','C')),
    CONSTRAINT FK_oferta_evento FOREIGN KEY (evento_id) REFERENCES evento(id),
    CONSTRAINT FK_oferta_produto_fornecedor FOREIGN KEY (produto_servico_id, fornecedor_id)
        REFERENCES produto_servico(id, fornecedor_id),
    KEY IX_oferta_evento_status (evento_id,status),
    KEY IX_oferta_fornecedor (fornecedor_id),
    KEY IX_oferta_produto_fornecedor (produto_servico_id,fornecedor_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 8) Avaliacoes: uma avaliacao por usuario em cada evento.
CREATE TABLE avaliacao (
    id INT NOT NULL AUTO_INCREMENT,
    evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nota TINYINT NOT NULL,
    comentario VARCHAR(500) NULL,
    CONSTRAINT PK_avaliacao PRIMARY KEY (id),
    CONSTRAINT UQ_avaliacao_evento_usuario UNIQUE (evento_id, usuario_id),
    CONSTRAINT CK_avaliacao_nota CHECK (nota BETWEEN 1 AND 5),
    CONSTRAINT FK_avaliacao_evento FOREIGN KEY (evento_id) REFERENCES evento(id),
    CONSTRAINT FK_avaliacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
    KEY IX_avaliacao_usuario (usuario_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 9) Ingressos individuais, com dono atual.
--    Ainda nao modela lotes/tipos de ingresso nem reserva/carrinho.
CREATE TABLE ingresso (
    id INT NOT NULL AUTO_INCREMENT,
    evento_id INT NOT NULL,
    dono_atual_id INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    status CHAR(1) COLLATE utf8mb4_bin NOT NULL DEFAULT ('A'),
    CONSTRAINT PK_ingresso PRIMARY KEY (id),
    CONSTRAINT CK_ingresso_preco CHECK (preco >= 0),
    CONSTRAINT CK_ingresso_status CHECK (status IN ('A','V','C')),
    CONSTRAINT FK_ingresso_evento FOREIGN KEY (evento_id) REFERENCES evento(id),
    CONSTRAINT FK_ingresso_dono FOREIGN KEY (dono_atual_id) REFERENCES usuario(id),
    KEY IX_ingresso_evento_status (evento_id,status),
    KEY IX_ingresso_dono (dono_atual_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';

-- 10) Fotos de eventos
CREATE TABLE foto_evento (
    id INT NOT NULL AUTO_INCREMENT,
    evento_id INT NOT NULL,
    url_foto VARCHAR(500) NOT NULL,
    descricao VARCHAR(255) NULL,
    data_upload DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
    CONSTRAINT PK_foto_evento PRIMARY KEY (id),
    CONSTRAINT CK_foto_url_preenchida CHECK (CHAR_LENGTH(TRIM(REPLACE(REPLACE(REPLACE(url_foto, CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))) > 0),
    CONSTRAINT FK_foto_evento FOREIGN KEY (evento_id) REFERENCES evento(id),
    KEY IX_foto_evento (evento_id)
) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TrocaTicket candidato MySQL M1';


