import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getToday, submitChallenge } from '../controllers/challengeController.js';

const router = Router();

router.get('/today', authenticate, getToday);
router.post('/submit', authenticate, submitChallenge);

export default router;
