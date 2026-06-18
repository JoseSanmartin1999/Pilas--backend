import db from '../config/db.js';
import { uploadToImageKit } from '../config/imagekit.js';

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
    try {
        await db.query("DELETE FROM Users WHERE id = ?", [id]);
        res.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "No se pudo eliminar el usuario" });
    }
};

// 3. Solicitudes a Tutores (Tutor Applications)
export const getApplications = async (req, res) => {
    try {
        const query = `
            SELECT ta.id, ta.user_id, p.full_name as applicant_name, u.email as applicant_email, 
                   p.current_semester, p.career, ta.motivation, ta.selected_subjects, ta.status, ta.created_at
            FROM Tutor_Applications ta
            JOIN Users u ON ta.user_id = u.id
            LEFT JOIN Profiles p ON u.id = p.user_id
            ORDER BY ta.created_at DESC
        `;
        const [apps] = await db.query(query);
        
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
    const { user_id, motivation, selected_subjects } = req.body;

    if (!user_id || !motivation || !selected_subjects || selected_subjects.length === 0) {
        return res.status(400).json({ error: "Todos los campos (motivación, materias) son requeridos." });
    }

    try {
        // Verificar si ya tiene una postulación pendiente
        const [existing] = await db.query(
            "SELECT * FROM Tutor_Applications WHERE user_id = ? AND status = 'PENDING'",
            [user_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: "Ya tienes una solicitud de ascenso pendiente de aprobación por el administrador." });
        }

        const query = "INSERT INTO Tutor_Applications (user_id, motivation, selected_subjects, status) VALUES (?, ?, ?, 'PENDING')";
        await db.query(query, [user_id, motivation, JSON.stringify(selected_subjects)]);

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

