-- Tabla para el Repositorio de Materiales de cada tutoría
-- Almacena la metadata de los archivos subidos por mentores
CREATE TABLE IF NOT EXISTS Repository_Materials (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    mentorship_id   INT NOT NULL,
    uploader_id     INT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    file_url        VARCHAR(500) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_size       BIGINT NOT NULL DEFAULT 0,
    file_type       VARCHAR(50) NOT NULL,
    mime_type       VARCHAR(100),
    cloudinary_public_id VARCHAR(300),
    cloudinary_resource_type VARCHAR(20) DEFAULT 'image',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mentorship (mentorship_id),
    INDEX idx_uploader (uploader_id)
);
