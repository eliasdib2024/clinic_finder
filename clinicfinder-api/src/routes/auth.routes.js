import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as passwordReset from '../controllers/password-reset.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  loginLimiter, forgotPasswordIpLimiter, forgotPasswordEmailLimiter, verifyResetCodeLimiter, resetPasswordLimiter,
} from '../middleware/rate-limit.js';
import { loginBody, forgotPasswordBody, verifyResetCodeBody, resetPasswordBody } from '../validation/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate({ body: loginBody }), auth.login);   // sign in (any role)
authRouter.get('/me', authenticate, auth.me);                                         // who am I?

// Forgot password (public): 1. email a code → 2. verify it → 3. set the new password
authRouter.post('/forgot-password', forgotPasswordIpLimiter, validate({ body: forgotPasswordBody }),
  forgotPasswordEmailLimiter, passwordReset.forgotPassword);
authRouter.post('/verify-reset-code', verifyResetCodeLimiter, validate({ body: verifyResetCodeBody }),
  passwordReset.verifyResetCode);
authRouter.post('/reset-password', resetPasswordLimiter, validate({ body: resetPasswordBody }),
  passwordReset.resetPassword);
