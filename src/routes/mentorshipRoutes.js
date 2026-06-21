import express from 'express';
import { createMentorship, getMentorshipsByUser, updateMentorship, getNotificationCounts, markAsRead, deleteMentorship, closeMentorship, rateMentorship } from '../controllers/mentorshipController.js';
import { authenticateToken, verifyMentorshipParticipant } from '../middleware/authMiddleware.js';
import {
    validateCreateMentorship,
    validateMentorshipIdParam,
    validateRateMentorship
} from '../middleware/validators.js';

const router = express.Router();

// Todas las rutas de tutorías requieren token JWT
router.use(authenticateToken);

// POST /api/mentorships - Crear una tutoría
router.post('/', validateCreateMentorship, createMentorship);

// GET /api/mentorships/user/:userId - Lista de tutorías de un usuario
router.get('/user/:userId', getMentorshipsByUser);

// GET /api/mentorships/counts/:userId - Contador de notificaciones
router.get('/counts/:userId', getNotificationCounts);

// Rutas individuales que requieren ser participante de la tutoría
router.put('/:id/close', validateMentorshipIdParam, verifyMentorshipParticipant, closeMentorship);
router.put('/:id/rate', validateRateMentorship, verifyMentorshipParticipant, rateMentorship);
router.put('/:id', validateMentorshipIdParam, verifyMentorshipParticipant, updateMentorship);
router.patch('/:id/read', validateMentorshipIdParam, verifyMentorshipParticipant, markAsRead);
router.delete('/:id', validateMentorshipIdParam, verifyMentorshipParticipant, deleteMentorship);

export default router;
