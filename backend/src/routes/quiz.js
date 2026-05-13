import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getQuestions, submitAnswer } from '../controllers/quizController.js';

const router = Router();

router.get('/questions', authenticate, getQuestions);
router.post('/answer', authenticate, submitAnswer);

export default router;
