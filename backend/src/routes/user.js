import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile, getLevel_, getStreak } from '../controllers/userController.js';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.get('/level', authenticate, getLevel_);
router.get('/streak', authenticate, getStreak);

export default router;
