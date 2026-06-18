import express from 'express';
import cors from 'cors';
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

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Permitir payloads grandes

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