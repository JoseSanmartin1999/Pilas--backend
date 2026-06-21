import db from '../config/db.js';
import { uploadToImageKit } from '../config/imagekit.js';
import { uploadToCloudinary } from '../config/cloudinaryRepository.js';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';

// 1. Estadísticas de la página
export const getStats = async (req, res) => {
    try {
        // Conteo de usuarios por rol
        const [userRoles] = await db.query(`
            SELECT r.name as role, COUNT(*) as count 
            FROM Users u
            JOIN User_Roles ur ON u.id = ur.user_id
            JOIN Roles r ON ur.role_id = r.id
            GROUP BY r.name
        `);

        // Conteo de tutorías por estado
        const [mentorshipStatuses] = await db.query(
            "SELECT status, COUNT(*) as count FROM Mentorships GROUP BY status"
        );

        // Promedio general de calificaciones
        const [ratings] = await db.query(
            "SELECT AVG(rating) as avg_rating FROM Mentorships WHERE status = 'COMPLETADA' AND is_rated = 1 AND is_deleted = 0"
        );

        // Almacenamiento total consumido en el repositorio (en MB)
        const [storage] = await db.query(
            "SELECT SUM(file_size) as total_bytes FROM Repository_Materials"
        );

        // Formatear resultados
        const rolesCount = { MENTOR: 0, APRENDIZ: 0, ADMIN: 0 };
        userRoles.forEach(r => {
            if (rolesCount[r.role] !== undefined) {
                rolesCount[r.role] = r.count;
            }
        });

        const statusCount = { PENDIENTE: 0, ACEPTADA: 0, RECHAZADA: 0, COMPLETADA: 0, CANCELADA: 0 };
        mentorshipStatuses.forEach(s => {
            if (statusCount[s.status] !== undefined) {
                statusCount[s.status] = s.count;
            }
        });

        const totalUsers = Object.values(rolesCount).reduce((a, b) => a + b, 0);
        const totalMentorships = Object.values(statusCount).reduce((a, b) => a + b, 0);
        const avgRating = ratings[0]?.avg_rating ? parseFloat(Number(ratings[0].avg_rating).toFixed(1)) : 5.0;
        const totalMB = storage[0]?.total_bytes ? parseFloat((storage[0].total_bytes / (1024 * 1024)).toFixed(2)) : 0.0;

        res.json({
            users: {
                total: totalUsers,
                roles: rolesCount
            },
            mentorships: {
                total: totalMentorships,
                status: statusCount
            },
            averageRating: avgRating,
            storageUsedMB: totalMB
        });
    } catch (error) {
        console.error("Error al obtener estadísticas del sistema:", error);
        res.status(500).json({ error: "Error al cargar estadísticas" });
    }
};

// 2. Usuarios Registrados
export const getUsers = async (req, res) => {
    try {
        const query = `
            SELECT u.id, p.full_name, u.email, 
                   (SELECT r.name FROM Roles r JOIN User_Roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) AS role,
                   p.current_semester, p.career, p.institution, p.student_id, u.status, u.created_at 
            FROM Users u
            LEFT JOIN Profiles p ON u.id = p.user_id
            ORDER BY u.created_at DESC
        `;
        const [users] = await db.query(query);
        res.json(users);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ error: "Error al cargar usuarios" });
    }
};

export const updateUserStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVO' o 'BLOQUEADO'

    if (!['ACTIVO', 'BLOQUEADO'].includes(status)) {
        return res.status(400).json({ error: "Estado inválido. Debe ser ACTIVO o BLOQUEADO." });
    }

    try {
        await db.query("UPDATE Users SET status = ? WHERE id = ?", [status, id]);
        res.json({ message: `Estado del usuario actualizado a ${status}` });
    } catch (error) {
        console.error("Error al cambiar estado del usuario:", error);
        res.status(500).json({ error: "No se pudo actualizar el estado del usuario" });
    }
};

