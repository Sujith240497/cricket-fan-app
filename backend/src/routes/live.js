import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tick, getActive, getRecent, getEvent } from '../controllers/liveController.js';

const router = Router();

router.post('/tick', authenticate, tick);
router.get('/active', authenticate, getActive);
router.get('/recent', authenticate, getRecent);
router.get('/:id', authenticate, getEvent);

export default router;
