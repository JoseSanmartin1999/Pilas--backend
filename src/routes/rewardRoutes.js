// backend/src/routes/rewardRoutes.js
import express from 'express';
import { redeemCoupon } from '../controllers/rewardController.js';

const router = express.Router();

// Canjear recompensa/cupón
router.post('/redeem', redeemCoupon);

export default router;
