// backend/src/routes/rewardRoutes.js
import express from 'express';
import { getRewards, getRewardsStatus, completeSurvey, claimReward, redeemCoupon } from '../controllers/rewardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Proteger todas las rutas de recompensas
router.use(authenticateToken);

// Obtener catálogo de recompensas activas
router.get('/', getRewards);

// Obtener estado de requisitos para el sorteo
router.get('/status', getRewardsStatus);

// Registrar encuesta completada
router.post('/complete-survey', completeSurvey);

// Reclamar recompensa (sorteo u otras)
router.post('/claim', claimReward);

// Mantener anterior por compatibilidad
router.post('/redeem', redeemCoupon);

export default router;
