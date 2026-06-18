import db from '../config/db.js';

export const getSubjectsBySemester = async (req, res) => {
    const semester = req.query.semester || 1;
    try {
        // Lógica de desbloqueo: solo materias de semestres menores o iguales al actual
        const [rows] = await db.query(
            'SELECT * FROM Subjects WHERE semester <= ? ORDER BY semester ASC',
            [semester]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};