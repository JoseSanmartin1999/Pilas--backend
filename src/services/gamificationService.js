// backend/src/services/gamificationService.js
import db from '../config/db.js';
import redis from '../config/redis.js';

/**
 * Migración segura: asegura que existan las columnas necesarias en Profiles.
 * Se ejecuta en el primer checkAndAwardBadges si no existen.
 */
let columnsMigrated = false;
const ensureStreakColumns = async () => {
    if (columnsMigrated) return;
    try {
        await db.query(`ALTER TABLE Profiles ADD COLUMN IF NOT EXISTS login_streak INT DEFAULT 0`);
        await db.query(`ALTER TABLE Profiles ADD COLUMN IF NOT EXISTS last_login_date DATE DEFAULT NULL`);
        columnsMigrated = true;
    } catch (err) {
        // TiDB puede no soportar IF NOT EXISTS, usamos try/catch por columna
        try { await db.query(`ALTER TABLE Profiles ADD COLUMN login_streak INT DEFAULT 0`); } catch (_) {}
        try { await db.query(`ALTER TABLE Profiles ADD COLUMN last_login_date DATE DEFAULT NULL`); } catch (_) {}
        columnsMigrated = true;
    }
};

/**
 * Otorga XP y ESPE-Coins a un usuario, calcula si sube de nivel y actualiza el Leaderboard.
 */
export const awardXPAndCoins = async (userId, xpAmount, coinsAmount) => {
    try {
        // 1. Obtener datos actuales del usuario
        const [rows] = await db.query(`
            SELECT p.xp, p.level, p.espe_coins, r.name as role 
            FROM Users u
            LEFT JOIN Profiles p ON u.id = p.user_id
            LEFT JOIN User_Roles ur ON u.id = ur.user_id
            LEFT JOIN Roles r ON ur.role_id = r.id
            WHERE u.id = ?
        `, [userId]);
        if (rows.length === 0) return null;
        const user = rows[0];

        const newXp = Math.max(0, (user.xp || 0) + xpAmount);
        const newCoins = Math.max(0, (user.espe_coins || 0) + coinsAmount);

        // Lógica de nivel: Cada 500 XP otorga un nivel (Nivel = floor(XP / 500) + 1)
        const newLevel = Math.floor(newXp / 500) + 1;
        const levelUp = newLevel > (user.level || 1);

        // 2. Actualizar en la base de datos
        await db.query(
            "UPDATE Profiles SET xp = ?, level = ?, espe_coins = ? WHERE user_id = ?",
            [newXp, newLevel, newCoins, userId]
        );

        // 3. Sincronizar en Redis para el Leaderboard (solo para tutores en el ranking general)
        if (user.role === 'MENTOR') {
            try {
                await redis.zadd('mentor_ranking', newXp, userId);
            } catch (redisError) {
                console.error("Advertencia: No se pudo actualizar el ranking en Redis:", redisError.message);
            }
        }

        return {
            levelUp,
            newLevel,
            xp: newXp,
            espe_coins: newCoins
        };
    } catch (error) {
        console.error(`Error en awardXPAndCoins para usuario ${userId}:`, error);
        throw error;
    }
};

/**
 * Evalúa el progreso del usuario contra todas las insignias no desbloqueadas y las otorga si aplica.
 * Retorna la lista de insignias recién ganadas.
 */
