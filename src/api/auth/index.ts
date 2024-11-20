import { Router } from 'express';

import * as authController from './authController';
import { heartbeat } from './heartbeat';

const router = Router();

router.post('/sign-up', authController.signup);
router.get('/heartbeat', heartbeat);
export = router;
