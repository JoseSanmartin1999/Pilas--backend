import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Configuración de SMTP (fallback para desarrollo local o si se prefiere SMTP)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    family: 4, // FORZAR IPv4 para evitar errores de red ENETUNREACH en servidores que no soportan IPv6 (como Render)
    connectionTimeout: 8000, // 8 segundos para evitar bloqueos eternos
    greetingTimeout: 8000,
    socketTimeout: 8000
});

/**
 * Helper genérico para enviar correos.
 * Si se encuentra BREVO_API_KEY en las variables de entorno, realiza una petición POST
 * a la API REST de Brevo (HTTPS, puerto 443). Si no, realiza el envío tradicional
 * por SMTP (Nodemailer) como fallback.
 */
const sendMailHelper = async (toEmail, subject, htmlContent) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.EMAIL_USER || 'mentoriaspilas@gmail.com';

    if (apiKey) {
        try {
            const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: {
                    name: 'Pilas! Tutorías',
                    email: senderEmail
                },
                to: [
                    {
                        email: toEmail
                    }
                ],
                subject: subject,
                htmlContent: htmlContent
            }, {
                headers: {
                    'accept': 'application/json',
                    'api-key': apiKey,
                    'content-type': 'application/json'
                },
                timeout: 8000 // 8 segundos de timeout para evitar cuelgues
            });
            return response.data;
        } catch (error) {
            console.error("Error al enviar correo vía Brevo API:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message);
        }
    } else {
        console.warn("⚠️ BREVO_API_KEY no configurada. Usando fallback SMTP...");
        const mailOptions = {
            from: `"Pilas! Tutorías" <${senderEmail}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent
        };
        return transporter.sendMail(mailOptions);
    }
};

export const sendPasswordResetEmail = async (toEmail, code) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #0b2239; text-align: center;">Recuperación de Contraseña</h2>
            <p style="color: #333; font-size: 16px;">Hola,</p>
            <p style="color: #333; font-size: 16px;">Has solicitado restablecer tu contraseña. Utiliza el siguiente código de 6 dígitos. Este código expirará en <strong>5 minutos</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; padding: 15px 30px; background-color: #f4f4f4; color: #0b2239; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
                    ${code}
                </span>
            </div>
            
            <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Pilas! Tutorías &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    return sendMailHelper(toEmail, 'Código de Recuperación de Contraseña', htmlContent);
};

export const sendEmailVerificationEmail = async (toEmail, code) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #0b2239; text-align: center;">¡Bienvenido a Pilas!</h2>
            <p style="color: #333; font-size: 16px;">Hola,</p>
            <p style="color: #333; font-size: 16px;">Gracias por registrarte en nuestra plataforma de mentorías. Para completar tu registro y activar tu cuenta, utiliza el siguiente código de verificación de 6 dígitos. Este código expirará en <strong>24 horas</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; padding: 15px 30px; background-color: #0b2239; color: white; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
                    ${code}
                </span>
            </div>
            
            <p style="color: #666; font-size: 14px;">Si no realizaste este registro, puedes ignorar este correo de forma segura.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Pilas! Tutorías &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    return sendMailHelper(toEmail, 'Verifica tu Cuenta - Pilas! Tutorías', htmlContent);
};

export const sendMentorshipStatusEmail = async (toEmail, apprenticeName, mentorName, status, subjectName) => {
    let statusText = '';
    let color = '';
    
    if (status === 'ACEPTADA') {
        statusText = 'ha aceptado';
        color = '#28a745'; // verde
    } else if (status === 'RECHAZADA') {
        statusText = 'ha rechazado';
        color = '#dc3545'; // rojo
    } else {
        return; // Solo enviar si es aceptada o rechazada
    }

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #0b2239; text-align: center;">Actualización de Tutoría</h2>
            <p style="color: #333; font-size: 16px;">Hola ${apprenticeName},</p>
            <p style="color: #333; font-size: 16px;">Te informamos que el mentor <strong>${mentorName}</strong> ${statusText} tu solicitud de tutoría para la materia <strong>${subjectName}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; padding: 10px 20px; background-color: ${color}; color: white; font-size: 18px; font-weight: bold; border-radius: 5px;">
                    ESTADO: ${status}
                </span>
            </div>
            
            <p style="color: #666; font-size: 14px;">Inicia sesión en Pilas! Tutorías para ver más detalles en tu bandeja de mensajes o solicitudes.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Pilas! Tutorías &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    return sendMailHelper(toEmail, `Actualización de tu solicitud de tutoría - ${subjectName}`, htmlContent);
};

export const sendMentorshipReprogramEmail = async (toEmail, recipientName, senderName, subjectName, newDate, reason, initiatorRole) => {
    const formattedDate = new Date(newDate).toLocaleString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const roleText = initiatorRole === 'MENTOR' ? 'el tutor' : 'el aprendiz';

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #0b2239; text-align: center;">Propuesta de Reprogramación</h2>
            <p style="color: #333; font-size: 16px;">Hola ${recipientName},</p>
            <p style="color: #333; font-size: 16px;">Te informamos que <strong>${senderName}</strong> (${roleText}) ha propuesto reprogramar la tutoría de la materia <strong>${subjectName}</strong>.</p>
            
            <div style="background-color: #fcf8e3; border: 1px solid #faebcc; color: #8a6d3b; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 15px;">
                <strong>Nueva Fecha Propuesta:</strong><br/>
                ${formattedDate}<br/><br/>
                <strong>Motivo del Cambio:</strong><br/>
                ${reason || 'No especificado'}
            </div>
            
            <p style="color: #666; font-size: 14px;">Inicia sesión en la plataforma Pilas! para responder (aceptar, declinar o reprogramar) esta propuesta.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Pilas! Tutorías &copy; ${new Date().getFullYear()}</p>
        </div>
    `;

    return sendMailHelper(toEmail, `Propuesta de Reprogramación de Tutoría - ${subjectName}`, htmlContent);
};

