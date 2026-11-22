import { Router } from 'express';
import * as users from '../controllers/users.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { idParams } from '../validation/common.schemas.js';
import { listUsersQuery, updateStatusBody, updateMeBody, changePasswordBody, deactivateMeBody } from '../validation/users.schemas.js';
import { changePasswordLimiter } from '../middleware/rate-limit.js';

export const usersRouter = Router();
usersRouter.use(authenticate);   // every /users route needs a signed-in user

// The signed-in user's own account ( /me must come before /:id )
usersRouter.get('/me', users.getMe);                                         // R
usersRouter.patch('/me', validate({ body: updateMeBody }), users.updateMe);  // U
usersRouter.patch('/me/password', changePasswordLimiter, validate({ body: changePasswordBody }), users.changePassword); // Settings → Password
usersRouter.post('/me/deactivate', validate({ body: deactivateMeBody }), users.deactivateMe);   // Settings → Danger zone

// Administration
usersRouter.get('/', authorize('admin'), validate({ query: listUsersQuery }), users.list);                                   // R – list
usersRouter.get('/:id', authorize('admin'), validate({ params: idParams }), users.getOne);                                   // R – one
usersRouter.patch('/:id/status', authorize('admin'), validate({ params: idParams, body: updateStatusBody }), users.updateStatus); // U
usersRouter.delete('/:id', authorize('admin'), validate({ params: idParams }), users.remove);                                // D
