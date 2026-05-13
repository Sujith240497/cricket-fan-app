import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getGlobal, getWeekly, getMovers, compare } from '../controllers/leaderboardController.js';

const router = Router();

router.get('/', authenticate, getGlobal);
router.get('/weekly', authenticate, getWeekly);
router.get('/movers', authenticate, getMovers);
router.get('/compare/:userId', authenticate, compare);

export default router;
