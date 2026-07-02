// backend/src/controllers/userController.js
import * as userService from '../services/userService.js';

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