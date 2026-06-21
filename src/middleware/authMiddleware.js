import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'una_clave_secreta_muy_larga_para_pilas_2026_mic';

/**
 * Middleware para autenticar el token JWT provisto en las cabeceras HTTP.
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token de autenticación.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Error al verificar JWT:', err.message);
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        req.user = user; // { id, email, role }
        next();
    });
};

/**
 * Middleware para requerir roles específicos.
 * @param {Array<string>} roles - Roles autorizados (e.g., ['ADMIN', 'MENTOR'])
 */
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción.' });
        }
        next();
    };
};

/**
 * Middleware para validar que el usuario que realiza la petición es el mismo
 * que el perfil que se intenta modificar (o que es un ADMIN).
 */
export const verifyProfileOwner = (req, res, next) => {
    const { id: profileUserId } = req.params;
    if (!req.user) {
        return res.status(401).json({ error: 'No autenticado.' });
    }

    if (String(req.user.id) !== String(profileUserId) && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'No tienes permiso para modificar o acceder a este recurso de otro usuario.' });
    }
    next();
};

/**
 * Middleware para validar que el usuario autenticado pertenece a la tutoría
 * asociada a la petición.
 */
export const verifyMentorshipParticipant = async (req, res, next) => {
    const mentorshipId = req.params.mentorshipId || req.params.id || req.body.mentorshipId;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'No autenticado.' });
    }

    if (!mentorshipId) {
        return res.status(400).json({ error: 'ID de tutoría no especificado.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id, mentor_id, apprentice_id FROM Mentorships WHERE id = ? AND is_deleted = 0',
            [mentorshipId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Tutoría no encontrada o eliminada.' });
        }

        const mentorship = rows[0];
        if (req.user.role === 'ADMIN') {
            req.mentorship = mentorship;
            return next();
        }

        if (String(mentorship.mentor_id) !== String(userId) && String(mentorship.apprentice_id) !== String(userId)) {
            return res.status(403).json({ error: 'No tienes acceso a esta tutoría.' });
        }

        req.mentorship = mentorship;
        next();
    } catch (error) {
        console.error('Error en verifyMentorshipParticipant:', error);
        return res.status(500).json({ error: 'Error interno del servidor al verificar acceso.' });
    }
};