export const checkAndAwardBadges = async (userId) => {
    try {
        await ensureStreakColumns();

        // 1. Obtener estadísticas del usuario en la base de datos
        
        // Tutorías completadas como mentor
        const [mentorRows] = await db.query(
            "SELECT COUNT(*) as count FROM Mentorships WHERE mentor_id = ? AND status = 'COMPLETADA' AND is_deleted = 0",
            [userId]
        );
        const totalGiven = mentorRows[0].count;

        // Tutorías completadas como aprendiz
        const [apprenticeRows] = await db.query(
            "SELECT COUNT(*) as count FROM Mentorships WHERE apprentice_id = ? AND status = 'COMPLETADA' AND is_deleted = 0",
            [userId]
        );
        const totalReceived = apprenticeRows[0].count;

        // Total tutorías completadas (de cualquier rol)
        const totalAny = totalGiven + totalReceived;

        // Tutorías con calificación perfecta (5 estrellas) como mentor
        const [perfectRows] = await db.query(
            "SELECT COUNT(*) as count FROM Mentorships WHERE mentor_id = ? AND status = 'COMPLETADA' AND rating = 5 AND is_deleted = 0",
            [userId]
        );
        const totalPerfect = perfectRows[0].count;

        // Tutorías con calificación alta (4 o 5 estrellas) como mentor — para high_rating_streak
        const [highRatingRows] = await db.query(
            "SELECT COUNT(*) as count FROM Mentorships WHERE mentor_id = ? AND status = 'COMPLETADA' AND rating >= 4 AND is_deleted = 0",
            [userId]
        );
        const totalHighRating = highRatingRows[0].count;

        // Obtener datos del usuario incluyendo login_streak
        const [userRows] = await db.query("SELECT xp, bio, profile_photo_url, login_streak FROM Profiles WHERE user_id = ?", [userId]);
        if (userRows.length === 0) return [];
        const user = userRows[0];
        const currentXp = user.xp || 0;
        const currentLoginStreak = user.login_streak || 0;

        // Criterio de perfil configurado: tiene al menos biografía establecida
        const profileConfigured = (user.bio && user.bio.trim() !== '') ? 1 : 0;

        const stats = {
            mentorships_given: totalGiven,
            mentorships_received: totalReceived,
            mentorships_any: totalAny,
            perfect_ratings: totalPerfect,
            xp_earned: currentXp,
            first_login: 1,
            profile_configured: profileConfigured,
            consecutive_logins: currentLoginStreak,   // Días seguidos de inicio de sesión
            high_rating_streak: totalHighRating        // Tutorías con calificación ≥4★
        };

        // 2. Obtener todas las insignias del catálogo
        const [badges] = await db.query("SELECT * FROM Badges");

        // 3. Obtener insignias ya desbloqueadas por el usuario para no duplicarlas
        const [unlockedRows] = await db.query("SELECT badge_id FROM User_Badges WHERE user_id = ?", [userId]);
        const unlockedIds = new Set(unlockedRows.map(r => r.badge_id));

        const newlyUnlocked = [];

        // 4. Evaluar insignias
        for (const badge of badges) {
            if (unlockedIds.has(badge.id)) continue;

            let criteriaObj;
            try {
                criteriaObj = typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria;
            } catch (e) {
                console.error(`Error al parsear el criterio de la insignia ${badge.id}:`, e);
                continue;
            }

            if (!criteriaObj || !criteriaObj.type) continue;

            const userVal = stats[criteriaObj.type];
            if (userVal === undefined) continue;

            if (userVal >= criteriaObj.value) {
                // El usuario cumple con el criterio de desbloqueo!
                try {
                    // Registrar en User_Badges
                    await db.query(
                        "INSERT INTO User_Badges (user_id, badge_id) VALUES (?, ?)",
                        [userId, badge.id]
                    );

                    // Otorgar las recompensas de la insignia
                    const xpReward = badge.xp_reward || 0;
                    const coinsReward = badge.coins_reward || 0;
                    let levelUpResult = null;

                    if (xpReward > 0 || coinsReward > 0) {
                        levelUpResult = await awardXPAndCoins(userId, xpReward, coinsReward);
                    }

                    newlyUnlocked.push({
                        id: badge.id,
                        name: badge.name,
                        image_url: badge.image_url,
                        icon: badge.image_url, // Compatibilidad con el frontend que espera .icon
                        xp_reward: xpReward,
                        coins_reward: coinsReward,
                        levelUp: levelUpResult ? levelUpResult.levelUp : false,
                        newLevel: levelUpResult ? levelUpResult.newLevel : null
                    });
                } catch (err) {
                    console.error(`Error otorgando la insignia ${badge.id} al usuario ${userId}:`, err.message);
                }
            }
        }

        return newlyUnlocked;
    } catch (error) {
        console.error(`Error en checkAndAwardBadges para usuario ${userId}:`, error);
        throw error;
    }
};

