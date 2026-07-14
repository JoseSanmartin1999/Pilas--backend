// backend/src/services/rewardService.js
import * as rewardRepository from '../repositories/rewardRepository.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import crypto from 'node:crypto';

/**
 * Canjea un cupón de recompensa, descontando espe_coins del usuario.
 */
export const redeemCoupon = async (userId, couponId, cost) => {
    if (!couponId || cost === undefined) {
        throw new ValidationError("Faltan campos obligatorios (couponId, cost).");
    }

    // 1. Obtener balance actual del usuario
    const currentCoins = await rewardRepository.getUserCoins(userId);
    if (currentCoins === null) {
        throw new NotFoundError("Usuario no encontrado.");
    }

    // 2. Verificar saldo
    if (currentCoins < cost) {
        throw new ValidationError(`Saldo insuficiente. Tienes ${currentCoins} ESPE-Coins pero necesitas ${cost}.`);
    }

    // 3. Descontar monedas
    const newCoins = currentCoins - cost;
    await rewardRepository.updateUserCoins(userId, newCoins);

    // 4. Generar código aleatorio único del cupón usando RNG criptográfico
    const couponCode = 'ESPE-COIN-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    return {
        couponCode,
        newCoins
    };
};
