import db from './src/config/db.js';

async function fixConstraints() {
    try {
        console.log("Dropping existing FK constraints on Mentor_Subjects...");
        await db.query(`ALTER TABLE Mentor_Subjects DROP FOREIGN KEY fk_1;`).catch(e => console.log(e.message));
        await db.query(`ALTER TABLE Mentor_Subjects DROP FOREIGN KEY fk_2;`).catch(e => console.log(e.message));

        console.log("Renaming category_id to subject_id...");
        await db.query(`ALTER TABLE Mentor_Subjects CHANGE category_id subject_id INT(11) NOT NULL;`).catch(e => console.log(e.message));

        console.log("Adding new constraints...");
        await db.query(`ALTER TABLE Mentor_Subjects ADD CONSTRAINT fk_mentor FOREIGN KEY (mentor_id) REFERENCES Users(id) ON DELETE CASCADE;`);
        await db.query(`ALTER TABLE Mentor_Subjects ADD CONSTRAINT fk_subject FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE;`);

        console.log("Done fixing Mentor_Subjects table.");
    } catch (e) {
        console.error("General error:", e);
    } finally {
        process.exit();
    }
}

fixConstraints();
