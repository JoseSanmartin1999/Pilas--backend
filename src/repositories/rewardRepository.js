// backend/src/repositories/rewardRepository.js
import db from '../config/db.js';

export const getUserCoins = async (userId) => {
    const [rows] = await db.query("SELECT espe_coins FROM Profiles WHERE user_id = ?", [userId]);
    if (rows.length === 0) return null;
    return rows[0].espe_coins !== undefined && rows[0].espe_coins !== null ? rows[0].espe_coins : 0;
};

export const updateUserCoins = async (userId, newCoins) => {
    await db.query("UPDATE Profiles SET espe_coins = ? WHERE user_id = ?", [newCoins, userId]);
};
