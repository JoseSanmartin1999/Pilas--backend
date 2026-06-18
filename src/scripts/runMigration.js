import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, '..', 'config', 'migrations', 'create_repository_materials.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        // Ejecutar cada statement separado por punto y coma
        const statements = sql.split(';').filter(s => s.trim());
        for (const statement of statements) {
            await db.query(statement);
        }

        console.log('✅ Migración Repository_Materials ejecutada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        process.exit(1);
    }
};

runMigration();
