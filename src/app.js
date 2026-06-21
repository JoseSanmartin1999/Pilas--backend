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

// 1. Cabeceras de seguridad con Helmet
app.use(helmet());

// 2. Configuración Restringida de CORS
const whitelist = [
    'http://localhost:5173',
    'https://pilas-tutorias.web.app',
    'https://pilas-tutorias.firebaseapp.com'
];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Acceso denegado por políticas de CORS (Pilas! Ciberseguridad)'));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// 3. Limitación de Tasa (Rate Limiting)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes desde esta IP, por favor inténtalo de nuevo más tarde.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Límite de solicitudes de autenticación superado. Inténtalo de nuevo más tarde.' }
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' })); // Permitir payloads grandes

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

// Middleware Global de Errores para que siempre retorne JSON y no HTML (Ej. cuando falla un middleware o DB)
app.use((err, req, res, next) => {
    console.error("Error global interceptado:", err);
    res.status(err.status || 500).json({
        message: "Error interno del servidor",
        error: err.message || "Error desconocido",
        detalles: process.env.NODE_ENV === 'development' ? err : undefined
    });
});

export default app;