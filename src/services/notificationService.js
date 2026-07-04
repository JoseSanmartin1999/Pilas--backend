import db from '../config/db.js';

/**
 * Asegura que un sujeto del sistema exista para etiquetar los mensajes institucionales.
 */
const ensureSystemSubject = async () => {
    try {
        const [existing] = await db.query("SELECT id FROM Subjects WHERE name = 'Pilas! Comunidad' LIMIT 1");
        if (existing.length > 0) {
            return existing[0].id;
        }

        // Obtener la primera carrera disponible para la clave foránea
        const [careers] = await db.query("SELECT id FROM Careers LIMIT 1");
        const careerId = careers.length > 0 ? careers[0].id : 1;

        const [result] = await db.query(
            "INSERT INTO Subjects (name, semester, code, career_id) VALUES ('Pilas! Comunidad', 1, 'PILAS-COM', ?)",
            [careerId]
        );
        return result.insertId;
    } catch (err) {
        console.error("Error al asegurar materia de la comunidad:", err.message);
        return 1; // Fallback
    }
};

/**
 * Genera el mensaje de bienvenida y el recordatorio de la encuesta de tesis solo una vez.
 * @param {number} userId ID del usuario destinatario
 */
export const ensureWelcomeMessages = async (userId) => {
    try {
        // 1. Obtener ID de administrador como remitente
        const [admins] = await db.query(`
            SELECT ur.user_id as id 
            FROM User_Roles ur 
            JOIN Roles r ON ur.role_id = r.id 
            WHERE r.name = 'ADMIN' 
            LIMIT 1
        `);
        const adminId = admins.length > 0 ? admins[0].id : 120001; // fallback admin por defecto

        // Evitar mandarse mensajes a uno mismo si el logueado es el Admin
        if (Number(userId) === Number(adminId)) {
            return;
        }

        // 2. Asegurar la materia para categorizar el mensaje
        const subjectId = await ensureSystemSubject();

        // 3. Crear Mensaje 1: Bienvenida
        const [existingWelcome] = await db.query(
            "SELECT id FROM Mentorships WHERE apprentice_id = ? AND objectives LIKE '%Bienvenido%plataforma%Pilas%'",
            [userId]
        );
        if (existingWelcome.length === 0) {
            await db.query(
                `INSERT INTO Mentorships (
                    mentor_id, apprentice_id, subject_id, scheduled_date, objectives, 
                    status, modality, meeting_place, platform, estimated_duration, apprentice_notified
                ) VALUES (?, ?, ?, NOW(), ?, 'ACEPTADA', 'Online', 'Plataforma Pilas!', null, '1 hora', 0)`,
                [
                    adminId, 
                    userId, 
                    subjectId, 
                    "¡Bienvenido a la plataforma Pilas! Estamos encantados de tenerte aquí. Explora las tutorías disponibles, completa tu perfil y acumula ESPE-Coins para canjear increíbles recompensas en nuestra Tienda de Beneficios."
                ]
            );
            console.log(`[EXITO] Mensaje de bienvenida creado para el usuario ${userId}`);
        }

        // 4. Crear Mensaje 2: Encuesta de Tesis
        const [existingSurvey] = await db.query(
            "SELECT id FROM Mentorships WHERE apprentice_id = ? AND objectives LIKE '%forms.gle/1pB1RJS9B9b6ASMD7%'",
            [userId]
        );
        if (existingSurvey.length === 0) {
            await db.query(
                `INSERT INTO Mentorships (
                    mentor_id, apprentice_id, subject_id, scheduled_date, objectives, 
                    status, modality, meeting_place, platform, estimated_duration, apprentice_notified
                ) VALUES (?, ?, ?, NOW(), ?, 'ACEPTADA', 'Online', 'En línea (Google Forms)', null, '1 hora', 0)`,
                [
                    adminId, 
                    userId, 
                    subjectId, 
                    "Por favor ayúdanos llenando esta importante encuesta para obtener resultados de mi Tesis de grado: https://forms.gle/1pB1RJS9B9b6ASMD7. Tu opinión es fundamental para mejorar la plataforma, completar mi investigación de tesis y habilitar tu boleto para participar en el sorteo especial. ¡Muchas gracias por tu valiosa colaboración!"
                ]
            );
            console.log(`[EXITO] Mensaje de recordatorio de encuesta creado para el usuario ${userId}`);
        }
    } catch (error) {
        console.error(`Error al asegurar mensajes de bienvenida para el usuario ${userId}:`, error.message);
    }
};
