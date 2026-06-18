import db from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS = [
    { query: 'ALTER TABLE Users ADD COLUMN bio TEXT;', column: 'bio' },
    { query: 'ALTER TABLE Users ADD COLUMN profile_photo_url VARCHAR(500);', column: 'profile_photo_url' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN subject_id INT;', column: 'subject_id' },
    { query: 'ALTER TABLE Mentorships ADD CONSTRAINT fk_mentorship_subject FOREIGN KEY (subject_id) REFERENCES Subjects(id);', column: 'fk_mentorship_subject' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN apprentice_notified BOOLEAN DEFAULT 0;', column: 'apprentice_notified' },
    { query: 'ALTER TABLE Users ADD COLUMN reset_code VARCHAR(10);', column: 'reset_code' },
    { query: 'ALTER TABLE Users ADD COLUMN reset_code_expires_at TIMESTAMP NULL;', column: 'reset_code_expires_at' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN is_deleted BOOLEAN DEFAULT 0;', column: 'is_deleted' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN estimated_duration VARCHAR(50) DEFAULT "1 hora";', column: 'estimated_duration' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN closed_at TIMESTAMP NULL DEFAULT NULL;', column: 'closed_at' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN rating INT DEFAULT NULL;', column: 'rating' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN rating_comment TEXT DEFAULT NULL;', column: 'rating_comment' },
    { query: 'ALTER TABLE Mentorships ADD COLUMN is_rated TINYINT(1) DEFAULT 0;', column: 'is_rated' },
    { query: "ALTER TABLE Users ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVO';", column: 'status' },
    { query: 'ALTER TABLE Users ADD COLUMN verification_code VARCHAR(10) DEFAULT NULL;', column: 'verification_code' },
    { query: 'ALTER TABLE Users ADD COLUMN verification_code_expires_at TIMESTAMP NULL DEFAULT NULL;', column: 'verification_code_expires_at' },
    { query: 'ALTER TABLE Users ADD COLUMN xp INT DEFAULT 0;', column: 'xp' },
    { query: 'ALTER TABLE Users ADD COLUMN level INT DEFAULT 1;', column: 'level' },
    { query: 'ALTER TABLE Users ADD COLUMN espe_coins INT DEFAULT 0;', column: 'espe_coins' },
    { query: 'ALTER TABLE Badges ADD COLUMN xp_reward INT DEFAULT 0;', column: 'xp_reward' },
    { query: 'ALTER TABLE Badges ADD COLUMN coins_reward INT DEFAULT 0;', column: 'coins_reward' }
];

async function executeMigrations() {
    console.log("Iniciando verificación de esquema de base de datos...");

    // 1. Ejecutar migraciones tradicionales en columnas de tablas existentes
    for (const { query, column } of MIGRATIONS) {
        try {
            await db.query(query);
            console.log(`[EXITO] Columna/Constraint '${column}' agregada exitosamente.`);
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column') || error.message.includes('Duplicate key')) {
                console.log(`[INFO] La columna/constraint '${column}' ya existe, omitiendo.`);
            } else {
                console.warn(`[ADVERTENCIA] Error inesperado con '${column}': ${error.message}`);
            }
        }
    }

    // 2. Ejecutar archivo SQL de tablas administrativas
    try {
        const sqlPath = path.join(__dirname, 'src', 'config', 'migrations', 'create_admin_tables.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf-8');
            const statements = sql.split(';').filter(s => s.trim());
            for (const statement of statements) {
                await db.query(statement);
            }
            console.log("[EXITO] Tablas administrativas creadas o verificadas correctamente.");
        } else {
            console.warn("[ADVERTENCIA] No se encontró el archivo create_admin_tables.sql.");
        }
    } catch (error) {
        console.error("[ERROR] Error al crear tablas administrativas:", error.message);
    }

    // 3. Insertar usuario administrador por defecto si no existe
    try {
        const [admins] = await db.query("SELECT * FROM Users WHERE role = 'ADMIN'");
        if (admins.length === 0) {
            const adminEmail = 'admin@pilas.edu.ec';
            const adminName = 'Administrador Pilas!';
            const passwordHash = await bcrypt.hash('admin123', 10);
            
            await db.query(
                `INSERT INTO Users (full_name, email, password_hash, role, institution, career, student_id, current_semester, bio) 
                 VALUES (?, ?, ?, 'ADMIN', 'ESPE', 'Ingeniería de Software', 'L00000000', 9, 'Cuenta de administración del sistema.')`,
                [adminName, adminEmail, passwordHash]
              );
            console.log(`[EXITO] Administrador por defecto creado: ${adminEmail} (pass: admin123)`);
        } else {
            console.log("[INFO] Ya existe un usuario administrador, omitiendo creación por defecto.");
        }
    } catch (error) {
        console.error("[ERROR] Error al sembrar administrador por defecto:", error.message);
    }

    // 4. Sembrar insignias iniciales si la tabla Badges está vacía
    try {
        const [badges] = await db.query("SELECT * FROM Badges");
        if (badges.length === 0) {
            const INITIAL_BADGES = [
                {
                    name: 'Primeros Pasos',
                    image_url: 'https://cdn-icons-png.flaticon.com/512/3585/3585145.png',
                    criteria: JSON.stringify({ type: 'mentorships_any', value: 1 }),
                    xp_reward: 100,
                    coins_reward: 50
                },
                {
                    name: 'Cerebro de Oro',
                    image_url: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
                    criteria: JSON.stringify({ type: 'xp_earned', value: 500 }),
                    xp_reward: 250,
                    coins_reward: 100
                },
                {
                    name: 'Siempre Puntual',
                    image_url: 'https://cdn-icons-png.flaticon.com/512/3240/3240652.png',
                    criteria: JSON.stringify({ type: 'mentorships_any', value: 3 }),
                    xp_reward: 150,
                    coins_reward: 75
                },
                {
                    name: 'Mentor Estrella',
                    image_url: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png',
                    criteria: JSON.stringify({ type: 'mentorships_given', value: 5 }),
                    xp_reward: 500,
                    coins_reward: 200
                },
                {
                    name: 'Súper Aprendiz',
                    image_url: 'https://cdn-icons-png.flaticon.com/512/2996/2996163.png',
                    criteria: JSON.stringify({ type: 'mentorships_received', value: 10 }),
                    xp_reward: 400,
                    coins_reward: 150
                },
                {
                    name: 'Héroe de la ESPE',
                    image_url: 'https://cdn-icons-png.flaticon.com/512/3112/3112946.png',
                    criteria: JSON.stringify({ type: 'perfect_ratings', value: 8 }),
                    xp_reward: 1000,
                    coins_reward: 500
                }
            ];

            for (const badge of INITIAL_BADGES) {
                await db.query(
                    `INSERT INTO Badges (name, image_url, criteria, xp_reward, coins_reward) VALUES (?, ?, ?, ?, ?)`,
                    [badge.name, badge.image_url, badge.criteria, badge.xp_reward, badge.coins_reward]
                );
            }
            console.log("[EXITO] Insignias iniciales sembradas correctamente.");
        } else {
            console.log("[INFO] Ya existen insignias en la base de datos, omitiendo siembra.");
        }
    } catch (error) {
        console.error("[ERROR] Error al sembrar insignias por defecto:", error.message);
    }

    console.log("Verificación de esquema finalizada.");
}

async function syncDB() {
    try {
        await executeMigrations();
    } catch (e) {
        console.error("[ERROR CRÍTICO] Script de migración falló:", e);
    } finally {
        process.exit(0);
    }
}

syncDB();
//Fin del Codigo