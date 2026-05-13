import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAll, getUnread, markRead } from '../controllers/notificationController.js';

const router = Router();

router.get('/', authenticate, getAll);
router.get('/unread', authenticate, getUnread);
router.post('/read', authenticate, markRead);

export default router;
