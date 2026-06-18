import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendPasswordResetEmail = async (toEmail, code) => {
    const mailOptions = {
        from: `"Pilas! Tutorías" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Código de Recuperación de Contraseña',
        html: `
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
        `
    };

    return transporter.sendMail(mailOptions);
};

export const sendEmailVerificationEmail = async (toEmail, code) => {
    const mailOptions = {
        from: `"Pilas! Tutorías" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Verifica tu Cuenta - Pilas! Tutorías',
        html: `
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
        `
    };

    return transporter.sendMail(mailOptions);
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

    const mailOptions = {
        from: `"Pilas! Tutorías" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Actualización de tu solicitud de tutoría - ${subjectName}`,
        html: `
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
        `
    };

    return transporter.sendMail(mailOptions);
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

    const mailOptions = {
        from: `"Pilas! Tutorías" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `Propuesta de Reprogramación de Tutoría - ${subjectName}`,
        html: `
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
        `
    };

    return transporter.sendMail(mailOptions);
};
