import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMultipliers } from '../controllers/multiplierController.js';

const router = Router();

router.get('/', authenticate, getMultipliers);

export default router;
