import express from 'express';
import multer from 'multer';
import {
    getStats,
    getUsers,
    updateUserStatus,
    deleteUser,
    getApplications,
    createApplication,
    approveApplication,
    rejectApplication,
    getTickets,
    resolveTicket,
    getBadges,
    createBadge,
    updateBadge,
    deleteBadge
} from '../controllers/adminController.js';

const router = express.Router();

// Estadísticas del sistema
router.get('/stats', getStats);

// Gestión de usuarios
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Solicitudes a tutores
router.get('/tutors/applications', getApplications);
router.post('/tutors/applications', createApplication);
router.put('/tutors/applications/:id/approve', approveApplication);
router.put('/tutors/applications/:id/reject', rejectApplication);

// Tickets de Soporte
router.get('/tickets', getTickets);
router.put('/tickets/:id/resolve', resolveTicket);

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Gestión de insignias (Gamificación)
router.get('/badges', getBadges);
router.post('/badges', upload.single('badge_image'), createBadge);
router.put('/badges/:id', upload.single('badge_image'), updateBadge);
router.delete('/badges/:id', deleteBadge);

export default router;
