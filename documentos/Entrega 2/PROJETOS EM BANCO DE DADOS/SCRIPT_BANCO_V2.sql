CREATE DATABASE trocaticket; # criando database
USE trocaticket; # usando database

# criando tabela: usuarios
CREATE TABLE usuario(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE, # ajustado para 191 para respeitar o limite de 1000 bytes do utf8mb4
    senha_hash VARCHAR(255) NOT NULL,
    url_foto_perfil VARCHAR(255),
    status_aprovacao CHAR(1) NOT NULL DEFAULT 'P',
    tipo_perfil INT NOT NULL, # 1: Participante, 2: Organizador, 3: Fornecedor, 4: Admin
    dois_fatores_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    data_cadastro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_usuario_status
        CHECK (status_aprovacao IN ('P', 'A', 'R')),

    CONSTRAINT chk_usuario_tipo
        CHECK (tipo_perfil IN (1, 2, 3, 4))
);

# criando tabela: detalhes de admin
CREATE TABLE administrador_detalhes(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    admin BOOL NOT NULL DEFAULT TRUE,
    
    CONSTRAINT fk_admin_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# criando tabela: detalhes de organizador
CREATE TABLE organizador_detalhes(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    nome_organizacao VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    
    CONSTRAINT fk_organizador_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

	CONSTRAINT chk_organizador_documento
		CHECK (
			cpf IS NULL OR cnpj IS NULL
		)
);

# criando tabela: detalhes de fornecedor
CREATE TABLE fornecedor_detalhes(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    nome_fantasia VARCHAR(255),
    razao_social VARCHAR(255),
    categoria_principal VARCHAR(100),
    descricao_servicos TEXT,
    website VARCHAR(255),
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    
    CONSTRAINT fk_fornecedor_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,

	CONSTRAINT chk_fornecedor_documento
		CHECK (
			cpf IS NULL OR cnpj IS NULL
		)
);

# criando tabela: eventos
CREATE TABLE evento(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    organizador_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    subtitulo VARCHAR(255),
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    formato VARCHAR(50) NOT NULL DEFAULT 'Presencial',
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_termino TIME NOT NULL,
    local VARCHAR(255) NOT NULL,
    capacidade INT,
    preco_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Rascunho',
    imagem_capa_url VARCHAR(255),
    is_impulsionado BOOLEAN NOT NULL DEFAULT FALSE,
    publico_min INT NOT NULL DEFAULT 1,
    publico_max INT,
    margem_lucro DECIMAL(5,2),
    
    CONSTRAINT fk_evento_organizador
        FOREIGN KEY (organizador_id) REFERENCES usuario(id),

    CONSTRAINT chk_evento_publico_min
        CHECK (publico_min >= 1),

    CONSTRAINT chk_evento_publico_max
        CHECK (publico_max IS NULL OR publico_max >= publico_min),

    CONSTRAINT chk_evento_margem
        CHECK (margem_lucro IS NULL OR margem_lucro BETWEEN 0 AND 100)
);

# criando tabela: fotos de eventos
CREATE TABLE foto_evento(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	evento_id INT NOT NULL,
    url_foto VARCHAR(255) NOT NULL,
    descricao VARCHAR(255),
    data_upload DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_foto_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE
);

# criando tabela: produto ou serviço (criado antes da tabela de propostas)
CREATE TABLE produto_servico(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    fornecedor_id INT NOT NULL,
    sku VARCHAR(100) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    versao VARCHAR(255),
    categoria VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL DEFAULT 'Produto',
    unidade VARCHAR(100) NOT NULL DEFAULT 'Unidade / Diária',
    preco_referencia DECIMAL(10,2) NOT NULL,
    custo_direto DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Disponível',
    descricao TEXT,
    especificacoes JSON,
    
    CONSTRAINT chk_produto_preco
		CHECK (preco_referencia >= 0),

	CONSTRAINT fk_produto_fornecedor
		FOREIGN KEY (fornecedor_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# criando tabela: propostas (evolução da tabela oferta)
CREATE TABLE proposta(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    codigo_protocolo VARCHAR(100) UNIQUE,
	evento_id INT NOT NULL,
    fornecedor_id INT NOT NULL,
	status VARCHAR(50) NOT NULL DEFAULT 'Em análise',
	valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    condicao_pagamento VARCHAR(255),
    observacoes TEXT,
    data_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_proposta_valor
		CHECK (valor_total >= 0),

	CONSTRAINT fk_proposta_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

	CONSTRAINT fk_proposta_fornecedor
		FOREIGN KEY (fornecedor_id) REFERENCES usuario(id)
);

# criando tabela: itens da proposta
CREATE TABLE item_proposta(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    proposta_id INT NOT NULL,
    produto_servico_id INT,
    nome_item VARCHAR(255) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    unidade VARCHAR(100),
    valor_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    
    CONSTRAINT chk_item_proposta_qtd
		CHECK (quantidade > 0),

    CONSTRAINT chk_item_proposta_valor
		CHECK (valor_unitario >= 0),

    CONSTRAINT fk_item_proposta_proposta
		FOREIGN KEY (proposta_id) REFERENCES proposta(id) ON DELETE CASCADE,

    CONSTRAINT fk_item_proposta_produto
		FOREIGN KEY (produto_servico_id) REFERENCES produto_servico(id) ON DELETE SET NULL
);

# criando tabela: avaliações
CREATE TABLE avaliacao(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nota INT NOT NULL,
    comentario VARCHAR(255),
    data_avaliacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_avaliacao_nota
		CHECK (nota BETWEEN 1 AND 5),

	CONSTRAINT fk_avaliacao_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

	CONSTRAINT fk_avaliacao_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# criando tabela: ingressos
CREATE TABLE ingresso(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    codigo_ingresso VARCHAR(100) UNIQUE,
    evento_id INT NOT NULL,
    dono_atual_id INT NOT NULL,
    tipo_ingresso VARCHAR(50) NOT NULL DEFAULT 'Inteira',
    preco DECIMAL(10,2) NOT NULL,
    status CHAR(1) NOT NULL DEFAULT 'A',
    data_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_ingresso_preco
		CHECK (preco >= 0),

	CONSTRAINT chk_ingresso_status
		CHECK (status IN ('A', 'V', 'C')),

	CONSTRAINT fk_ingresso_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id) ON DELETE CASCADE,

	CONSTRAINT fk_ingresso_dono
		FOREIGN KEY (dono_atual_id) REFERENCES usuario(id)
);