export const deleteUser = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Eliminar el feedback asociado a las tutorías de este usuario
        await connection.query(
            `DELETE FROM Feedback 
             WHERE mentorship_id IN (SELECT id FROM Mentorships WHERE mentor_id = ? OR apprentice_id = ?)`,
            [id, id]
        );

        // 2. Eliminar materiales del repositorio asociados a las tutorías de este usuario
        await connection.query(
            `DELETE FROM Repository_Materials 
             WHERE mentorship_id IN (SELECT id FROM Mentorships WHERE mentor_id = ? OR apprentice_id = ?)`,
            [id, id]
        );

        // 2. Eliminar las tutorías/mentorías donde el usuario sea mentor o aprendiz
        await connection.query(
            "DELETE FROM Mentorships WHERE mentor_id = ? OR apprentice_id = ?",
            [id, id]
        );

        // 3. Eliminar el usuario (esto eliminará cascada en Profiles, User_Roles, Tutor_Applications, Support_Tickets, User_Badges, Mentor_Subjects)
        await connection.query("DELETE FROM Users WHERE id = ?", [id]);

        await connection.commit();
        res.json({ message: "Usuario y sus datos asociados eliminados correctamente" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "No se pudo eliminar el usuario" });
    } finally {
        if (connection) connection.release();
    }
};

// 3. Solicitudes a Tutores (Tutor Applications)
export const getApplications = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = `
            SELECT ta.id, ta.user_id, p.full_name as applicant_name, u.email as applicant_email, 
                   p.current_semester, p.career, ta.motivation, ta.selected_subjects, ta.academic_record_url, ta.status, ta.created_at
            FROM Tutor_Applications ta
            JOIN Users u ON ta.user_id = u.id
            LEFT JOIN Profiles p ON u.id = p.user_id
        `;
        const queryParams = [];

        if (userRole !== 'ADMIN') {
            query += " WHERE ta.user_id = ?";
            queryParams.push(userId);
        }

        query += " ORDER BY ta.created_at DESC";

        const [apps] = await db.query(query, queryParams);
        
        // Parsear materias guardadas como JSON string en caso de que la DB lo retorne como string
        const parsedApps = apps.map(app => {
            let subjects = [];
            if (app.selected_subjects) {
                try {
                    subjects = typeof app.selected_subjects === 'string' 
                        ? JSON.parse(app.selected_subjects) 
                        : app.selected_subjects;
                } catch (e) {
                    subjects = [];
                }
            }
            return {
                ...app,
                selected_subjects: subjects
            };
        });
        
        res.json(parsedApps);
    } catch (error) {
        console.error("Error al obtener solicitudes de tutores:", error);
        res.status(500).json({ error: "Error al obtener solicitudes" });
    }
};

export const createApplication = async (req, res) => {
    let { motivation, selected_subjects } = req.body;
    const user_id = req.user.id; // Enforce using the authenticated user's ID

    // Parsear selected_subjects si viene como string (multipart/form-data)
    if (typeof selected_subjects === 'string') {
        try {
            selected_subjects = JSON.parse(selected_subjects);
        } catch (e) {
            selected_subjects = [selected_subjects];
        }
    }

    if (!motivation || !selected_subjects || selected_subjects.length === 0) {
        return res.status(400).json({ error: "Todos los campos (motivación, materias) son requeridos." });
    }

    try {
        // Validar semestre >= 4
        const [profileRows] = await db.query(
            "SELECT current_semester FROM Profiles WHERE user_id = ?",
            [user_id]
        );
        const semester = profileRows.length > 0 ? profileRows[0].current_semester : 1;
        if (semester < 4) {
            return res.status(400).json({ error: "Solo los estudiantes de 4to semestre en adelante pueden postularse como mentores." });
        }

        // Validar archivo PDF obligatorio
        if (!req.file) {
            return res.status(400).json({ error: "Debes subir tu reporte académico (archivo PDF) para postularte como mentor." });
        }

        // Verificar si ya tiene una postulación pendiente
        const [existing] = await db.query(
            "SELECT * FROM Tutor_Applications WHERE user_id = ? AND status = 'PENDING'",
            [user_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: "Ya tienes una solicitud de ascenso pendiente de aprobación por el administrador." });
        }

        // Subir PDF a Cloudinary
        let academicRecordUrl = null;
        try {
            const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, `tutor_apps_${user_id}`);
            academicRecordUrl = result.secure_url;
        } catch (uploadErr) {
            console.error("Error subiendo récord académico a Cloudinary:", uploadErr);
            return res.status(500).json({ error: "No se pudo subir el reporte académico. Inténtalo de nuevo." });
        }

        const query = "INSERT INTO Tutor_Applications (user_id, motivation, selected_subjects, academic_record_url, status) VALUES (?, ?, ?, ?, 'PENDING')";
        await db.query(query, [user_id, motivation, JSON.stringify(selected_subjects), academicRecordUrl]);

        res.status(201).json({ message: "Solicitud enviada con éxito al administrador." });
    } catch (error) {
        console.error("Error al registrar postulación a tutor:", error);
        res.status(500).json({ error: "No se pudo registrar tu postulación a tutor." });
    }
};

