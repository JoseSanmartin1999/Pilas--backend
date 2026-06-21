import express from 'express';
import { getChatHistory } from '../services/chatService.js';
import { authenticateToken, verifyMentorshipParticipant } from '../middleware/authMiddleware.js';
import { validateMentorshipIdRouteParam } from '../middleware/validators.js';

const router = express.Router();

router.get('/:mentorshipId',
    authenticateToken,
    validateMentorshipIdRouteParam,
    verifyMentorshipParticipant,
    async (req, res) => {
        try {
            const { mentorshipId } = req.params;
            const history = await getChatHistory(mentorshipId);
            res.json(history);
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            res.status(500).json({ error: 'Error al obtener el historial de chat' });
        }
    }
);

export default router;
