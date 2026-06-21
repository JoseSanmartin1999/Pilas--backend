import express from 'express';
import { getUserProfile, updateUserProfile, getAllMentors, upgradeToMentor, updateFeaturedBadges } from '../controllers/userController.js';
import upload from '../middleware/upload.js';
import { authenticateToken, verifyProfileOwner } from '../middleware/authMiddleware.js';

const router = express.Router();

// Obtener perfil - requiere estar autenticado
router.get('/profile/:id', authenticateToken, getUserProfile);

// Actualizar perfil - requiere ser el propietario
router.put('/profile/:id', authenticateToken, verifyProfileOwner, upload.single('foto_perfil'), updateUserProfile);

// Destacar logros/insignias - requiere ser el propietario
router.put('/profile/:id/featured-badges', authenticateToken, verifyProfileOwner, updateFeaturedBadges);

// Solicitar cambio a Tutor - requiere ser el propietario
router.put('/profile/:id/upgrade', authenticateToken, verifyProfileOwner, upgradeToMentor);

// Obtener todos los mentores - requiere estar autenticado
router.get('/mentors', authenticateToken, getAllMentors);

export default router;
