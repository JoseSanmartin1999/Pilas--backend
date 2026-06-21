// backend/src/routes/rewardRoutes.js
import express from 'express';
import { redeemCoupon } from '../controllers/rewardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Proteger todas las rutas de recompensas
router.use(authenticateToken);

// Canjear recompensa/cupón
router.post('/redeem', redeemCoupon);

export default router;
