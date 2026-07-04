-- Tabla para almacenar las postulaciones de ascenso a tutor de los alumnos (APRENDIZ)
CREATE TABLE IF NOT EXISTS Tutor_Applications (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    motivation          TEXT NOT NULL,
    selected_subjects   JSON NOT NULL,
    academic_record_url VARCHAR(500) DEFAULT NULL,
    status              VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Tabla para almacenar los tickets de soporte técnico o ayuda de la comunidad
CREATE TABLE IF NOT EXISTS Support_Tickets (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    status          VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED'
    reply           TEXT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Tabla para almacenar las recompensas de ESPE-Coins
CREATE TABLE IF NOT EXISTS Rewards (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    cost                INT NOT NULL,
    is_active           TINYINT(1) DEFAULT 1,
    is_special          TINYINT(1) DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla para almacenar los reclamos de recompensas de los usuarios
CREATE TABLE IF NOT EXISTS User_Rewards (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    reward_id           INT NOT NULL,
    selected_option     VARCHAR(255) DEFAULT NULL,
    contact_phone       VARCHAR(50) DEFAULT NULL,
    claimed_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES Rewards(id) ON DELETE CASCADE
);

