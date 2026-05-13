import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { create, mine } from '../controllers/predictionController.js';

const router = Router();

router.post('/', authenticate, create);
router.get('/mine', authenticate, mine);

export default router;
