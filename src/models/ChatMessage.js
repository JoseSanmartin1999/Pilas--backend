import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    mentorship_id: {
        type: Number, // Viene de tu tabla en TiDB, por eso es un número
        required: true,
        index: true // ¡Súper importante! Esto hace que buscar el historial de una tutoría sea rapidísimo
    },
    sender_id: {
        type: Number, // ID del mentor o aprendiz (también de TiDB)
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true // Quita espacios vacíos al inicio y al final
    }
}, {
    timestamps: true // Esto crea automáticamente las columnas 'createdAt' y 'updatedAt'
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;