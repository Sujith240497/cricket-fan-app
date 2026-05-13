import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { create, open, join, questions, submit, result, history } from '../controllers/battleController.js';

const router = Router();

router.post('/create', authenticate, create);
router.get('/open', authenticate, open);
router.post('/join/:battleId', authenticate, join);
router.get('/questions/:battleId', authenticate, questions);
router.post('/submit/:battleId', authenticate, submit);
router.get('/result/:battleId', authenticate, result);
router.get('/history', authenticate, history);

export default router;
