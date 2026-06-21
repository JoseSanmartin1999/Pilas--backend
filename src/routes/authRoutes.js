import express from 'express';
import { register, login, forgotPassword, verifyResetCode, resetPassword, verifyEmail, resendVerificationCode } from '../controllers/authController.js';
import { upload } from '../config/cloudinary.js';
import {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateVerifyCode,
    validateResetPassword
} from '../middleware/validators.js';

const router = express.Router();

router.post('/register', upload.single('profile_photo'), validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-reset-code', validateVerifyCode, verifyResetCode);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/verify-email', validateVerifyCode, verifyEmail);
router.post('/resend-verification', validateForgotPassword, resendVerificationCode);

export default router;
