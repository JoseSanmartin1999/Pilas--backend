/**
 * validators.js
 * ============================================================
 * Middleware centralizado de validación y sanitización de entradas.
 * Utiliza express-validator para prevenir:
 *   - Inyección SQL
 *   - Cross-Site Scripting (XSS)
 *   - Inyección de comandos
 *   - Parámetros malformados
 *
 * Todas las rutas de la API deben usar estos validadores.
 * ============================================================
 */
import { body, param, query, validationResult } from 'express-validator';

// ─────────────────────────────────────────────────────────────
// HELPER: Procesar resultados de validación
// ─────────────────────────────────────────────────────────────

/**
 * Middleware que revisa si hay errores de validación y retorna 422
 * si los hay. Debe colocarse DESPUÉS de los validadores de campo.
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: 'Datos de entrada inválidos o inseguros.',
            detalles: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
        });
    }
    next();
};

// ─────────────────────────────────────────────────────────────
// HELPER: Regex de patrones SQL peligrosos
// ─────────────────────────────────────────────────────────────
const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|DECLARE|CAST|CONVERT|CHAR|NCHAR|VARCHAR|SCRIPT)\b|--|;|\/\*|\*\/|xp_|0x[0-9a-fA-F]+)/i;

const noSQLInjection = (value) => {
    if (typeof value === 'string' && SQL_INJECTION_PATTERN.test(value)) {
        throw new Error('El valor contiene patrones no permitidos.');
    }
    return true;
};

// ─────────────────────────────────────────────────────────────
// VALIDADORES: AUTENTICACIÓN (/api/auth)
// ─────────────────────────────────────────────────────────────

export const validateRegister = [
    body('email')
        .trim()
        .isEmail().withMessage('Formato de correo inválido.')
        .normalizeEmail()
        .custom(noSQLInjection),

    body('password')
        .isLength({ min: 8, max: 128 }).withMessage('La contraseña debe tener entre 8 y 128 caracteres.')
        .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una letra mayúscula.')
        .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número.'),

    body('full_name')
        .trim()
        .notEmpty().withMessage('El nombre completo es requerido.')
        .isLength({ max: 150 }).withMessage('Nombre demasiado largo.')
        .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/).withMessage('El nombre completo solo puede contener letras, espacios y la letra ñ.')
        .escape()
        .custom(noSQLInjection),

    body('role')
        .optional()
        .isIn(['ADMIN', 'MENTOR', 'APRENDIZ']).withMessage('Rol inválido.'),

    body('current_semester')
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage('El semestre debe ser un número entre 1 y 10.'),

    body('institution')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Institución demasiado larga.')
        .escape()
        .custom(noSQLInjection),

    body('career')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('Carrera demasiado larga.')
        .escape()
        .custom(noSQLInjection),

    body('student_id')
        .optional()
        .trim()
        .isAlphanumeric().withMessage('El ID de estudiante solo puede contener letras y números.')
        .isLength({ max: 50 }).withMessage('ID de estudiante demasiado largo.')
        .custom(noSQLInjection),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La biografía no puede superar 500 caracteres.')
        .escape()
        .custom(noSQLInjection),

    handleValidationErrors
];

export const validateLogin = [
    body('email')
        .trim()
        .isEmail().withMessage('Correo inválido.')
        .normalizeEmail()
        .custom(noSQLInjection),

    body('password')
        .notEmpty().withMessage('La contraseña es requerida.')
        .isLength({ max: 256 }).withMessage('Contraseña demasiado larga.'),

    handleValidationErrors
];

export const validateForgotPassword = [
    body('email')
        .trim()
        .isEmail().withMessage('Correo inválido.')
        .normalizeEmail()
        .custom(noSQLInjection),

    handleValidationErrors
];

export const validateVerifyCode = [
    body('email')
        .trim()
        .isEmail().withMessage('Correo inválido.')
        .normalizeEmail()
        .custom(noSQLInjection),

    body('code')
        .trim()
        .isNumeric().withMessage('El código debe ser numérico.')
        .isLength({ min: 6, max: 6 }).withMessage('El código debe tener exactamente 6 dígitos.'),

    handleValidationErrors
];

export const validateResetPassword = [
    body('email')
        .trim()
        .isEmail().withMessage('Correo inválido.')
        .normalizeEmail()
        .custom(noSQLInjection),

    body('code')
        .trim()
        .isNumeric().withMessage('El código debe ser numérico.')
        .isLength({ min: 6, max: 6 }).withMessage('El código debe tener exactamente 6 dígitos.'),

    body('newPassword')
        .isLength({ min: 8, max: 128 }).withMessage('La contraseña debe tener entre 8 y 128 caracteres.')
        .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una letra mayúscula.')
        .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número.'),

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: USUARIOS (/api/users)
// ─────────────────────────────────────────────────────────────

export const validateUserIdParam = [
    param('id')
        .isInt({ min: 1 }).withMessage('El ID de usuario debe ser un número entero positivo.'),

    handleValidationErrors
];

export const validateUpdateProfile = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de usuario inválido.'),

    body('full_name')
        .optional()
        .trim()
        .isLength({ max: 150 }).withMessage('Nombre demasiado largo.')
        .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/).withMessage('El nombre completo solo puede contener letras, espacios y la letra ñ.')
        .escape()
        .custom(noSQLInjection),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La bio no puede superar 500 caracteres.')
        .escape()
        .custom(noSQLInjection),

    body('institution')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .escape()
        .custom(noSQLInjection),

    body('career')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .escape()
        .custom(noSQLInjection),

    body('student_id')
        .optional()
        .trim()
        .isAlphanumeric().withMessage('ID de estudiante inválido.')
        .isLength({ max: 50 })
        .custom(noSQLInjection),

    body('current_semester')
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage('Semestre inválido.'),

    handleValidationErrors
];

export const validateFeaturedBadges = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de usuario inválido.'),

    body('badgeIds')
        .isArray({ max: 4 }).withMessage('Solo puedes destacar hasta 4 logros/insignias.'),

    body('badgeIds.*')
        .isInt({ min: 1 }).withMessage('ID de insignia inválido.'),

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: TUTORÍAS (/api/mentorships)
// ─────────────────────────────────────────────────────────────

export const validateCreateMentorship = [
    body('mentor_id')
        .isInt({ min: 1 }).withMessage('ID de mentor inválido.'),

    body('subject_id')
        .isInt({ min: 1 }).withMessage('ID de materia inválido.'),

    body('scheduled_date')
        .optional()
        .isISO8601().withMessage('Fecha inválida. Use formato ISO 8601.'),

    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Las notas no pueden superar 1000 caracteres.')
        .escape()
        .custom(noSQLInjection),

    handleValidationErrors
];

export const validateMentorshipIdParam = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de tutoría inválido.'),

    handleValidationErrors
];

export const validateRateMentorship = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de tutoría inválido.'),

    body('rating')
        .isFloat({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5.'),

    body('feedback')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('El feedback no puede superar 1000 caracteres.')
        .escape()
        .custom(noSQLInjection),

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: TICKETS (/api/tickets)
// ─────────────────────────────────────────────────────────────

export const validateCreateTicket = [
    body('subject')
        .trim()
        .notEmpty().withMessage('El asunto es requerido.')
        .isLength({ max: 200 }).withMessage('El asunto no puede superar 200 caracteres.')
        .escape()
        .custom(noSQLInjection),

    body('description')
        .trim()
        .notEmpty().withMessage('La descripción es requerida.')
        .isLength({ max: 2000 }).withMessage('La descripción no puede superar 2000 caracteres.')
        .escape()
        .custom(noSQLInjection),

    body('category')
        .optional()
        .isIn(['BUG', 'SOPORTE', 'CONSULTA', 'OTRO']).withMessage('Categoría inválida.'),

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: REPOSITORIO (/api/repository)
// ─────────────────────────────────────────────────────────────

export const validateRepositoryMaterial = [
    body('title')
        .trim()
        .notEmpty().withMessage('El título es requerido.')
        .isLength({ max: 200 }).withMessage('El título no puede superar 200 caracteres.')
        .escape()
        .custom(noSQLInjection),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('La descripción no puede superar 1000 caracteres.')
        .escape()
        .custom(noSQLInjection),

    handleValidationErrors
];

export const validateMentorshipIdRouteParam = [
    param('mentorshipId')
        .isInt({ min: 1 }).withMessage('ID de tutoría inválido.'),

    handleValidationErrors
];

export const validateMaterialIdParam = [
    param('materialId')
        .isInt({ min: 1 }).withMessage('ID de material inválido.'),

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: ADMINISTRACIÓN (/api/admin)
// ─────────────────────────────────────────────────────────────

export const validateAdminUserIdParam = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de usuario inválido.'),

    handleValidationErrors
];

export const validateUpdateUserStatus = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de usuario inválido.'),

    body('status')
        .isIn(['ACTIVO', 'BLOQUEADO', 'PENDIENTE']).withMessage('Estado inválido.'),

    handleValidationErrors
];

export const validateUpdateUserRole = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID de usuario inválido.'),

    body('role')
        .isIn(['ADMIN', 'MENTOR', 'APRENDIZ']).withMessage('Rol inválido.'),

    handleValidationErrors
];

export const validateCreateBadge = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre de la insignia es requerido.')
        .isLength({ max: 100 }).withMessage('Nombre demasiado largo.')
        .escape()
        .custom(noSQLInjection),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Descripción demasiado larga.')
        .escape()
        .custom(noSQLInjection),

    body('type')
        .optional()
        .isIn(['LOGRO', 'NIVEL', 'ESPECIAL', 'PARTICIPACION']).withMessage('Tipo de insignia inválido.'),

    body('cost_coins')
        .optional()
        .isInt({ min: 0 }).withMessage('El costo debe ser un número no negativo.'),

    handleValidationErrors
];

export const validateCreateCareer = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre de la carrera es requerido.')
        .isLength({ max: 200 }).withMessage('Nombre demasiado largo.')
        .escape()
        .custom(noSQLInjection),

    body('code')
        .optional()
        .trim()
        .isAlphanumeric().withMessage('El código de carrera solo puede tener letras y números.')
        .isLength({ max: 20 })
        .custom(noSQLInjection),

    handleValidationErrors
];

export const validateCreateSubject = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre de la materia es requerido.')
        .isLength({ max: 200 }).withMessage('Nombre demasiado largo.')
        .escape()
        .custom(noSQLInjection),

    body('code')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .escape()
        .custom(noSQLInjection),

    body('career_id')
        .optional()
        .isInt({ min: 1 }).withMessage('ID de carrera inválido.'),

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: CHAT (/api/chat)
// ─────────────────────────────────────────────────────────────

export const validateSendMessage = [
    body('content')
        .trim()
        .notEmpty().withMessage('El mensaje no puede estar vacío.')
        .isLength({ max: 5000 }).withMessage('El mensaje no puede superar 5000 caracteres.'),
    // No escapamos el contenido del chat para no romper emojis ni caracteres especiales,
    // pero limitamos el largo y confiamos en los prepared statements de la DB.

    handleValidationErrors
];

// ─────────────────────────────────────────────────────────────
// VALIDADORES: TUTORÍAS APLICACIONES (postulaciones de tutores)
// ─────────────────────────────────────────────────────────────

export const validateCreateApplication = [
    body('motivation')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('La motivación no puede superar 2000 caracteres.')
        .escape()
        .custom(noSQLInjection),

    body('subject_ids')
        .optional()
        .isArray().withMessage('Las materias deben ser un array.'),

    body('subject_ids.*')
        .optional()
        .isInt({ min: 1 }).withMessage('ID de materia inválido.'),

    handleValidationErrors
];
