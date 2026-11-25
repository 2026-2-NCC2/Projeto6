# MIGRAÇÃO — sessões de login (etapa 1 da integração com a TrocaTicket 2.0)
#
# Cria a tabela usada pelo servidor para lembrar quem entrou no site. O desenho segue
# a tabela "sessao" da TrocaTicket 2.0 (documentos/Site/TrocaTicket 2.0), adaptado ao
# banco da main:
#   - o cookie guarda um código aleatório; o banco guarda só o resumo SHA-256 dele;
#   - cada sessão tem um token anti-CSRF exigido nas gravações;
#   - datas em UTC; sessões expiram e podem ser encerradas (logout ou troca de senha).
#
# Ordem de instalação: SCRIPT_BANCO_V2.sql -> MIGRACAO_PERFIL_FORNECEDOR_FAVORITOS.sql -> este arquivo.
# Pode ser executada mais de uma vez e não apaga dados. Compatível com MySQL 8 e MariaDB 10.5+.
# Se o seu banco tiver outro nome, ajuste o USE.

USE trocaticket;

CREATE TABLE IF NOT EXISTS sessao(
    id_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    usuario_id INT NOT NULL,
    csrf_token CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    criada_em DATETIME NOT NULL,
    expira_em DATETIME NOT NULL,
    revogada_em DATETIME NULL,

    INDEX idx_sessao_usuario (usuario_id),
    INDEX idx_sessao_expira (expira_em),

    CONSTRAINT fk_sessao_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE
);

# Conferência: o resultado deve vir VAZIO. Cada linha é uma coluna ausente.
SELECT esperado.coluna AS coluna_ausente_em_sessao
  FROM (
    SELECT 'id_hash' AS coluna
    UNION ALL SELECT 'usuario_id'
    UNION ALL SELECT 'csrf_token'
    UNION ALL SELECT 'criada_em'
    UNION ALL SELECT 'expira_em'
    UNION ALL SELECT 'revogada_em'
  ) AS esperado
  LEFT JOIN information_schema.columns c
    ON c.table_schema = DATABASE()
   AND c.table_name = 'sessao'
   AND c.column_name = esperado.coluna
 WHERE c.column_name IS NULL;
