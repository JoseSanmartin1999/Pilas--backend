import db from '../config/db.js';
import crypto from 'node:crypto';

// 1. Obtener todas las recompensas activas
export const getRewards = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            "SELECT * FROM Rewards WHERE is_active = 1 ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

// 2. Obtener estado de cumplimiento de los requisitos del sorteo
export const getRewardsStatus = async (req, res, next) => {
    const userId = req.user.id;
    try {
        // a. Iniciar sesión por primera vez -> siempre true porque está logueado
        const firstLogin = true;

        // b. Crear o participar de una tutoría (mentor_id o apprentice_id)
        const [mentorships] = await db.query(
            `SELECT COUNT(*) as count 
             FROM Mentorships m
             JOIN Subjects s ON m.subject_id = s.id
             WHERE (m.mentor_id = ? OR m.apprentice_id = ?) 
               AND m.is_deleted = 0 
               AND s.name != 'Pilas! Comunidad'`,
            [userId, userId]
        );
        const hasTutoring = mentorships[0].count > 0;

        // c. Llenar la encuesta
        const [profile] = await db.query(
            "SELECT survey_completed FROM Profiles WHERE user_id = ?",
            [userId]
        );
        const surveyCompleted = profile.length > 0 ? !!profile[0].survey_completed : false;

        // d. Verificar si ya reclamó el boleto del sorteo especial
        const [specialRewardClaims] = await db.query(
            "SELECT COUNT(*) as count FROM User_Rewards ur JOIN Rewards r ON ur.reward_id = r.id WHERE ur.user_id = ? AND r.is_special = 1",
            [userId]
        );
        const specialClaimed = specialRewardClaims[0].count > 0;

        res.json({
            firstLogin,
            hasTutoring,
            surveyCompleted,
            specialClaimed
        });
    } catch (error) {
        next(error);
    }
};

// 3. Registrar encuesta completada
export const completeSurvey = async (req, res, next) => {
    const userId = req.user.id;
    try {
        await db.query(
            "UPDATE Profiles SET survey_completed = 1 WHERE user_id = ?",
            [userId]
        );
        res.json({ message: "Encuesta marcada como completada.", surveyCompleted: true });
    } catch (error) {
        next(error);
    }
};

// 4. Canjear / Reclamar recompensa
export const claimReward = async (req, res, next) => {
    const userId = req.user.id;
    const { rewardId, selectedOption, contactPhone } = req.body;

    if (!rewardId) {
        return res.status(400).json({ error: "Falta el ID de la recompensa." });
    }

    try {
        // Obtener datos de la recompensa
        const [rewards] = await db.query("SELECT * FROM Rewards WHERE id = ?", [rewardId]);
        if (rewards.length === 0) {
            return res.status(404).json({ error: "Recompensa no encontrada." });
        }
        const reward = rewards[0];

        if (!reward.is_active) {
            return res.status(400).json({ error: "Esta recompensa no está activa." });
        }

        // Obtener saldo del usuario
        const [userProfile] = await db.query("SELECT espe_coins, survey_completed FROM Profiles WHERE user_id = ?", [userId]);
        if (userProfile.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        const coins = userProfile[0].espe_coins || 0;

        // Verificar si ya reclamó esta recompensa
        const [existingClaims] = await db.query(
            "SELECT id FROM User_Rewards WHERE user_id = ? AND reward_id = ?",
            [userId, rewardId]
        );
        if (existingClaims.length > 0) {
            return res.status(400).json({ error: "Ya has reclamado esta recompensa." });
        }

        // Si es especial (raffle ticket), verificar requisitos
        if (reward.is_special) {
            // Verificar tutoría
            const [mentorships] = await db.query(
                `SELECT COUNT(*) as count 
                 FROM Mentorships m
                 JOIN Subjects s ON m.subject_id = s.id
                 WHERE (m.mentor_id = ? OR m.apprentice_id = ?) 
                   AND m.is_deleted = 0 
                   AND s.name != 'Pilas! Comunidad'`,
                [userId, userId]
            );
            if (mentorships[0].count === 0) {
                return res.status(400).json({ error: "Debes crear o participar en al menos una tutoría para reclamar esta recompensa." });
            }

            // Verificar encuesta
            if (!userProfile[0].survey_completed) {
                return res.status(400).json({ error: "Debes llenar la encuesta para reclamar esta recompensa." });
            }

            // Validar campos obligatorios del sorteo
            if (!selectedOption || !contactPhone) {
                return res.status(400).json({ error: "Debes seleccionar un premio y proveer un teléfono de contacto." });
            }
        }

        // Verificar si tiene saldo suficiente
        if (coins < reward.cost) {
            return res.status(400).json({ error: `Saldo insuficiente. Tienes ${coins} ESPE-Coins pero necesitas ${reward.cost}.` });
        }

        // Realizar descuento y registro
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Descontar monedas
            const newCoins = coins - reward.cost;
            await connection.query("UPDATE Profiles SET espe_coins = ? WHERE user_id = ?", [newCoins, userId]);

            // Registrar reclamo
            await connection.query(
                "INSERT INTO User_Rewards (user_id, reward_id, selected_option, contact_phone) VALUES (?, ?, ?, ?)",
                [userId, rewardId, selectedOption || null, contactPhone || null]
            );

            await connection.commit();

            res.json({
                message: "Recompensa reclamada exitosamente.",
                newCoins
            });
        } catch (trxErr) {
            await connection.rollback();
            throw trxErr;
        } finally {
            connection.release();
        }
    } catch (error) {
        next(error);
    }
};

// Mantener compatibilidad con el endpoint anterior si hiciera falta
export const redeemCoupon = async (req, res, next) => {
    const { cost } = req.body;
    const userId = req.user.id;
    try {
        const [userProfile] = await db.query("SELECT espe_coins FROM Profiles WHERE user_id = ?", [userId]);
        const coins = userProfile[0]?.espe_coins || 0;
        if (coins < cost) {
            return res.status(400).json({ error: "Saldo insuficiente." });
        }

        const newCoins = coins - cost;
        await db.query("UPDATE Profiles SET espe_coins = ? WHERE user_id = ?", [newCoins, userId]);
        const couponCode = 'ESPE-COIN-' + crypto.randomBytes(3).toString('hex').toUpperCase();

        res.json({
            message: "Cupón canjeado exitosamente.",
            code: couponCode,
            espeCoins: newCoins
        });
    } catch (error) {
        next(error);
    }
};