export const approveApplication = async (req, res) => {
    const { id } = req.params; // ID de la solicitud
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Obtener la solicitud
        const [apps] = await connection.query("SELECT * FROM Tutor_Applications WHERE id = ?", [id]);
        if (apps.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Solicitud no encontrada" });
        }
        const app = apps[0];

        if (app.status !== 'PENDING') {
            await connection.rollback();
            return res.status(400).json({ error: "La solicitud ya ha sido procesada." });
        }

        // Parsear materias
        let subjects = [];
        try {
            subjects = typeof app.selected_subjects === 'string'
                ? JSON.parse(app.selected_subjects)
                : app.selected_subjects;
        } catch (e) {
            subjects = [];
        }

        // 2. Ascender el usuario a MENTOR y guardar bio
        await connection.query("DELETE FROM User_Roles WHERE user_id = ?", [app.user_id]);
        await connection.query("INSERT INTO User_Roles (user_id, role_id) VALUES (?, 2)", [app.user_id]);
        await connection.query(
            "UPDATE Profiles SET bio = ? WHERE user_id = ?",
            [app.motivation, app.user_id]
        );

        // 3. Registrar materias dictadas en Mentor_Subjects
        if (subjects && subjects.length > 0) {
            await connection.query("DELETE FROM Mentor_Subjects WHERE mentor_id = ?", [app.user_id]);
            const insertValues = subjects.map(subjectId => [app.user_id, subjectId]);
            await connection.query(
                "INSERT INTO Mentor_Subjects (mentor_id, subject_id) VALUES ?",
                [insertValues]
            );
        }

        // 4. Marcar la solicitud como APPROVED
        await connection.query("UPDATE Tutor_Applications SET status = 'APPROVED' WHERE id = ?", [id]);

        await connection.commit();
        res.json({ message: "Solicitud aprobada y usuario ascendido a Mentor/Tutor." });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al aprobar solicitud:", error);
        res.status(500).json({ error: "No se pudo procesar la aprobación" });
    } finally {
        if (connection) connection.release();
    }
};

export const rejectApplication = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            "UPDATE Tutor_Applications SET status = 'REJECTED' WHERE id = ? AND status = 'PENDING'",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "La solicitud no existe o ya fue procesada." });
        }
        res.json({ message: "Solicitud rechazada correctamente" });
    } catch (error) {
        console.error("Error al rechazar solicitud:", error);
        res.status(500).json({ error: "No se pudo rechazar la solicitud" });
    }
};

// 4. Tickets de Soporte
export const getTickets = async (req, res) => {
    try {
        const query = `
            SELECT st.id, st.user_id, p.full_name as user_name, u.email as user_email,
                   (SELECT r.name FROM Roles r JOIN User_Roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) as user_role,
                   st.title, st.description, st.status, st.reply, st.created_at
            FROM Support_Tickets st
            JOIN Users u ON st.user_id = u.id
            LEFT JOIN Profiles p ON u.id = p.user_id
            ORDER BY st.created_at DESC
        `;
        const [tickets] = await db.query(query);
        res.json(tickets);
    } catch (error) {
        console.error("Error al cargar tickets:", error);
        res.status(500).json({ error: "Error al cargar tickets" });
    }
};

