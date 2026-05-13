import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { react, eventReactions, myStats, reactionTypes } from '../controllers/reactionController.js';

const router = Router();

router.post('/', authenticate, react);
router.get('/types', authenticate, reactionTypes);
router.get('/stats', authenticate, myStats);
router.get('/event/:eventId', authenticate, eventReactions);

export default router;
