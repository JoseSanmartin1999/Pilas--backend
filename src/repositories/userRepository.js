// backend/src/repositories/userRepository.js
import db from '../config/db.js';

export const findUserById = async (userId) => {
    const [users] = await db.query(`
        SELECT u.id, u.email, u.status, u.created_at,
               p.full_name, p.profile_photo_url, p.bio, p.institution, p.career, p.career_id, p.student_id, p.current_semester, p.xp, p.level, p.espe_coins,
               (SELECT r.name FROM Roles r JOIN User_Roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) AS role
        FROM Users u
        LEFT JOIN Profiles p ON u.id = p.user_id
        WHERE u.id = ?
    `, [userId]);
    return users.length > 0 ? users[0] : null;
};


export const getSubjectsByMentorId = async (mentorId) => {
    const query = `
        SELECT s.id, s.name 
        FROM Subjects s
        INNER JOIN Mentor_Subjects ms ON s.id = ms.subject_id
        WHERE ms.mentor_id = ?
    `;
    const [rows] = await db.query(query, [mentorId]);
    return rows;
};

export const getUpcomingMentorships = async (userId, nowDateTime) => {
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
          AND m.scheduled_date >= ? 
          AND m.is_deleted = 0 
          AND m.status NOT IN ('RECHAZADA', 'CANCELADA')
        ORDER BY m.scheduled_date ASC
    `;
    const [rows] = await db.query(query, [userId, userId, nowDateTime]);
    return rows;
};

export const getMentorAverageRating = async (mentorId) => {
    const [rows] = await db.query(
        "SELECT AVG(rating) as avg_rating FROM Mentorships WHERE mentor_id = ? AND status = 'COMPLETADA' AND is_rated = 1 AND is_deleted = 0",
        [mentorId]
    );
    return rows.length > 0 && rows[0].avg_rating ? parseFloat(Number(rows[0].avg_rating).toFixed(1)) : 5.0;
};

export const getMentorFeedbacks = async (mentorId) => {
    const query = `
        SELECT m.rating, m.rating_comment, m.closed_at, p.full_name as apprentice_name 
        FROM Mentorships m
        JOIN Users u ON m.apprentice_id = u.id
        LEFT JOIN Profiles p ON u.id = p.user_id
        WHERE m.mentor_id = ? AND m.status = 'COMPLETADA' AND m.is_rated = 1 AND m.rating_comment IS NOT NULL AND m.rating_comment != '' AND m.is_deleted = 0
        ORDER BY m.closed_at DESC
        LIMIT 5
    `;
    const [rows] = await db.query(query, [mentorId]);
    return rows;
};

export const getUserBadges = async (userId) => {
    const query = `
        SELECT b.id, b.name, b.image_url, b.criteria, b.xp_reward, b.coins_reward, ub.earned_at, ub.is_featured
        FROM Badges b
        INNER JOIN User_Badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = ?
    `;
    const [rows] = await db.query(query, [userId]);
    return rows;
};

export const getApprenticeHours = async (userId) => {
    const query = `
        SELECT 
            s.id as subject_id, 
            s.name as subject_name,
            SUM(
                CASE 
                    WHEN m.estimated_duration LIKE '%45%' THEN 0.75
                    WHEN m.estimated_duration LIKE '%1.5%' THEN 1.5
                    WHEN m.estimated_duration LIKE '%2%' THEN 2.0
                    ELSE 1.0
                END
            ) as total_hours
        FROM Mentorships m
        JOIN Subjects s ON m.subject_id = s.id
        WHERE m.status = 'COMPLETADA' 
          AND m.is_deleted = 0
          AND m.apprentice_id = ?
        GROUP BY s.id, s.name
    `;
    const [rows] = await db.query(query, [userId]);
    return rows;
};

export const getMentorHours = async (userId) => {
    const query = `
        SELECT 
            s.id as subject_id, 
            s.name as subject_name,
            SUM(
                CASE 
                    WHEN m.estimated_duration LIKE '%45%' THEN 0.75
                    WHEN m.estimated_duration LIKE '%1.5%' THEN 1.5
                    WHEN m.estimated_duration LIKE '%2%' THEN 2.0
                    ELSE 1.0
                END
            ) as total_hours
        FROM Mentorships m
        JOIN Subjects s ON m.subject_id = s.id
        WHERE m.status = 'COMPLETADA' 
          AND m.is_deleted = 0
          AND m.mentor_id = ?
        GROUP BY s.id, s.name
    `;
    const [rows] = await db.query(query, [userId]);
    return rows;
};

export const getAllMentors = async (excludeId) => {
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
        WHERE r.name = 'MENTOR' AND u.status = 'ACTIVO'
    `;
    const queryParams = [];

    if (excludeId) {
        query += ` AND u.id != ? `;
        queryParams.push(excludeId);
    }

    query += ` GROUP BY u.id, p.user_id`;

    const [rows] = await db.query(query, queryParams);
    return rows;
};

export const updateProfile = async (userId, bio, currentSemester, photoUrl, client = db) => {
    const query = 'UPDATE Profiles SET bio = ?, current_semester = ?, profile_photo_url = ? WHERE user_id = ?';
    await client.query(query, [bio, currentSemester, photoUrl, userId]);
};

export const deleteMentorSubjects = async (mentorId, client = db) => {
    await client.query('DELETE FROM Mentor_Subjects WHERE mentor_id = ?', [mentorId]);
};

export const insertMentorSubjects = async (mentorId, subjectIds, client = db) => {
    const insertValues = subjectIds.map(subjectId => [mentorId, subjectId]);
    await client.query('INSERT INTO Mentor_Subjects (mentor_id, subject_id) VALUES ?', [insertValues]);
};

export const deleteUserRoles = async (userId, client = db) => {
    await client.query("DELETE FROM User_Roles WHERE user_id = ?", [userId]);
};

export const insertUserRole = async (userId, roleId, client = db) => {
    await client.query("INSERT INTO User_Roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);
};

export const unfeatureAllBadges = async (userId, client = db) => {
    await client.query("UPDATE User_Badges SET is_featured = 0 WHERE user_id = ?", [userId]);
};

export const verifyOwnedBadges = async (userId, badgeIds, client = db) => {
    const [owned] = await client.query(
        "SELECT badge_id FROM User_Badges WHERE user_id = ? AND badge_id IN (?)",
        [userId, badgeIds]
    );
    return owned.map(o => o.badge_id);
};

export const featureBadges = async (userId, ownedIds, client = db) => {
    await client.query(
        "UPDATE User_Badges SET is_featured = 1 WHERE user_id = ? AND badge_id IN (?)",
        [userId, ownedIds]
    );
};
