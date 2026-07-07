import db from '../config/db.js';
import { sendMentorshipReminderEmail } from './emailService.js';
import { getEcuadorDateTime, getEcuadorDateTimeOffset } from '../utils/dateUtils.js';

/**
 * Envía recordatorios para tutorías dentro de la ventana de tiempo especificada.
 * @param {string} intervalLabel - Etiqueta descriptiva (ej. "24 horas", "2 horas")
 * @param {number} intervalMs - Intervalo en milisegundos (ej. 2 * 3600000)
 * @param {string} flagColumn - Columna de la DB que indica si ya se envió (ej. "reminder_sent", "reminder_2h_sent")
 */
async function sendRemindersForWindow(intervalLabel, intervalMs, flagColumn) {
    try {
        console.log(`⏰ Buscando tutorías próximas (siguientes ${intervalLabel}) para enviar recordatorios (${flagColumn})...`);
        
        // Calculamos el inicio y el fin de la ventana en hora local de Ecuador en JavaScript
        const startTime = getEcuadorDateTime();
        const endTime = getEcuadorDateTimeOffset(intervalMs);
        
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
              AND m.${flagColumn} = 0
              AND m.is_deleted = 0
              AND s.name != 'Pilas! Comunidad'
              AND m.scheduled_date BETWEEN ? AND ?
        `;
        const [mentorships] = await db.query(query, [startTime, endTime]);

        if (mentorships.length === 0) {
            console.log(`⏰ No se encontraron tutorías próximas (${intervalLabel}) que requieran recordatorio.`);
            return;
        }

        console.log(`⏰ Se encontraron ${mentorships.length} tutorías elegibles para recordatorio (${intervalLabel}).`);

        for (const m of mentorships) {
            // Si la fecha de la tutoría ya pasó en hora local de Ecuador, no debemos enviar el correo.
            // Simplemente la marcamos como "enviada" (notificada) para que no vuelva a ser procesada.
            const nowEcuador = getEcuadorDateTime();
            const scheduledEcuador = getEcuadorDateTime(m.scheduled_date);
            
            if (scheduledEcuador <= nowEcuador) {
                console.log(`⏰ Tutoría ID ${m.id} ya ha pasado (${scheduledEcuador} <= ${nowEcuador}). Marcando como notificada sin enviar correo.`);
                await db.query(`UPDATE Mentorships SET ${flagColumn} = 1 WHERE id = ?`, [m.id]);
                continue;
            }

            console.log(`⏰ Enviando recordatorio (${intervalLabel}) para la tutoría ID ${m.id} (${m.subject_name})...`);

            // Enviar correo al aprendiz
            try {
                await sendMentorshipReminderEmail(
                    m.apprentice_email,
                    m.apprentice_name || 'Estudiante',
                    m.apprentice_name || 'Estudiante',
                    m.mentor_name || 'Tutor',
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
                    m.mentor_name || 'Tutor',
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
            await db.query(`UPDATE Mentorships SET ${flagColumn} = 1 WHERE id = ?`, [m.id]);
            console.log(`✅ Tutoría ID ${m.id} marcada como notificada (${flagColumn}).`);
        }
    } catch (error) {
        console.error(`❌ Error en la tarea de recordatorio de tutorías (${intervalLabel}):`, error);
    }
}

export async function checkAndSendReminders() {
    // Para proteger la cuota de tokens de Brevo, se envía ÚNICAMENTE el recordatorio de 2 horas.
    // Los recordatorios de 24 horas y 10 minutos han sido desactivados de forma permanente.
    await sendRemindersForWindow('2 horas', 2 * 60 * 60 * 1000, 'reminder_2h_sent');
}

export function initReminderScheduler() {
    // Ejecutar una vez al arrancar el servidor
    checkAndSendReminders();

    // Ejecutar cada 1 minuto (60 * 1000 ms)
    const intervalMs = 60 * 1000;
    setInterval(checkAndSendReminders, intervalMs);
    console.log("⏰ Planificador de recordatorios inicializado (corriendo cada 1 minuto). Único recordatorio activo: 2 horas antes de la reunión.");
}
