import { createMessage } from '../services/chatService.js';
import db from '../config/db.js';

const getRoomName = (mentorshipId) => `room_${mentorshipId}`;

export const registerChatSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`Usuario conectado al chat: ${socket.id}`);

        socket.on('join_mentorship_room', (mentorshipId) => {
            socket.join(getRoomName(mentorshipId));
            console.log(`Usuario se unio a la sala de tutoria: ${mentorshipId}`);
        });

        socket.on('send_message', async (data) => {
            try {
                // Verificar si la tutoría está en estado inactivo/completada
                const [rows] = await db.query('SELECT status FROM Mentorships WHERE id = ? AND is_deleted = 0', [data.mentorshipId]);
                if (rows.length > 0 && rows[0].status === 'COMPLETADA') {
                    console.log(`Mensaje bloqueado: La tutoría ${data.mentorshipId} está COMPLETADA/CERRADA.`);
                    socket.emit('chat_error', { error: 'La tutoría está cerrada y no se pueden enviar más mensajes.' });
                    return;
                }

                const newMessage = await createMessage({
                    mentorshipId: data.mentorshipId,
                    senderId: data.senderId,
                    message: data.message
                });

                io.to(getRoomName(data.mentorshipId)).emit('receive_message', newMessage);
            } catch (error) {
                console.error('Error al guardar el mensaje:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`Usuario desconectado: ${socket.id}`);
        });
    });
};
