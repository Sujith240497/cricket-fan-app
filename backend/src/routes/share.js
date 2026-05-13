import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { profile, me, logEvent } from '../controllers/shareController.js';

const router = Router();

router.get('/profile/:userId', authenticate, profile);
router.get('/me', authenticate, me);
router.post('/event', authenticate, logEvent);

export default router;
