import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import mentorshipRoutes from './routes/mentorshipRoutes.js';
import repositoryRoutes from './routes/repositoryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';

const app = express();

// Confiar en los proxies inversos de manera robusta

// 1. Cabeceras de seguridad con Helmet
app.use(helmet());

// 2. Configuración Restringida de CORS
const whitelist = new Set([
    'http://localhost:5173',
    'https://pilas-tutorias.web.app',
    'https://pilas-tutorias.firebaseapp.com',
    'https://pilas-frontend.vercel.app',
    "https://pilastutorias.space/"
]);
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.has(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Acceso denegado por políticas de CORS (Pilas! Ciberseguridad)'));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// Helper robusto para extraer la dirección IP real del cliente detrás de proxies (Nginx, Render, Cloudflare, etc.)
const getClientIp = (req) => {
    // 1. Intentar cabecera estándar X-Forwarded-For (la primera IP de la lista es el cliente real)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        const ips = xForwardedFor.split(',');
        return ips[0].trim();
    }
    // 2. Cabecera común de Nginx (X-Real-IP)
    if (req.headers['x-real-ip']) {
        return req.headers['x-real-ip'];
    }
    // 3. Cabecera de Cloudflare (CF-Connecting-IP)
    if (req.headers['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }
    // 4. Fallback a req.ip resuelto por Express o socket remoto
    return req.ip || req.socket.remoteAddress;
};

// 3. Limitación de Tasa (Rate Limiting) robusta y flexible
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 5000, // Aumentado a 5000 para evitar bloqueos por navegación normal (SPA) e IP compartida (NAT)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { trustProxy: false, keyGeneratorIpFallback: false },
    skip: (req) =>
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test' ||
        (process.env.BYPASS_RATE_LIMIT_TOKEN && req.headers['x-bypass-rate-limit'] === process.env.BYPASS_RATE_LIMIT_TOKEN),
    keyGenerator: (req) => {
        // Intentar identificar al usuario por su token de autenticación si existe
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7); // Limita por usuario logueado, útil para NAT/universidades
        }
        return getClientIp(req);
    },
    message: { error: 'Demasiadas solicitudes, por favor inténtalo de nuevo más tarde.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 150, // Aumentado a 150 para evitar bloqueos en logins masivos desde la misma IP (ej. universidad)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: { trustProxy: false, keyGeneratorIpFallback: false },
    skip: (req) =>
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test' ||
        (process.env.BYPASS_RATE_LIMIT_TOKEN && req.headers['x-bypass-rate-limit'] === process.env.BYPASS_RATE_LIMIT_TOKEN),
    keyGenerator: (req) => {
        return getClientIp(req);
    },
    message: { error: 'Límite de solicitudes de autenticación superado. Inténtalo de nuevo más tarde.' }
});

app.use(generalLimiter);
app.use(express.json({ limit: '5mb' })); // Limitar tamaño del payload para prevenir ataques de DoS
app.use(express.urlencoded({ extended: false, limit: '5mb' })); // Parsear form data

// Aplicar limitador estricto para rutas de autenticación
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Rutas 1
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mentorships', mentorshipRoutes);
app.use('/api/repository', repositoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/rewards', rewardRoutes);

// Health check endpoint for testing and container health checking
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Servidor saludable' });
});

// Middleware para rutas no encontradas (404) — Evita filtración de info sobre la estructura del servidor
app.use((req, res, next) => {
    res.status(404).json({ error: 'Recurso no encontrado.' });
});

// Middleware Global de Errores para que siempre retorne JSON y no HTML (Ej. cuando falla un middleware o DB)
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || (typeof err.status === 'number' ? err.status : 500);

    if (statusCode === 500 || !err.isOperational) {
        console.error("Error global interceptado:", err);
    } else {
        console.warn(`[${statusCode}] Error operacional:`, err.message);
    }

    // En producción, NO exponer detalles del error interno de servidor para evitar filtración de información
    res.status(statusCode).json({
        error: (process.env.NODE_ENV === 'production' && statusCode === 500)
            ? 'Error interno del servidor.'
            : (err.message || 'Error desconocido')
    });
});

export default app;