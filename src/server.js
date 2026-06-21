import 'dotenv/config';
import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { registerChatSocket } from './sockets/chatSocket.js';
import { initReminderScheduler } from './services/reminderScheduler.js';

import db from './config/db.js';
import connectMongo from './config/mongo.js';

const PORT = process.env.PORT || 3000;

connectMongo();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

registerChatSocket(io);
initReminderScheduler();

server.listen(PORT, () => {
    console.log(`Servidor backend y WebSockets corriendo en puerto ${PORT}`);
});

