import db from '../src/config/db.js';

async function run() {
    try {
        console.log("Starting migration to reorganize Mechanical Engineering subjects...");
        
        // 1. Check or insert "Ingeniería Mecánica"
        const [existing] = await db.query("SELECT id FROM Careers WHERE name = 'Ingeniería Mecánica'");
        let careerId;
        if (existing.length > 0) {
            careerId = existing[0].id;
            console.log(`Career 'Ingeniería Mecánica' already exists with ID: ${careerId}`);
        } else {
            const [result] = await db.query(
                "INSERT INTO Careers (name, description) VALUES ('Ingeniería Mecánica', 'Carrera de Ingeniería Mecánica de la ESPE')"
            );
            careerId = result.insertId;
            console.log(`Created career 'Ingeniería Mecánica' with ID: ${careerId}`);
        }
        
        // 2. Update subjects career_id to the new ID
        const [updateResult] = await db.query(
            "UPDATE Subjects SET career_id = ? WHERE id BETWEEN 90002 AND 90046",
            [careerId]
        );
        console.log(`Successfully updated ${updateResult.affectedRows} subjects to career_id: ${careerId}`);
        
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit(0);
    }
}

run();
