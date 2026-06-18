import db from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import { checkAndAwardBadges } from '../services/gamificationService.js';

// Datos estáticos (Mocks) mientras se implementan las tablas de lógica de negocio
const DEFAULT_SCORE = 4.5;
const DEFAULT_BADGES = [
    { name: 'Primeros Pasos', image_url: 'https://cdn-icons-png.flaticon.com/512/3585/3585145.png' }
];



export const getUserProfile = async (req, res) => {
    const { id: userId } = req.params;
    try {
        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        const userProfile = await enrichUserProfileData(user);
        return res.json(userProfile);
    } catch (error) {
        console.error(`Error al obtener perfil del usuario con ID ${userId}:`, error);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
};

/**
 * Actualiza la información del perfil del usuario (RF#003)
 */
export const updateUserProfile = async (req, res) => {
    const { id } = req.params;
    const { bio, current_semester } = req.body;
    let fotoUrl = req.body.profile_photo_url;

    // Las materias llegan como string JSON desde FormData si es que se envían
    let materias = [];
    if (req.body.materias) {
        try {
            materias = JSON.parse(req.body.materias);
        } catch (e) {
            materias = [];
        }
    }

    try {
        if (req.file) {
            fotoUrl = req.file.path;
        } else if (fotoUrl === undefined || fotoUrl === null) {
            const [currentUserRows] = await db.query('SELECT profile_photo_url FROM Profiles WHERE user_id = ?', [id]);
            if (currentUserRows.length > 0) {
                fotoUrl = currentUserRows[0].profile_photo_url;
            }
        }

        const query = 'UPDATE Profiles SET bio = ?, current_semester = ?, profile_photo_url = ? WHERE user_id = ?';
        await db.query(query, [bio, current_semester, fotoUrl, id]);

        // Actualizar Mentor_Subjects
        if (materias.length > 0) {
            const deleteQuery = 'DELETE FROM Mentor_Subjects WHERE mentor_id = ?';
            await db.query(deleteQuery, [id]);

            const insertValues = materias.map(subjectId => [id, subjectId]);
            const insertQuery = 'INSERT INTO Mentor_Subjects (mentor_id, subject_id) VALUES ?';
            // Usamos la sintaxis doble array [[]] para el bulk insert de mysql2
            await db.query(insertQuery, [insertValues]);
        } else if (req.body.materias !== undefined) {
            // Si envían un array vacío se eliminan
            const deleteQuery = 'DELETE FROM Mentor_Subjects WHERE mentor_id = ?';
            await db.query(deleteQuery, [id]);
        }

        // Obtener la información actualizada
        const updatedUser = await findUserById(id);

        // Evaluar logros de perfil configurado
        try {
            await checkAndAwardBadges(id);
        } catch (badgeErr) {
            console.error("Error al evaluar insignias durante actualización de perfil:", badgeErr.message);
        }

        res.json({
            message: "Perfil actualizado correctamente",
            fotoUrl,
            bio,
            current_semester,
            materias: updatedUser.materias
        });
    } catch (error) {
        console.error("Error en updateUserProfile:", error);
        res.status(500).json({ error: "No se pudo actualizar el perfil" });
    }
};

// --- Funciones Auxiliares ---

const findUserById = async (userId) => {
    const [users] = await db.query(`
        SELECT u.id, u.email, u.status, u.created_at,
               p.full_name, p.profile_photo_url, p.bio, p.institution, p.career, p.student_id, p.current_semester, p.xp, p.level, p.espe_coins,
               (SELECT r.name FROM Roles r JOIN User_Roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) AS role
        FROM Users u
        LEFT JOIN Profiles p ON u.id = p.user_id
        WHERE u.id = ?
    `, [userId]);
    if (users.length === 0) return null;
    const user = users[0];

    // Traer materias dictadas por este mentor como objetos
    try {
        const queryMaterias = `
            SELECT s.id, s.name 
            FROM Subjects s
            INNER JOIN Mentor_Subjects ms ON s.id = ms.subject_id
            WHERE ms.mentor_id = ?
        `;
        const [materiasRows] = await db.query(queryMaterias, [userId]);
        user.materias = materiasRows; // Array de { id, name }
    } catch (e) {
        console.error("Error obteniendo materias (puede no existir tabla):", e.message);
        user.materias = [];
    }

    // Aquí iría el query para traer las tutorías desde la tabla Mentorships
    // Por el momento se maneja en base a mocks abajo
    return user;
};

const enrichUserProfileData = async (user) => {
    let tutorias = [];
    try {
        const query = `
            SELECT 
                m.id, 
                m.scheduled_date, 
                s.name as materia, 
                m.modality, 
                m.meeting_place, 
                m.platform,
                m.meeting_link,
                m.zoom_code,
                m.zoom_password
            FROM Mentorships m
            JOIN Subjects s ON m.subject_id = s.id
            WHERE (m.mentor_id = ? OR m.apprentice_id = ?) 
              AND m.scheduled_date >= NOW() 
              AND m.is_deleted = 0 
              AND m.status NOT IN ('RECHAZADA', 'CANCELADA')
            ORDER BY m.scheduled_date ASC
        `;
        const [rows] = await db.query(query, [user.id, user.id]);
        tutorias = rows;
    } catch (e) {
        console.error("Error fetching upcoming mentorships for profile:", e.message);
    }

    // Calcular score dinámico
    let score = 5.0;
    let comments = [];
    try {
        const [ratingRows] = await db.query(
            "SELECT AVG(rating) as avg_rating FROM Mentorships WHERE mentor_id = ? AND status = 'COMPLETADA' AND is_rated = 1 AND is_deleted = 0",
            [user.id]
        );
        if (ratingRows.length > 0 && ratingRows[0].avg_rating) {
            score = parseFloat(Number(ratingRows[0].avg_rating).toFixed(1));
        }

        // Obtener comentarios de estudiantes
        const [commentRows] = await db.query(
            `SELECT m.rating, m.rating_comment, m.closed_at, p.full_name as apprentice_name 
             FROM Mentorships m
             JOIN Users u ON m.apprentice_id = u.id
             LEFT JOIN Profiles p ON u.id = p.user_id
             WHERE m.mentor_id = ? AND m.status = 'COMPLETADA' AND m.is_rated = 1 AND m.rating_comment IS NOT NULL AND m.rating_comment != '' AND m.is_deleted = 0
             ORDER BY m.closed_at DESC
             LIMIT 5`,
            [user.id]
        );
        comments = commentRows;
    } catch (e) {
        console.error("Error calculating dynamic score and comments:", e.message);
    }

    // Obtener insignias reales del usuario
    let userBadges = [];
    try {
        const queryBadges = `
            SELECT b.id, b.name, b.image_url, b.criteria, b.xp_reward, b.coins_reward, ub.earned_at
            FROM Badges b
            INNER JOIN User_Badges ub ON b.id = ub.badge_id
            WHERE ub.user_id = ?
        `;
        const [badgeRows] = await db.query(queryBadges, [user.id]);
        userBadges = badgeRows.map(b => ({
            ...b,
            icon: b.image_url // Para compatibilidad con el frontend
        }));
    } catch (e) {
        console.error("Error fetching user badges from DB:", e.message);
    }

    return {
        ...user,
        score,
        badges: userBadges,
        tutorias,
        comments
    };
};

export const getAllMentors = async (req, res) => {
    try {
        const { exclude } = req.query;
        let query = `
            SELECT u.id, p.full_name AS nombre, '' AS apellidos, p.career, p.profile_photo_url, p.current_semester,
            GROUP_CONCAT(s.name SEPARATOR ', ') AS materias_nombres,
            (SELECT COALESCE(AVG(m.rating), 5.0) FROM Mentorships m WHERE m.mentor_id = u.id AND m.status = 'COMPLETADA' AND m.is_rated = 1 AND m.is_deleted = 0) AS score
            FROM Users u
            JOIN Profiles p ON u.id = p.user_id
            JOIN User_Roles ur ON u.id = ur.user_id
            JOIN Roles r ON ur.role_id = r.id
            LEFT JOIN Mentor_Subjects ms ON u.id = ms.mentor_id
            LEFT JOIN Subjects s ON ms.subject_id = s.id
            WHERE r.name = 'MENTOR'
        `;
        const queryParams = [];

        if (exclude) {
            query += ` AND u.id != ? `;
            queryParams.push(exclude);
        }

        query += ` GROUP BY u.id`;

        const [mentors] = await db.query(query, queryParams);

        const formattedMentors = mentors.map(m => ({
            ...m,
            score: parseFloat(Number(m.score).toFixed(1)),
            materias: m.materias_nombres ? m.materias_nombres.split(', ') : []
        }));

        res.json(formattedMentors);
    } catch (error) {
        console.error("Error al obtener mentores:", error);
        res.status(500).json({ error: "Error al obtener mentores" });
    }
};

export const upgradeToMentor = async (req, res) => {
    const { id } = req.params;
    const { materias, bio } = req.body;

    try {
        // 1. Cambiar el rol del usuario a MENTOR y actualizar bio
        await db.query("DELETE FROM User_Roles WHERE user_id = ?", [id]);
        await db.query("INSERT INTO User_Roles (user_id, role_id) VALUES (?, 2)", [id]);
        await db.query("UPDATE Profiles SET bio = ? WHERE user_id = ?", [bio || '', id]);

        // 2. Asociar las materias seleccionadas en Mentor_Subjects
        if (materias && materias.length > 0) {
            await db.query("DELETE FROM Mentor_Subjects WHERE mentor_id = ?", [id]);

            const insertValues = materias.map(subjectId => [id, subjectId]);
            const insertQuery = "INSERT INTO Mentor_Subjects (mentor_id, subject_id) VALUES ?";
            await db.query(insertQuery, [insertValues]);
        }

        // 3. Obtener los datos del perfil actualizados
        const updatedUser = await findUserById(id);
        const enrichedUser = await enrichUserProfileData(updatedUser);

        res.json({
            message: "¡Felicidades! Has sido ascendido a Mentor/Tutor exitosamente.",
            user: enrichedUser
        });
    } catch (error) {
        console.error("Error al ascender a Mentor:", error);
        res.status(500).json({ error: "No se pudo procesar la solicitud de ascenso a tutor." });
    }
};