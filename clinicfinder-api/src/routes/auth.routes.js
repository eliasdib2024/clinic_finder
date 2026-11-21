import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginLimiter } from '../middleware/rate-limit.js';
import { loginBody } from '../validation/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate({ body: loginBody }), auth.login);   // sign in (any role)
authRouter.get('/me', authenticate, auth.me);                                         // who am I?
