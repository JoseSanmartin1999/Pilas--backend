// backend/src/config/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del pool de conexiones para TiDB
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // TiDB Cloud requiere SSL para conexiones externas
    ssl: {
        rejectUnauthorized: false
    }
});

// Prueba de conexión inicial
const testConnection = async () => {
    try {
        const connection = await db.getConnection();
        console.log('✅ Conexión a TiDB Cloud exitosa (pilas_tutorias)');
        connection.release();
    } catch (error) {
        console.error('❌ Error conectando a TiDB:', error.message);
    }
};

testConnection();

export default db;