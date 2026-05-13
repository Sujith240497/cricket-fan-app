import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { challenge, submit, kohliMatches } from '../controllers/kohliController.js';

const router = Router();

router.get('/challenge', authenticate, challenge);
router.post('/submit', authenticate, submit);
router.get('/matches', authenticate, kohliMatches);

export default router;
