// backend/src/repositories/subjectRepository.js
import db from '../config/db.js';

export const findCareerByName = async (name) => {
    const [rows] = await db.query(
        // name = ?          → exact match (e.g. 'Ingeniería de Software')
        // name LIKE ?        → DB name contains input keyword (e.g. DB has 'Ingeniería de Software', input is '%Software%')
        // ? LIKE CONCAT(...)  REMOVED — it was backwards: checked if short input contained the long DB name (never true)
        "SELECT id FROM Careers WHERE name = ? OR name LIKE ? LIMIT 1",
        [name, `%${name}%`]
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
