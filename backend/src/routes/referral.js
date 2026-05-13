import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { stats, claim, getCode } from '../controllers/referralController.js';

const router = Router();

router.get('/stats', authenticate, stats);
router.post('/claim', authenticate, claim);
router.get('/code', authenticate, getCode);

export default router;
