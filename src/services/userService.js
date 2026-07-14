// backend/src/services/userService.js
import db from '../config/db.js';
import * as userRepository from '../repositories/userRepository.js';
import { checkAndAwardBadges } from './gamificationService.js';
import { getEcuadorDateTime } from '../utils/dateUtils.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const getUserProfile = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new NotFoundError("Usuario no encontrado");
    }

    // 1. Obtener materias dictadas si es mentor
    try {
        user.materias = await userRepository.getSubjectsByMentorId(userId);
    } catch (e) {
        console.error("Error obteniendo materias para perfil:", e.message);
        user.materias = [];
    }

    // 2. Obtener tutorías futuras
    let tutorias = [];
    try {
        tutorias = await userRepository.getUpcomingMentorships(userId, getEcuadorDateTime());
    } catch (e) {
        console.error("Error obteniendo tutorías próximas para perfil:", e.message);
    }

    // 3. Obtener promedio y comentarios
    let score = 5.0;
    let comments = [];
    try {
        score = await userRepository.getMentorAverageRating(userId);
        comments = await userRepository.getMentorFeedbacks(userId);
    } catch (e) {
        console.error("Error obteniendo promedio de rating y comentarios:", e.message);
    }

    // 4. Obtener insignias reales
    let userBadges = [];
    try {
        const badgeRows = await userRepository.getUserBadges(userId);
        userBadges = badgeRows.map(b => ({
            ...b,
            is_featured: !!b.is_featured,
            icon: b.image_url // Para compatibilidad con el frontend
        }));
    } catch (e) {
        console.error("Error obteniendo insignias de usuario:", e.message);
    }

    // 5. Obtener horas acumuladas
    let apprenticeHours = [];
    let mentorHours = [];
    try {
        const apprenticeRows = await userRepository.getApprenticeHours(userId);
        apprenticeHours = apprenticeRows.map(r => ({
            ...r,
            total_hours: Number.parseFloat(Number(r.total_hours).toFixed(2))
        }));

        const mentorRows = await userRepository.getMentorHours(userId);
        mentorHours = mentorRows.map(r => ({
            ...r,
            total_hours: Number.parseFloat(Number(r.total_hours).toFixed(2))
        }));
    } catch (e) {
        console.error("Error obteniendo horas de tutorías:", e.message);
    }

    return {
        ...user,
        score,
        badges: userBadges,
        tutorias,
        comments,
        apprentice_hours: apprenticeHours,
        mentor_hours: mentorHours
    };
};

export const updateUserProfile = async (userId, updateData) => {
    const { bio, current_semester, materias, profile_photo_url } = updateData;
    
    // Obtener foto actual por si no viene una nueva
    let fotoUrl = profile_photo_url;
    if (fotoUrl === undefined || fotoUrl === null) {
        const currentUser = await userRepository.findUserById(userId);
        if (currentUser) {
            fotoUrl = currentUser.profile_photo_url;
        }
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Actualizar perfil
        await userRepository.updateProfile(userId, bio, current_semester, fotoUrl, connection);

        // 2. Actualizar materias si aplica
        if (materias !== undefined) {
            await userRepository.deleteMentorSubjects(userId, connection);
            if (materias.length > 0) {
                await userRepository.insertMentorSubjects(userId, materias, connection);
            }
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }

    // Evaluar insignias
    try {
        await checkAndAwardBadges(userId);
    } catch (badgeErr) {
        console.error("Error al evaluar insignias durante actualización:", badgeErr.message);
    }

    return getUserProfile(userId);
};

export const getAllMentors = async (excludeId) => {
    const mentors = await userRepository.getAllMentors(excludeId);
    return mentors.map(m => ({
        ...m,
        score: Number.parseFloat(Number(m.score).toFixed(1)),
        materias: m.materias_nombres ? m.materias_nombres.split(', ') : []
    }));
};

export const upgradeToMentor = async (userId, upgradeData) => {
    const { materias, bio } = upgradeData;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Cambiar el rol del usuario a MENTOR y actualizar bio
        await userRepository.deleteUserRoles(userId, connection);
        await userRepository.insertUserRole(userId, 2, connection); // 2 = MENTOR
        await userRepository.updateProfile(userId, bio || '', null, null, connection); // mantiene semester y photoUrl intactos pasando nulos o controlándolo en el repo si hiciera falta. Pero el SQL en original es: UPDATE Profiles SET bio = ? WHERE user_id = ?
        
        // Ejecutamos el update específico de bio
        await connection.query("UPDATE Profiles SET bio = ? WHERE user_id = ?", [bio || '', userId]);

        // 2. Asociar las materias seleccionadas en Mentor_Subjects
        if (materias && materias.length > 0) {
            await userRepository.deleteMentorSubjects(userId, connection);
            await userRepository.insertMentorSubjects(userId, materias, connection);
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }

    return getUserProfile(userId);
};

export const updateFeaturedBadges = async (userId, badgeIds) => {
    if (!Array.isArray(badgeIds)) {
        throw new ValidationError("badgeIds debe ser un arreglo de números.");
    }

    if (badgeIds.length > 4) {
        throw new ValidationError("Solo puedes destacar hasta 4 logros/insignias.");
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Desmarcar todas las insignias destacadas de este usuario
        await userRepository.unfeatureAllBadges(userId, connection);

        // 2. Si hay insignias seleccionadas, marcarlas como destacadas
        if (badgeIds.length > 0) {
            const ownedIds = await userRepository.verifyOwnedBadges(userId, badgeIds, connection);
            if (ownedIds.length > 0) {
                await userRepository.featureBadges(userId, ownedIds, connection);
            }
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};