export const resolveTicket = async (req, res) => {
    const { id } = req.params;
    const { reply, status } = req.body; // status: 'RESOLVED' o 'IN_PROGRESS'

    if (!reply || reply.trim() === '') {
        return res.status(400).json({ error: "La respuesta es requerida para resolver el ticket." });
    }

    try {
        await db.query(
            "UPDATE Support_Tickets SET status = ?, reply = ? WHERE id = ?",
            [status || 'RESOLVED', reply, id]
        );
        res.json({ message: "Ticket respondido y actualizado correctamente." });
    } catch (error) {
        console.error("Error al resolver ticket:", error);
        res.status(500).json({ error: "No se pudo resolver el ticket" });
    }
};

// 5. CRUD de Insignias (Badges)
export const getBadges = async (req, res) => {
    try {
        const [badges] = await db.query("SELECT * FROM Badges ORDER BY id ASC");
        res.json(badges);
    } catch (error) {
        console.error("Error al obtener insignias:", error);
        res.status(500).json({ error: "Error al cargar las insignias" });
    }
};

export const createBadge = async (req, res) => {
    const { name, image_url, criteria, xp_reward, coins_reward } = req.body;

    if (!name) {
        return res.status(400).json({ error: "El nombre de la insignia es requerido." });
    }

    try {
        let finalImageUrl = image_url || null;

        // Si se subió un archivo, lo subimos a ImageKit
        if (req.file) {
            finalImageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, req.file.mimetype);
        }

        // Validar que criteria sea un JSON válido o nulo
        let criteriaStr = null;
        if (criteria) {
            criteriaStr = typeof criteria === 'object' ? JSON.stringify(criteria) : criteria;
            JSON.parse(criteriaStr); // Lanzará error si no es válido
        }

        const [result] = await db.query(
            "INSERT INTO Badges (name, image_url, criteria, xp_reward, coins_reward) VALUES (?, ?, ?, ?, ?)",
            [name, finalImageUrl, criteriaStr, xp_reward || 0, coins_reward || 0]
        );

        res.status(201).json({
            message: "Insignia creada exitosamente.",
            badgeId: result.insertId
        });
    } catch (error) {
        console.error("Error al crear insignia:", error);
        res.status(500).json({ error: "No se pudo crear la insignia.", details: error.message });
    }
};

export const updateBadge = async (req, res) => {
    const { id } = req.params;
    const { name, image_url, criteria, xp_reward, coins_reward } = req.body;

    if (!name) {
        return res.status(400).json({ error: "El nombre de la insignia es requerido." });
    }

    try {
        let finalImageUrl = image_url || null;

        // Si se subió un archivo nuevo, lo subimos a ImageKit
        if (req.file) {
            finalImageUrl = await uploadToImageKit(req.file.buffer, req.file.originalname, req.file.mimetype);
        }

        let criteriaStr = null;
        if (criteria) {
            criteriaStr = typeof criteria === 'object' ? JSON.stringify(criteria) : criteria;
            JSON.parse(criteriaStr); // Validar
        }

        const [result] = await db.query(
            "UPDATE Badges SET name = ?, image_url = ?, criteria = ?, xp_reward = ?, coins_reward = ? WHERE id = ?",
            [name, finalImageUrl, criteriaStr, xp_reward || 0, coins_reward || 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Insignia no encontrada." });
        }

        res.json({ message: "Insignia actualizada correctamente." });
    } catch (error) {
        console.error("Error al actualizar insignia:", error);
        res.status(500).json({ error: "No se pudo actualizar la insignia.", details: error.message });
    }
};

export const deleteBadge = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query("DELETE FROM Badges WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Insignia no encontrada." });
        }
        res.json({ message: "Insignia eliminada correctamente." });
    } catch (error) {
        console.error("Error al eliminar insignia:", error);
        res.status(500).json({ error: "No se pudo eliminar la insignia." });
    }
};

