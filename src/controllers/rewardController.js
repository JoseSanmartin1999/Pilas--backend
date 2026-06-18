// backend/src/controllers/rewardController.js
import db from '../config/db.js';

/**
 * Canjea un cupón de recompensa, descontando espe_coins del usuario.
 */
export const redeemCoupon = async (req, res) => {
    const { userId, couponId, cost } = req.body;

    if (!userId || !couponId || cost === undefined) {
        return res.status(400).json({ error: "Faltan campos obligatorios (userId, couponId, cost)." });
    }

    try {
        // 1. Obtener balance actual del usuario
        const [rows] = await db.query("SELECT espe_coins FROM Users WHERE id = ?", [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }

        const currentCoins = rows[0].espe_coins || 0;

        // 2. Verificar saldo
        if (currentCoins < cost) {
            return res.status(400).json({ error: `Saldo insuficiente. Tienes ${currentCoins} ESPE-Coins pero necesitas ${cost}.` });
        }

        // 3. Descontar monedas
        const newCoins = currentCoins - cost;
        await db.query("UPDATE Users SET espe_coins = ? WHERE id = ?", [newCoins, userId]);

        // 4. Generar código aleatorio único del cupón
        const couponCode = 'ESPE-COIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        res.json({
            message: "Cupón canjeado exitosamente.",
            code: couponCode,
            espeCoins: newCoins
        });
    } catch (error) {
        console.error("Error al canjear cupón:", error);
        res.status(500).json({ error: "No se pudo procesar el canje del cupón." });
    }
};
