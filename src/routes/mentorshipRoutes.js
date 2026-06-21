import express from 'express';
import { createMentorship, getMentorshipsByUser, updateMentorship, getNotificationCounts, markAsRead, deleteMentorship, closeMentorship, rateMentorship } from '../controllers/mentorshipController.js';
import { authenticateToken, verifyMentorshipParticipant } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas de tutorías requieren token JWT
router.use(authenticateToken);

// POST /api/mentorships - Crear una tutoría
router.post('/', createMentorship);

// GET /api/mentorships/user/:userId - Lista de tutorías de un usuario
router.get('/user/:userId', getMentorshipsByUser);

// GET /api/mentorships/counts/:userId - Contador de notificaciones
router.get('/counts/:userId', getNotificationCounts);

// Rutas individuales que requieren ser participante de la tutoría
router.put('/:id/close', verifyMentorshipParticipant, closeMentorship);
router.put('/:id/rate', verifyMentorshipParticipant, rateMentorship);
router.put('/:id', verifyMentorshipParticipant, updateMentorship);
router.patch('/:id/read', verifyMentorshipParticipant, markAsRead);
router.delete('/:id', verifyMentorshipParticipant, deleteMentorship);

export default router;
