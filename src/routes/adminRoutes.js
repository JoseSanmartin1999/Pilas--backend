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

const router = express.Router();

// Estadísticas del sistema
router.get('/stats', getStats);
router.get('/report', getReportData);

// Gestión de usuarios
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Gestión de carreras
router.get('/careers', getCareers);
router.post('/careers', createCareer);
router.put('/careers/:id', updateCareer);
router.delete('/careers/:id', deleteCareer);

// Gestión de materias
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

// Solicitudes a tutores
// Multer con memoryStorage para subir reporte académico (PDF, max 10MB)
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

router.post('/careers/:id/malla', applicationUpload.single('malla_pdf'), uploadCareerMalla);
router.get('/careers/:id/subjects', getCareerSubjects);

router.get('/tutors/applications', getApplications);
router.post('/tutors/applications', applicationUpload.single('academic_record'), createApplication);
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