/**
 * Obtiene el Top 10 de mentores para el Leaderboard.
 * Primero intenta leer de Redis y, si falla o está vacío, hace un fallback directo a la BD.
 */
export const getTopMentors = async () => {
    try {
        const top = await redis.zrevrange('mentor_ranking', 0, 9, 'WITHSCORES');
        if (top && top.length > 0) {
            const formatted = [];
            for (let i = 0; i < top.length; i += 2) {
                const userId = top[i];
                const score = parseFloat(top[i+1]);
                
                const [userRows] = await db.query(`
                    SELECT u.id, p.full_name, p.profile_photo_url, p.career, p.current_semester 
                    FROM Users u
                    JOIN Profiles p ON u.id = p.user_id
                    WHERE u.id = ?
                `, [userId]);
                
                if (userRows.length > 0) {
                    formatted.push({
                        ...userRows[0],
                        score: score, // total xp como puntaje
                        xp: score
                    });
                }
            }
            return formatted;
        }
    } catch (e) {
        console.error("Error al obtener Leaderboard desde Redis, usando fallback de BD:", e.message);
    }

    // Fallback: Consulta directa a la base de datos
    const [dbRows] = await db.query(`
        SELECT u.id, p.full_name, p.profile_photo_url, p.career, p.current_semester, p.xp as score, p.xp 
        FROM Users u
        JOIN Profiles p ON u.id = p.user_id
        JOIN User_Roles ur ON u.id = ur.user_id
        JOIN Roles r ON ur.role_id = r.id
        WHERE r.name = 'MENTOR'
        ORDER BY p.xp DESC
        LIMIT 10
    `);
    return dbRows;
};
/**
 * Actualiza el conteo de inicios de sesion consecutivos (login_streak).
 * - Si el ultimo login fue ayer, incrementa streak
 * - Si fue hoy, no cambia (ya se cont�)
 * - Si fue hace 2+ dias, reinicia streak a 1
 */
export const updateLoginStreak = async (userId) => {
    try {
        await ensureStreakColumns();
        const [rows] = await db.query('SELECT login_streak, last_login_date FROM Profiles WHERE user_id = ?', [userId]);
        if (rows.length === 0) return;
        
        // Obtener el string YYYY-MM-DD en America/Guayaquil (-05:00) para hoy
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Guayaquil' });
        
        let lastLoginStr = null;
        if (rows[0].last_login_date) {
            const lld = rows[0].last_login_date;
            if (lld instanceof Date) {
                lastLoginStr = lld.toLocaleDateString('sv-SE', { timeZone: 'America/Guayaquil' });
            } else {
                lastLoginStr = String(lld).split('T')[0];
            }
        }
        
        const currentStreak = rows[0].login_streak || 0;
        let newStreak = 1;
        
        if (lastLoginStr) {
            const dateToday = new Date(todayStr + 'T00:00:00Z');
            const dateLast = new Date(lastLoginStr + 'T00:00:00Z');
            const diffDays = Math.round((dateToday - dateLast) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return; // Ya se inició sesión hoy, no cambia el streak
            if (diffDays === 1) {
                newStreak = currentStreak + 1; // Login consecutivo al día siguiente
            }
        }
        
        await db.query('UPDATE Profiles SET login_streak = ?, last_login_date = ? WHERE user_id = ?', [newStreak, todayStr, userId]);
    } catch (err) {
        console.error('Error actualizando login streak para usuario ' + userId + ':', err.message);
    }
};
