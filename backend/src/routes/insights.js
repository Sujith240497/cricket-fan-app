import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getInsights, getTimeline } from '../controllers/insightController.js';

const router = Router();

router.get('/', authenticate, getInsights);
router.get('/timeline', authenticate, getTimeline);

export default router;
