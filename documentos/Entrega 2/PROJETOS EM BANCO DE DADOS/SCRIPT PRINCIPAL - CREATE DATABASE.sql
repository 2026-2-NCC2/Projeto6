CREATE DATABASE trocaticket; # criando database
USE trocaticket; # usando database

# criando tabela: eventos
CREATE TABLE evento(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    publico_min INT NOT NULL DEFAULT 1,
    publico_max INT,
    margem_lucro DECIMAL(5,2),
    is_impulsionado BOOLEAN NOT NULL DEFAULT FALSE,
    data_hora DATETIME NOT NULL,
    local VARCHAR(255) NOT NULL,
    
    CONSTRAINT chk_evento_publico_min
        CHECK (publico_min >= 1),

    CONSTRAINT chk_evento_publico_max
        CHECK (publico_max >= publico_min),

    CONSTRAINT chk_evento_margem
        CHECK (margem_lucro IS NULL OR margem_lucro BETWEEN 0 AND 100)
);

# criando tabela: usuarios
CREATE TABLE usuario(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    url_foto_perfil VARCHAR(255),
    status_aprovacao CHAR(1) NOT NULL DEFAULT "P",
    tipo_perfil INT NOT NULL,
    
    CONSTRAINT chk_usuario_status
        CHECK (status_aprovacao IN ('P', 'A', 'R')),

    CONSTRAINT chk_usuario_tipo
        CHECK (tipo_perfil IN (1, 2, 3))
);

# criando tabela: ofertas
CREATE TABLE oferta(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	status CHAR(1) NOT NULL DEFAULT 'P',
	valor DECIMAL(10,2) NOT NULL,
    evento_id INT,
    produto_servico_id INT,
    fornecedor_id INT NOT NULL,
    organizador_id INT,
    
    CONSTRAINT chk_oferta_valor
		CHECK (valor >= 0),

	CONSTRAINT chk_oferta_status
		CHECK (status IN ('P', 'A', 'R', 'C')),

	CONSTRAINT fk_oferta_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id),

	CONSTRAINT fk_oferta_produto
		FOREIGN KEY (produto_servico_id)
		REFERENCES produto_servico(id)
);

# criando tabela: avaliacões
CREATE TABLE avaliacao(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nota INT NOT NULL,
    comentario VARCHAR(255),
    CONSTRAINT chk_avaliacao_nota
		CHECK (nota BETWEEN 1 AND 5),

	CONSTRAINT fk_avaliacao_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id),

	CONSTRAINT fk_avaliacao_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

# criando tabela: ingressos
CREATE TABLE ingresso(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    evento_id INT NOT NULL,
    dono_atual_id INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    status CHAR(1) NOT NULL DEFAULT 'A',
    CONSTRAINT chk_ingresso_preco
		CHECK (preco >= 0),

	CONSTRAINT chk_ingresso_status
		CHECK (status IN ('A', 'V', 'C')),

	CONSTRAINT fk_ingresso_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id),

	CONSTRAINT fk_ingresso_dono
		FOREIGN KEY (dono_atual_id) REFERENCES usuario(id)
);

# separando

# criando tabela: detalhes de admin
CREATE TABLE administrador_detalhes(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    admin BOOL NOT NULL,
    CONSTRAINT fk_admin_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

# criando tabela: detalhes de organizador
CREATE TABLE organizador_detalhes(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    telefone VARCHAR(11),
    cpf VARCHAR(11) UNIQUE,
    cnpj VARCHAR(14) UNIQUE,
    
    CONSTRAINT fk_organizador_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id),

	CONSTRAINT chk_organizador_documento
		CHECK (
			cpf IS NULL OR cnpj IS NULL
		)
);

# criando tabela: detalhes de fornecedor
CREATE TABLE fornecedor_detalhes(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL UNIQUE,
    descricao_servicos VARCHAR(255),
    cpf VARCHAR(11) UNIQUE,
    cnpj VARCHAR(14) UNIQUE,
    
    CONSTRAINT fk_fornecedor_usuario
		FOREIGN KEY (usuario_id) REFERENCES usuario(id),

	CONSTRAINT chk_fornecedor_documento
		CHECK (
			cpf IS NULL OR cnpj IS NULL
		)
);

# criando tabela: fotos de eventos
CREATE TABLE foto_evento(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	evento_id INT NOT NULL,
    url_foto VARCHAR(255) NOT NULL,
    descricaco VARCHAR(255),
    data_upload DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_foto_evento
		FOREIGN KEY (evento_id) REFERENCES evento(id)
);

# criando tabela: produto ou serviço
CREATE TABLE produto_servico(
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    fornecedor_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    tipo CHAR(1),
    
    CONSTRAINT chk_produto_tipo
		CHECK (tipo IN ('P', 'S')),

	CONSTRAINT fk_produto_fornecedor
		FOREIGN KEY (fornecedor_id)
		REFERENCES fornecedor_detalhes(usuario_id)
);