// 6. Reporte de datos del dashboard para descarga
export const getReportData = async (req, res) => {
    try {
        // 1. Usuarios por rol
        const [userRoles] = await db.query(`
            SELECT r.name as role, COUNT(*) as count 
            FROM Users u
            JOIN User_Roles ur ON u.id = ur.user_id
            JOIN Roles r ON ur.role_id = r.id
            GROUP BY r.name
        `);

        // 2. Tutorías por estado
        const [mentorshipStatuses] = await db.query(
            "SELECT status, COUNT(*) as count FROM Mentorships GROUP BY status"
        );

        // 3. Calificación promedio
        const [ratings] = await db.query(
            "SELECT AVG(rating) as avg_rating, COUNT(*) as total_rated FROM Mentorships WHERE status = 'COMPLETADA' AND is_rated = 1 AND is_deleted = 0"
        );

        // 4. Almacenamiento
        const [storage] = await db.query(
            "SELECT SUM(file_size) as total_bytes FROM Repository_Materials"
        );

        // 5. Top 5 mentores con más tutorías completadas
        const [topMentors] = await db.query(`
            SELECT p.full_name, COUNT(*) as total_completed
            FROM Mentorships m
            JOIN Profiles p ON m.mentor_id = p.user_id
            WHERE m.status = 'COMPLETADA' AND m.is_deleted = 0
            GROUP BY m.mentor_id, p.full_name
            ORDER BY total_completed DESC
            LIMIT 5
        `);

        // 6. Top 5 materias más solicitadas
        const [topSubjects] = await db.query(`
            SELECT s.name, COUNT(*) as total_requests
            FROM Mentorships m
            JOIN Subjects s ON m.subject_id = s.id
            WHERE m.is_deleted = 0
            GROUP BY m.subject_id, s.name
            ORDER BY total_requests DESC
            LIMIT 5
        `);

        // 7. Solicitudes de mentores por estado
        const [appStats] = await db.query(
            "SELECT status, COUNT(*) as count FROM Tutor_Applications GROUP BY status"
        );

        // 8. Tickets por estado
        const [ticketStats] = await db.query(
            "SELECT status, COUNT(*) as count FROM Support_Tickets GROUP BY status"
        );

        // Formatear
        const rolesCount = { MENTOR: 0, APRENDIZ: 0, ADMIN: 0 };
        userRoles.forEach(r => { if (rolesCount[r.role] !== undefined) rolesCount[r.role] = r.count; });

        const statusCount = { PENDIENTE: 0, ACEPTADA: 0, RECHAZADA: 0, COMPLETADA: 0, CANCELADA: 0 };
        mentorshipStatuses.forEach(s => { if (statusCount[s.status] !== undefined) statusCount[s.status] = s.count; });

        const totalUsers = Object.values(rolesCount).reduce((a, b) => a + b, 0);
        const totalMentorships = Object.values(statusCount).reduce((a, b) => a + b, 0);
        const avgRating = ratings[0]?.avg_rating ? parseFloat(Number(ratings[0].avg_rating).toFixed(1)) : 0;
        const totalRated = ratings[0]?.total_rated || 0;
        const totalMB = storage[0]?.total_bytes ? parseFloat((storage[0].total_bytes / (1024 * 1024)).toFixed(2)) : 0.0;

        const appStatusCount = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
        appStats.forEach(a => { if (appStatusCount[a.status] !== undefined) appStatusCount[a.status] = a.count; });

        const ticketStatusCount = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
        ticketStats.forEach(t => { if (ticketStatusCount[t.status] !== undefined) ticketStatusCount[t.status] = t.count; });

        res.json({
            generatedAt: new Date().toISOString(),
            users: { total: totalUsers, roles: rolesCount },
            mentorships: { total: totalMentorships, statuses: statusCount, averageRating: avgRating, totalRated },
            topMentors,
            topSubjects,
            storage: { usedMB: totalMB },
            applications: appStatusCount,
            tickets: ticketStatusCount
        });
    } catch (error) {
        console.error("Error al generar datos del reporte:", error);
        res.status(500).json({ error: "Error al generar el reporte" });
    }
};

