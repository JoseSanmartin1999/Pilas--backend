import db from '../config/db.js';

// Crear un nuevo ticket de soporte
export const createTicket = async (req, res) => {
    const { user_id, title, description } = req.body;

    if (!user_id || !title || !description || title.trim() === '' || description.trim() === '') {
        return res.status(400).json({ error: "Todos los campos (título, descripción) son obligatorios." });
    }

    try {
        const query = "INSERT INTO Support_Tickets (user_id, title, description, status) VALUES (?, ?, ?, 'OPEN')";
        const [result] = await db.query(query, [user_id, title, description]);
        
        res.status(201).json({
            message: "Ticket creado exitosamente. El administrador lo revisará pronto.",
            ticketId: result.insertId
        });
    } catch (error) {
        console.error("Error al crear ticket:", error);
        res.status(500).json({ error: "No se pudo reportar el ticket de soporte." });
    }
};

// Obtener los tickets de un usuario específico
export const getUserTickets = async (req, res) => {
    const { userId } = req.params;
    try {
        const query = "SELECT * FROM Support_Tickets WHERE user_id = ? ORDER BY created_at DESC";
        const [tickets] = await db.query(query, [userId]);
        res.json(tickets);
    } catch (error) {
        console.error("Error al obtener tickets del usuario:", error);
        res.status(500).json({ error: "Error al cargar tu historial de soporte." });
    }
};
