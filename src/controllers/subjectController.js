import db from '../config/db.js';

export const getSubjectsBySemester = async (req, res) => {
    const semester = req.query.semester || 1;
    const { career_id, career_name } = req.query;
    try {
        let matchedCareerId = null;

        if (career_id) {
            matchedCareerId = career_id;
        } else if (career_name) {
            // Buscar la carrera en la base de datos de manera exacta o parcial
            const [careers] = await db.query(
                "SELECT id FROM Careers WHERE name = ? OR name LIKE ? OR ? LIKE CONCAT('%', name, '%') LIMIT 1",
                [career_name, `%${career_name}%`, career_name]
            );
            if (careers.length > 0) {
                matchedCareerId = careers[0].id;
            } else {
                // Fallback: Si no se encuentra carrera por el nombre, usar la primera carrera por defecto (ej. Ingeniería de Software)
                const [defaultCareer] = await db.query("SELECT id FROM Careers LIMIT 1");
                if (defaultCareer.length > 0) {
                    matchedCareerId = defaultCareer[0].id;
                }
            }
        }

        let query = 'SELECT * FROM Subjects WHERE semester <= ?';
        const params = [semester];

        if (matchedCareerId) {
            query += ' AND career_id = ?';
            params.push(matchedCareerId);
        }

        query += ' ORDER BY semester ASC, name ASC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};