// 7. Actualizar rol de usuario
export const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; // 'ADMIN', 'MENTOR' o 'APRENDIZ'

    if (!['ADMIN', 'MENTOR', 'APRENDIZ'].includes(role)) {
        return res.status(400).json({ error: "Rol inválido. Debe ser ADMIN, MENTOR o APRENDIZ." });
    }

    const roleMap = {
        'ADMIN': 1,
        'MENTOR': 2,
        'APRENDIZ': 3
    };
    const roleId = roleMap[role];

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Actualizar la relación en la tabla 'User_Roles'
        await connection.query("DELETE FROM User_Roles WHERE user_id = ?", [id]);
        await connection.query("INSERT INTO User_Roles (user_id, role_id) VALUES (?, ?)", [id, roleId]);

        // 3. Si deja de ser MENTOR, eliminar sus materias asociadas para no aparecer en la lista de tutores
        if (role !== 'MENTOR') {
            await connection.query("DELETE FROM Mentor_Subjects WHERE mentor_id = ?", [id]);
        }

        await connection.commit();
        res.json({ message: `Rol del usuario actualizado a ${role} correctamente.` });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al actualizar rol del usuario:", error);
        res.status(500).json({ error: "No se pudo actualizar el rol del usuario." });
    } finally {
        if (connection) connection.release();
    }
};

// ==========================================
// GESTIÓN DE CARRERAS (CRUD)
// ==========================================

export const getCareers = async (req, res) => {
    try {
        const [careers] = await db.query("SELECT * FROM Careers ORDER BY name ASC");
        res.json(careers);
    } catch (error) {
        console.error("Error al obtener carreras:", error);
        res.status(500).json({ error: "Error al cargar carreras" });
    }
};

export const createCareer = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: "El nombre de la carrera es requerido." });
    }
    try {
        const [result] = await db.query(
            "INSERT INTO Careers (name, description) VALUES (?, ?)",
            [name, description || null]
        );
        res.status(201).json({
            message: "Carrera creada exitosamente.",
            careerId: result.insertId
        });
    } catch (error) {
        console.error("Error al crear carrera:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Ya existe una carrera con ese nombre." });
        }
        res.status(500).json({ error: "No se pudo crear la carrera." });
    }
};

export const updateCareer = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: "El nombre de la carrera es requerido." });
    }
    try {
        const [result] = await db.query(
            "UPDATE Careers SET name = ?, description = ? WHERE id = ?",
            [name, description || null, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Carrera no encontrada." });
        }
        res.json({ message: "Carrera actualizada exitosamente." });
    } catch (error) {
        console.error("Error al actualizar carrera:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Ya existe una carrera con ese nombre." });
        }
        res.status(500).json({ error: "No se pudo actualizar la carrera." });
    }
};

export const deleteCareer = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Obtener todas las materias de esta carrera
        const [subjects] = await connection.query("SELECT id FROM Subjects WHERE career_id = ?", [id]);
        
        if (subjects.length > 0) {
            const subjectIds = subjects.map(s => s.id);
            
            // 2. Eliminar relaciones en Mentor_Subjects
            await connection.query("DELETE FROM Mentor_Subjects WHERE subject_id IN (?)", [subjectIds]);

            // 3. Establecer subject_id en NULL en Mentorships para las materias de esta carrera
            await connection.query("UPDATE Mentorships SET subject_id = NULL WHERE subject_id IN (?)", [subjectIds]);
        }

        // 4. Eliminar la carrera (las materias se eliminarán en cascada por foreign key)
        const [result] = await connection.query("DELETE FROM Careers WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Carrera no encontrada." });
        }

        await connection.commit();
        res.json({ message: "Carrera y sus materias asociadas eliminadas exitosamente." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al eliminar carrera:", error);
        res.status(500).json({ error: "No se pudo eliminar la carrera debido a un conflicto de integridad." });
    } finally {
        if (connection) connection.release();
    }
};

