import express from 'express';
import multer from 'multer';
import {
    getStats,
    getUsers,
    updateUserStatus,
    updateUserRole,
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
    deleteBadge,
    getReportData,
    getCareers,
    createCareer,
    updateCareer,
    deleteCareer,
    uploadCareerMalla,
    getCareerSubjects,
    createSubject,
    updateSubject,
    deleteSubject
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
    validateAdminUserIdParam,
    validateUpdateUserStatus,
    validateUpdateUserRole,
    validateCreateBadge,
    validateCreateCareer,
    validateCreateSubject,
    validateCreateApplication
} from '../middleware/validators.js';

const router = express.Router();

// ==========================================
// RUTAS COMPARTIDAS / PÚBLICAS
// ==========================================

// Listar carreras (se necesita para el registro de nuevos usuarios)
router.get('/careers', getCareers);

// ==========================================
// REQUERIR AUTENTICACIÓN A PARTIR DE AQUÍ
// ==========================================
router.use(authenticateToken);

// Cargar insignias para la tienda
router.get('/badges', getBadges);

// Postulaciones a tutor (el usuario puede subir y ver su propia postulación)
router.get('/tutors/applications', getApplications);
const applicationUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF.'), false);
        }
    }
});
router.post('/tutors/applications', applicationUpload.single('academic_record'), validateCreateApplication, createApplication);

// ==========================================
// REQUERIR ROL DE ADMINISTRADOR A PARTIR DE AQUÍ
// ==========================================
router.use(requireRole(['ADMIN']));

// Estadísticas del sistema
router.get('/stats', getStats);
router.get('/report', getReportData);

// Gestión de usuarios
router.get('/users', getUsers);
router.put('/users/:id/status', validateUpdateUserStatus, updateUserStatus);
router.put('/users/:id/role', validateUpdateUserRole, updateUserRole);
router.delete('/users/:id', validateAdminUserIdParam, deleteUser);

// Gestión de carreras (además de listar)
router.post('/careers', validateCreateCareer, createCareer);
router.put('/careers/:id', validateCreateCareer, updateCareer);
router.delete('/careers/:id', validateAdminUserIdParam, deleteCareer);

// Gestión de materias
router.post('/subjects', validateCreateSubject, createSubject);
router.put('/subjects/:id', validateCreateSubject, updateSubject);
router.delete('/subjects/:id', validateAdminUserIdParam, deleteSubject);

router.post('/careers/:id/malla', applicationUpload.single('malla_pdf'), uploadCareerMalla);
router.get('/careers/:id/subjects', getCareerSubjects);

// Aprobar/Rechazar solicitudes
router.put('/tutors/applications/:id/approve', validateAdminUserIdParam, approveApplication);
router.put('/tutors/applications/:id/reject', validateAdminUserIdParam, rejectApplication);

// Tickets de Soporte
router.get('/tickets', getTickets);
router.put('/tickets/:id/resolve', validateAdminUserIdParam, resolveTicket);

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Gestión de insignias (Gamificación)
router.post('/badges', upload.single('badge_image'), validateCreateBadge, createBadge);
router.put('/badges/:id', upload.single('badge_image'), validateCreateBadge, updateBadge);
router.delete('/badges/:id', validateAdminUserIdParam, deleteBadge);

export default router;
