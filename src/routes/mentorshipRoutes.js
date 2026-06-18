import express from 'express';
import { createMentorship, getMentorshipsByUser, updateMentorship, getNotificationCounts, markAsRead, deleteMentorship, closeMentorship, rateMentorship } from '../controllers/mentorshipController.js';

const router = express.Router();

// POST /api/mentorships
router.post('/', createMentorship);

// GET /api/mentorships/user/:userId
router.get('/user/:userId', getMentorshipsByUser);

// PUT /api/mentorships/:id/close
router.put('/:id/close', closeMentorship);

// PUT /api/mentorships/:id/rate
router.put('/:id/rate', rateMentorship);

// PUT /api/mentorships/:id
router.put('/:id', updateMentorship);

// GET /api/mentorships/counts/:userId
router.get('/counts/:userId', getNotificationCounts);

// PATCH /api/mentorships/:id/read
router.patch('/:id/read', markAsRead);

// DELETE /api/mentorships/:id
router.delete('/:id', deleteMentorship);

export default router;