export const uploadCareerMalla = async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: "Debes subir un archivo PDF de la malla curricular." });
    }

    let connection;
    try {
        // 1. Verificar carrera existente
        const [careers] = await db.query("SELECT * FROM Careers WHERE id = ?", [id]);
        if (careers.length === 0) {
            return res.status(404).json({ error: "Carrera no encontrada." });
        }

        // 2. Analizar PDF con coordenadas
        const parser = new PDFParse({ data: req.file.buffer });
        const doc = await parser.load();
        const numPages = doc.numPages || 1;
        const candidates = [];
        const noiseWords = ['PAO', 'SEMESTRE', 'NIVEL', 'UNIDAD', 'MATERIA', 'INTEGRACIÓN', 'INTEGRACION', 'CURRICULAR', 'CARRERA', 'ESPE', 'TOTAL', 'BÁSICA', 'BASICA', 'PROFESIONAL'];

        for (let pNum = 1; pNum <= numPages; pNum++) {
            const page = await doc.getPage(pNum);
            const textContent = await page.getTextContent();
            const items = textContent.items || [];
            
            // Separar códigos de materia y otros textos
            const codeItems = [];
            const otherItems = [];
            
            for (const item of items) {
                if (!item.str) continue;
                const str = item.str.trim();
                // Buscar códigos con formato EXCT-A0302, EXCTA0302, etc. (deben contener al menos un dígito)
                if (/\b([A-Z]{3,6}-?[A-Z0-9]{3,5})\b/.test(str) && /\d/.test(str)) {
                    codeItems.push({
                        code: str,
                        x: item.transform[4],
                        y: item.transform[5]
                    });
                } else {
                    otherItems.push({
                        text: str,
                        x: item.transform[4],
                        y: item.transform[5]
                    });
                }
            }
            
            // Emparejar cada código con su nombre correspondiente en esta página
            for (const code of codeItems) {
                // Intentar Caso A: Vertical stack (abajo del código)
                let nearbyTexts = otherItems
                    .map(other => {
                        const dx = other.x - code.x;
                        const dy = code.y - other.y;
                        return { ...other, dx, dy, dist: Math.sqrt(dx*dx + dy*dy) };
                    })
                    .filter(other => Math.abs(other.dx) < 45 && other.dy > 5 && other.dy < 25)
                    .sort((a, b) => a.dy - b.dy);
                
                // Si no se encuentra, intentar Caso B: Horizontal line (a la derecha en la misma línea)
                if (nearbyTexts.length === 0) {
                    nearbyTexts = otherItems
                        .map(other => {
                            const dx = other.x - code.x;
                            const dy = code.y - other.y;
                            return { ...other, dx, dy, dist: Math.sqrt(dx*dx + dy*dy) };
                        })
                        .filter(other => Math.abs(other.dy) < 5 && other.dx > 15 && other.dx < 220)
                        .sort((a, b) => a.dx - b.dx);
                }
                
                if (nearbyTexts.length > 0) {
                    const nameParts = nearbyTexts
                        .filter(n => {
                            const t = n.text.trim();
                            if (['CD', 'CPE', 'CA', 'HS', 'HPAO', 'NIVELACION', 'NIVELACIÓN'].includes(t)) return false;
                            if (/^[0-9,.]+$/.test(t)) return false;
                            return true;
                        })
                        .map(n => n.text.trim());
                    
                    const name = nameParts.join(' ').replace(/\s+/g, ' ').trim();
                    
                    if (name && name.length > 3) {
                        const hasNoise = noiseWords.some(word => name.toUpperCase().includes(word));
                        if (!hasNoise) {
                            candidates.push({
                                code: code.code,
                                name: name,
                                y: code.y,
                                x: code.x,
                                page: pNum
                            });
                        }
                    }
                }
            }
        }

        // 3. Agrupar por página y por coordenada Y (con tolerancia de 10 puntos)
        const pagesGroups = {};
        for (const cand of candidates) {
            if (!pagesGroups[cand.page]) {
                pagesGroups[cand.page] = [];
            }
            const rows = pagesGroups[cand.page];
            let foundRow = rows.find(r => Math.abs(r.y - cand.y) < 10);
            if (foundRow) {
                foundRow.subjects.push(cand);
                // Recalcular promedio Y
                foundRow.y = (foundRow.y * (foundRow.subjects.length - 1) + cand.y) / foundRow.subjects.length;
            } else {
                rows.push({
                    y: cand.y,
                    subjects: [cand]
                });
            }
        }

        // 4. Ordenar y asignar semestres secuencialmente
        const uniqueSubjects = [];
        const seen = new Set();
        let semesterCounter = 1;
        
        const sortedPageNums = Object.keys(pagesGroups).map(Number).sort((a, b) => a - b);
        
        for (const pNum of sortedPageNums) {
            const rows = pagesGroups[pNum];
            // Ordenar filas de arriba a abajo (Y descendente)
            rows.sort((a, b) => b.y - a.y);
            
            for (const row of rows) {
                row.subjects.forEach(sub => {
                    const nameLower = sub.name.toLowerCase();
                    if (!seen.has(nameLower)) {
                        seen.add(nameLower);
                        uniqueSubjects.push({
                            name: sub.name,
                            code: sub.code,
                            semester: semesterCounter
                        });
                    }
                });
                semesterCounter++;
            }
        }

        if (uniqueSubjects.length === 0) {
            return res.status(400).json({ error: "No se encontraron materias válidas en el PDF. Verifica que contenga texto y no sea una imagen." });
        }

        // 5. Guardar materias en DB bajo transacción
        connection = await db.getConnection();
        await connection.beginTransaction();

        for (const sub of uniqueSubjects) {
            const [existing] = await connection.query(
                "SELECT * FROM Subjects WHERE name = ? AND career_id = ?",
                [sub.name, id]
            );
            if (existing.length === 0) {
                await connection.query(
                    "INSERT INTO Subjects (name, semester, code, career_id) VALUES (?, ?, ?, ?)",
                    [sub.name, sub.semester, sub.code, id]
                );
            }
        }

        await connection.commit();

        res.json({
            message: `Malla curricular procesada con éxito. Se detectaron y agregaron ${uniqueSubjects.length} materias.`,
            mallaUrl: null,
            subjectsCount: uniqueSubjects.length,
            subjects: uniqueSubjects
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al procesar malla PDF:", error);
        res.status(500).json({ error: "Error interno al escanear la malla." });
    } finally {
        if (connection) connection.release();
    }
};

// ==========================================
// GESTIÓN DE MATERIAS (CRUD)
// ==========================================

export const getCareerSubjects = async (req, res) => {
    const { id } = req.params;
    try {
        const [subjects] = await db.query(
            "SELECT * FROM Subjects WHERE career_id = ? ORDER BY semester ASC, name ASC",
            [id]
        );
        res.json(subjects);
    } catch (error) {
        console.error("Error al obtener materias de la carrera:", error);
        res.status(500).json({ error: "No se pudieron cargar las materias." });
    }
};

export const createSubject = async (req, res) => {
    const { name, semester, code, career_id } = req.body;
    if (!name || !semester || !career_id) {
        return res.status(400).json({ error: "Nombre, semestre y carrera son requeridos." });
    }
    try {
        const [result] = await db.query(
            "INSERT INTO Subjects (name, semester, code, career_id) VALUES (?, ?, ?, ?)",
            [name, parseInt(semester, 10), code || null, parseInt(career_id, 10)]
        );
        res.status(201).json({
            message: "Materia creada correctamente.",
            subjectId: result.insertId
        });
    } catch (error) {
        console.error("Error al crear materia:", error);
        res.status(500).json({ error: "No se pudo registrar la materia." });
    }
};

export const updateSubject = async (req, res) => {
    const { id } = req.params;
    const { name, semester, code, career_id } = req.body;
    if (!name || !semester || !career_id) {
        return res.status(400).json({ error: "Nombre, semestre y carrera son requeridos." });
    }
    try {
        const [result] = await db.query(
            "UPDATE Subjects SET name = ?, semester = ?, code = ?, career_id = ? WHERE id = ?",
            [name, parseInt(semester, 10), code || null, parseInt(career_id, 10), id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Materia no encontrada." });
        }
        res.json({ message: "Materia actualizada correctamente." });
    } catch (error) {
        console.error("Error al actualizar materia:", error);
        res.status(500).json({ error: "No se pudo actualizar la materia." });
    }
};

export const deleteSubject = async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Eliminar relaciones en Mentor_Subjects
        await connection.query("DELETE FROM Mentor_Subjects WHERE subject_id = ?", [id]);

        // 2. Establecer subject_id en NULL en Mentorships para desvincular sin romper claves foráneas
        await connection.query("UPDATE Mentorships SET subject_id = NULL WHERE subject_id = ?", [id]);

        // 3. Eliminar la materia
        const [result] = await connection.query("DELETE FROM Subjects WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: "Materia no encontrada." });
        }

        await connection.commit();
        res.json({ message: "Materia eliminada correctamente." });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al eliminar materia:", error);
        res.status(500).json({ error: "No se pudo eliminar la materia debido a un conflicto de integridad." });
    } finally {
        if (connection) connection.release();
    }
};


