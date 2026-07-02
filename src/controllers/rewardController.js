// backend/src/controllers/rewardController.js
import * as rewardService from '../services/rewardService.js';

/**
 * Canjea un cupón de recompensa, descontando espe_coins del usuario.
 */
export const redeemCoupon = async (req, res, next) => {
    const { couponId, cost } = req.body;
    const userId = req.user.id;

    try {
        const { couponCode, newCoins } = await rewardService.redeemCoupon(userId, couponId, cost);

        res.json({
            message: "Cupón canjeado exitosamente.",
            code: couponCode,
            espeCoins: newCoins
        });
    } catch (error) {
        next(error);
    }
};
