import express from 'express';
import { createTicket, getUserTickets } from '../controllers/ticketController.js';

const router = express.Router();

// Crear un ticket
router.post('/', createTicket);

// Listar tickets del propio usuario
router.get('/user/:userId', getUserTickets);

export default router;
