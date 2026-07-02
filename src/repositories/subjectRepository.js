// backend/src/repositories/subjectRepository.js
import db from '../config/db.js';

export const findCareerByName = async (name) => {
    const [rows] = await db.query(
        "SELECT id FROM Careers WHERE name = ? OR name LIKE ? OR ? LIKE CONCAT('%', name, '%') LIMIT 1",
        [name, `%${name}%`, name]
    );
    return rows.length > 0 ? rows[0] : null;
};

export const findDefaultCareer = async () => {
    const [rows] = await db.query("SELECT id FROM Careers LIMIT 1");
    return rows.length > 0 ? rows[0] : null;
};

export const getSubjectsBySemesterAndCareer = async (semester, careerId) => {
    let query = 'SELECT * FROM Subjects WHERE semester <= ?';
    const params = [semester];

    if (careerId) {
        query += ' AND career_id = ?';
        params.push(careerId);
    }

    query += ' ORDER BY semester ASC, name ASC';

    const [rows] = await db.query(query, params);
    return rows;
};
