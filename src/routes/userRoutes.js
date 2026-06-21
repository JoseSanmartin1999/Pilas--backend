import express from 'express';
import { getUserProfile, updateUserProfile, getAllMentors, upgradeToMentor, updateFeaturedBadges } from '../controllers/userController.js';
import upload from '../middleware/upload.js'; // Middleware para procesar la imagen

const router = express.Router();

// Obtener perfil (RF#005)
router.get('/profile/:id', getUserProfile);

// Actualizar perfil (RF#003) - Se usa upload.single para la imagen de perfil lo cual si se cumple
router.put('/profile/:id', upload.single('foto_perfil'), updateUserProfile);

// Destacar logros/insignias (hasta 4)
router.put('/profile/:id/featured-badges', updateFeaturedBadges);

// Solicitar cambio a Tutor (Ascenso de rol)
router.put('/profile/:id/upgrade', upgradeToMentor);

router.get('/mentors', getAllMentors);

export default router;
