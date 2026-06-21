import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../services/emailService.js';
import { checkAndAwardBadges } from '../services/gamificationService.js';

export const register = async (req, res) => {
    const {
        full_name, email, password, role,
        institution = '',
        career = '',
        student_id = '',
        current_semester = 1,
        bio = null
    } = req.body;

    let { selectedSubjects = [] } = req.body;
    // Multipart form data envia arrays como strings, hay que parsearlos si vienen como string
    if (typeof selectedSubjects === 'string') {
        try {
            selectedSubjects = JSON.parse(selectedSubjects);
        } catch (e) {
            selectedSubjects = [selectedSubjects]; // fallback por si mandan "1" en lugar de "[1]"
        }
    }

    const profile_photo_url = req.file ? req.file.path : null;

    // Validar que si se registra como MENTOR, esté al menos en 4to semestre
    if (role === 'MENTOR' && parseInt(current_semester, 10) < 4) {
        return res.status(400).json({ message: "Solo los estudiantes de 4to semestre en adelante pueden registrarse como mentores/tutores." });
    }

    // Validar que el correo sea de la ESPE
    if (!email || !email.toLowerCase().endsWith('@espe.edu.ec')) {
        return res.status(400).json({ message: "El correo debe ser institucional de la ESPE (debe terminar en @espe.edu.ec)." });
    }

    // Generar código de verificación de 6 dígitos
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Expiración en 24 horas
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    // Conexión para transacción (asegura que se guarde todo o nada)
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Encriptar contraseña (Seguridad RNF1)
        const password_hash = await bcrypt.hash(password, 10);

        // 2. Insertar Usuario en TiDB con los nuevos campos y status = 'PENDIENTE'
        const [userResult] = await connection.query(
            `INSERT INTO Users (
                email, password_hash, status, verification_code, verification_code_expires_at
            ) VALUES (?, ?, 'PENDIENTE', ?, ?)`,
            [
                email, password_hash, verificationCode, verificationExpires
            ]
        );

        const userId = userResult.insertId;

        // 2b. Insertar Rol del Usuario
        const roleMap = {
            'ADMIN': 1,
            'MENTOR': 2,
            'APRENDIZ': 3
        };
        const roleId = roleMap[role] || 3;
        await connection.query(
            `INSERT INTO User_Roles (user_id, role_id) VALUES (?, ?)`,
            [userId, roleId]
        );

        // 2c. Insertar Perfil del Usuario
        await connection.query(
            `INSERT INTO Profiles (
                user_id, full_name, profile_photo_url, bio, 
                institution, career, student_id, current_semester
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, full_name, profile_photo_url, bio,
                institution || 'ESPE', career || null, student_id || null, current_semester || 1
            ]
        );

        // 3. Si es Mentor, registrar las materias de la malla seleccionadas
        if (role === 'MENTOR' && selectedSubjects && selectedSubjects.length > 0) {
            const mentorSubjectsData = selectedSubjects.map(subjectId => [userId, subjectId]);
            await connection.query(
                'INSERT INTO Mentor_Subjects (mentor_id, subject_id) VALUES ?',
                [mentorSubjectsData]
            );
        }

        await connection.commit();

        try {
            await sendEmailVerificationEmail(email, verificationCode);
        } catch (mailErr) {
            console.error("Error al enviar el correo de verificación:", mailErr);
            return res.status(201).json({
                message: "Registro completado con éxito. Sin embargo, hubo un problema al enviar el correo de verificación. Puedes solicitar un reenvío.",
                userId,
                email
            });
        }

        res.status(201).json({ message: "Registro completado con éxito. Se ha enviado un código de verificación a tu correo.", userId, email });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error("Error en el registro:", error);

        // Manejar explícitamente errores de claves duplicadas (email, student_id, etc.)
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
            return res.status(400).json({
                message: "El correo electrónico o ID de estudiante ya se encuentra registrado."
            });
        }

        res.status(500).json({ message: "Error al registrar usuario", error: error.message });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query(`
            SELECT u.*, p.full_name, p.profile_photo_url, p.bio, p.institution, p.career, p.student_id, p.current_semester, p.xp, p.level, p.espe_coins,
                   (SELECT r.name FROM Roles r JOIN User_Roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) AS role
            FROM Users u
            LEFT JOIN Profiles p ON u.id = p.user_id
            WHERE u.email = ?
        `, [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: "Credenciales incorrectas" });
        }

        const user = users[0];

        // RNF: Validar si la cuenta está bloqueada por el Administrador
        if (user.status === 'BLOQUEADO') {
            return res.status(403).json({ message: "Tu cuenta ha sido bloqueada por el administrador. Ponte en contacto con soporte." });
        }

        // RNF: Validar si la cuenta está pendiente de verificación
        if (user.status === 'PENDIENTE') {
            return res.status(403).json({ 
                message: "Tu cuenta no está verificada. Por favor, verifica tu correo electrónico.", 
                isNotVerified: true,
                email: user.email
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Credenciales incorrectas" });
        }

        // Evaluar logros en login (ej. primera vez que inicia sesión)
        try {
            await checkAndAwardBadges(user.id);
        } catch (badgeErr) {
            console.error("Error al evaluar insignias durante login:", badgeErr.message);
        }

        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            jwtSecret,
            { expiresIn: jwtExpiresIn }
        );

        res.json({
            message: "Login exitoso",
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ message: "Error al iniciar sesión", error: error.message });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const user = users[0];
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // MySQL TIMESTAMP format YYYY-MM-DD HH:MM:SS
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await db.query('UPDATE Users SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?', [code, expiresAt, user.id]);

        try {
            await sendPasswordResetEmail(email, code);
        } catch (mailErr) {
            console.error("Error al enviar correo de recuperación:", mailErr);
            return res.status(500).json({ message: `No se pudo enviar el correo de recuperación. Detalle: ${mailErr.message}. Asegúrate de configurar las variables de entorno en Render.` });
        }

        res.json({ message: "Código de recuperación enviado al correo." });
    } catch (error) {
        console.error("Error en forgotPassword:", error);
        res.status(500).json({ message: "Error al solicitar recuperación", error: error.message });
    }
};

export const verifyResetCode = async (req, res) => {
    const { email, code } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ? AND reset_code = ?', [email, code]);
        if (users.length === 0) {
            return res.status(400).json({ message: "Código incorrecto." });
        }

        const user = users[0];
        
        if (new Date() > new Date(user.reset_code_expires_at)) {
            return res.status(400).json({ message: "El código ha expirado." });
        }

        res.json({ message: "Código verificado correctamente." });
    } catch (error) {
        console.error("Error en verifyResetCode:", error);
        res.status(500).json({ message: "Error al verificar código", error: error.message });
    }
};

export const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ? AND reset_code = ?', [email, code]);
        if (users.length === 0) {
            return res.status(400).json({ message: "Código incorrecto." });
        }

        const user = users[0];
        
        if (new Date() > new Date(user.reset_code_expires_at)) {
            return res.status(400).json({ message: "El código ha expirado." });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        
        await db.query('UPDATE Users SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?', [password_hash, user.id]);

        res.json({ message: "Contraseña actualizada correctamente." });
    } catch (error) {
        console.error("Error en resetPassword:", error);
        res.status(500).json({ message: "Error al restablecer contraseña", error: error.message });
    }
};

export const verifyEmail = async (req, res) => {
    const { email, code } = req.body;
    try {
        const [users] = await db.query(
            'SELECT * FROM Users WHERE email = ? AND verification_code = ?',
            [email, code]
        );
        if (users.length === 0) {
            return res.status(400).json({ message: "Código de verificación incorrecto." });
        }

        const user = users[0];
        
        if (new Date() > new Date(user.verification_code_expires_at)) {
            return res.status(400).json({ message: "El código de verificación ha expirado." });
        }

        await db.query(
            'UPDATE Users SET status = "ACTIVO", verification_code = NULL, verification_code_expires_at = NULL WHERE id = ?',
            [user.id]
        );

        res.json({ message: "Cuenta verificada con éxito. Ya puedes iniciar sesión." });
    } catch (error) {
        console.error("Error en verifyEmail:", error);
        res.status(500).json({ message: "Error al verificar el correo", error: error.message });
    }
};

export const resendVerificationCode = async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        const user = users[0];

        if (user.status === 'ACTIVO') {
            return res.status(400).json({ message: "Esta cuenta ya se encuentra activa." });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

        await db.query(
            'UPDATE Users SET verification_code = ?, verification_code_expires_at = ? WHERE id = ?',
            [code, expiresAt, user.id]
        );

        try {
            await sendEmailVerificationEmail(email, code);
        } catch (mailErr) {
            console.error("Error al enviar correo de verificación:", mailErr);
            return res.status(500).json({ message: `No se pudo enviar el correo de verificación. Detalle: ${mailErr.message}. Asegúrate de configurar las variables de entorno en Render.` });
        }

        res.json({ message: "Nuevo código de verificación enviado al correo." });
    } catch (error) {
        console.error("Error en resendVerificationCode:", error);
        res.status(500).json({ message: "Error al reenviar el código", error: error.message });
    }
};