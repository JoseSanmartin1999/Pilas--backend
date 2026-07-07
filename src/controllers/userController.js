// backend/src/controllers/userController.js
import * as userService from '../services/userService.js';
import { getTopMentors } from '../services/gamificationService.js';
import db from '../config/db.js';

export const getUserProfile = async (req, res, next) => {
    const { id: userId } = req.params;
    try {
        const userProfile = await userService.getUserProfile(userId);
        return res.json(userProfile);
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza la información del perfil del usuario (RF#003)
 */
export const updateUserProfile = async (req, res, next) => {
    const { id } = req.params;
    const { bio, current_semester } = req.body;
    let fotoUrl = req.body.profile_photo_url;

    // Las materias llegan como string JSON desde FormData si es que se envían
    let materias;
    if (req.body.materias !== undefined) {
        try {
            materias = JSON.parse(req.body.materias);
        } catch (e) {
            materias = [];
        }
    }

    if (req.file) {
        fotoUrl = req.file.path;
    }

    try {
        const updatedProfile = await userService.updateUserProfile(id, {
            bio,
            current_semester,
            materias,
            profile_photo_url: fotoUrl
        });

        res.json({
            message: "Perfil actualizado correctamente",
            fotoUrl: updatedProfile.profile_photo_url,
            bio: updatedProfile.bio,
            current_semester: updatedProfile.current_semester,
            materias: updatedProfile.materias
        });
    } catch (error) {
        next(error);
    }
};

export const getAllMentors = async (req, res, next) => {
    try {
        const { exclude } = req.query;
        const formattedMentors = await userService.getAllMentors(exclude);
        res.json(formattedMentors);
    } catch (error) {
        next(error);
    }
};

export const upgradeToMentor = async (req, res, next) => {
    const { id } = req.params;
    const { materias, bio } = req.body;

    try {
        const enrichedUser = await userService.upgradeToMentor(id, { materias, bio });

        res.json({
            message: "¡Felicidades! Has sido ascendido a Mentor/Tutor exitosamente.",
            user: enrichedUser
        });
    } catch (error) {
        next(error);
    }
};

export const updateFeaturedBadges = async (req, res, next) => {
    const { id } = req.params;
    const { badgeIds } = req.body;

    try {
        await userService.updateFeaturedBadges(id, badgeIds);
        res.json({ message: "Insignias destacadas actualizadas correctamente." });
    } catch (error) {
        next(error);
    }
};

export const getLeaderboard = async (req, res, next) => {
    try {
        const topMentors = await getTopMentors();
        
        const enrichedMentors = await Promise.all(topMentors.map(async (mentor) => {
            const [subjectRows] = await db.query(`
                SELECT s.name as subject_name, COUNT(m.id) as count
                FROM Mentorships m
                JOIN Subjects s ON m.subject_id = s.id
                WHERE m.mentor_id = ? AND m.is_deleted = 0
                GROUP BY s.id
                ORDER BY count DESC
                LIMIT 1
            `, [mentor.id]);
            
            let favoriteSubject = "General";
            if (subjectRows.length > 0) {
                favoriteSubject = subjectRows[0].subject_name;
            } else {
                const [taughtSubjects] = await db.query(`
                    SELECT s.name as subject_name
                    FROM Mentor_Subjects ms
                    JOIN Subjects s ON ms.subject_id = s.id
                    WHERE ms.mentor_id = ?
                    LIMIT 1
                `, [mentor.id]);
                if (taughtSubjects.length > 0) {
                    favoriteSubject = taughtSubjects[0].subject_name;
                }
            }
            
            return {
                id: mentor.id,
                full_name: mentor.full_name,
                profile_photo_url: mentor.profile_photo_url,
                career: mentor.career,
                current_semester: mentor.current_semester,
                score: mentor.score,
                xp: mentor.xp,
                favorite_subject: favoriteSubject
            };
        }));
        
        res.json(enrichedMentors);
    } catch (error) {
        next(error);
    }
};