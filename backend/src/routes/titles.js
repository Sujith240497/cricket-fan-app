import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { mine, userTitles, allTitles, check } from '../controllers/titleController.js';

const router = Router();

router.get('/mine', authenticate, mine);
router.get('/user/:userId', authenticate, userTitles);
router.get('/all', authenticate, allTitles);
router.post('/check', authenticate, check);

export default router;
