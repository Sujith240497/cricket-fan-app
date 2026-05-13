import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upcoming, live, completed, all, getMatch, completeMatch, syncMatches } from '../controllers/matchController.js';

const router = Router();

router.get('/upcoming', authenticate, upcoming);
router.get('/live', authenticate, live);
router.get('/completed', authenticate, completed);
router.get('/all', authenticate, all);
router.get('/:id', authenticate, getMatch);
router.post('/complete/:matchId', authenticate, completeMatch);
router.post('/sync', authenticate, syncMatches);

export default router;
