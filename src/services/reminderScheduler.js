import db from '../config/db.js';
import { sendMentorshipReminderEmail } from './emailService.js';

export async function checkAndSendReminders() {
    try {
        console.log("⏰ Buscando tutorías próximas (siguientes 24 horas) para enviar recordatorios...");
        const query = `
            SELECT m.id, m.scheduled_date, m.modality, m.meeting_place, m.platform, m.meeting_link,
                   s.name as subject_name,
                   p_mentor.full_name as mentor_name, mt.email as mentor_email,
                   p_apprentice.full_name as apprentice_name, ap.email as apprentice_email
            FROM Mentorships m
            JOIN Users mt ON m.mentor_id = mt.id
            LEFT JOIN Profiles p_mentor ON mt.id = p_mentor.user_id
            JOIN Users ap ON m.apprentice_id = ap.id
            LEFT JOIN Profiles p_apprentice ON ap.id = p_apprentice.user_id
            JOIN Subjects s ON m.subject_id = s.id
            WHERE m.status = 'ACEPTADA'
              AND m.reminder_sent = 0
              AND m.is_deleted = 0
              AND m.scheduled_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
        `;
        const [mentorships] = await db.query(query);
        
        if (mentorships.length === 0) {
            console.log("⏰ No se encontraron tutorías próximas que requieran recordatorio.");
            return;
        }

        console.log(`⏰ Se encontraron ${mentorships.length} tutorías elegibles para recordatorio.`);

        for (const m of mentorships) {
            console.log(`⏰ Enviando recordatorio para la tutoría ID ${m.id} (${m.subject_name})...`);
            
            // Enviar correo al aprendiz
            try {
                await sendMentorshipReminderEmail(
                    m.apprentice_email, 
                    m.apprentice_name || 'Estudiante', 
                    m.mentor_name || 'Tutor', 
                    'MENTOR', 
                    m.subject_name, 
                    m.scheduled_date, 
                    m.modality, 
                    m.meeting_place, 
                    m.platform, 
                    m.meeting_link
                );
            } catch (err) {
                console.error(`❌ Falló enviar recordatorio al aprendiz (${m.apprentice_email}):`, err.message);
            }

            // Enviar correo al mentor
            try {
                await sendMentorshipReminderEmail(
                    m.mentor_email, 
                    m.mentor_name || 'Tutor', 
                    m.apprentice_name || 'Aprendiz', 
                    'APRENDIZ', 
                    m.subject_name, 
                    m.scheduled_date, 
                    m.modality, 
                    m.meeting_place, 
                    m.platform, 
                    m.meeting_link
                );
            } catch (err) {
                console.error(`❌ Falló enviar recordatorio al mentor (${m.mentor_email}):`, err.message);
            }

            // Marcar recordatorio como enviado para evitar duplicados
            await db.query('UPDATE Mentorships SET reminder_sent = 1 WHERE id = ?', [m.id]);
            console.log(`✅ Tutoría ID ${m.id} marcada como notificada.`);
        }
    } catch (error) {
        console.error("❌ Error en la tarea de recordatorio de tutorías:", error);
    }
}

export function initReminderScheduler() {
    // Ejecutar una vez al arrancar el servidor
    checkAndSendReminders();

    // Ejecutar cada 15 minutos (15 * 60 * 1000 ms)
    const intervalMs = 15 * 60 * 1000;
    setInterval(checkAndSendReminders, intervalMs);
    console.log("⏰ Planificador de recordatorios inicializado (corriendo cada 15 minutos).");
}
