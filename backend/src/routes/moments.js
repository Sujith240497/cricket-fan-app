import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getToday, getMyMoments } from '../controllers/momentController.js';

const router = Router();

router.get('/today', authenticate, getToday);
router.get('/mine', authenticate, getMyMoments);

export default router;
