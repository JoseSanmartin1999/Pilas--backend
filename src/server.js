import app from './app.js';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { registerChatSocket } from './sockets/chatSocket.js';

import db from './config/db.js';
import connectMongo from './config/mongo.js';

dotenv.config();

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

server.listen(PORT, () => {
    console.log(`Servidor backend y WebSockets corriendo en puerto ${PORT}`);
});
