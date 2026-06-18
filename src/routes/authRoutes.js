import express from 'express';
import { register, login, forgotPassword, verifyResetCode, resetPassword, verifyEmail, resendVerificationCode } from '../controllers/authController.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.post('/register', upload.single('profile_photo'), register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);

export default router;
