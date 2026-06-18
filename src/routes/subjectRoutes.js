import express from 'express';
import { getSubjectsBySemester } from '../controllers/subjectController.js';

const router = express.Router();

router.get('/', getSubjectsBySemester);

export default router;
