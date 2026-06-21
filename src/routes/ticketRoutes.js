import express from 'express';
import { createTicket, getUserTickets } from '../controllers/ticketController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateCreateTicket } from '../middleware/validators.js';

const router = express.Router();

// Proteger todas las rutas de tickets
router.use(authenticateToken);

// Crear un ticket
router.post('/', validateCreateTicket, createTicket);

// Listar tickets del propio usuario
router.get('/user/:userId', getUserTickets);

export default router;
