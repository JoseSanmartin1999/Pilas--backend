import ChatMessage from '../models/ChatMessage.js';

export const createMessage = async ({ mentorshipId, senderId, message }) => {
    return ChatMessage.create({
        mentorship_id: mentorshipId,
        sender_id: senderId,
        message
    });
};

export const getChatHistory = async (mentorshipId) => {
    return ChatMessage.find({ mentorship_id: mentorshipId }).sort({ createdAt: 1 });
};
