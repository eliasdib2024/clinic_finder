import { Router } from 'express';
import * as doctors from '../controllers/doctors.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { signupLimiter } from '../middleware/rate-limit.js';
import { idParams } from '../validation/common.schemas.js';
import { registerDoctorBody, listDoctorsQuery, verificationBody } from '../validation/doctors.schemas.js';

export const doctorsRouter = Router();
const adminOnly = [authenticate, authorize('admin')];

doctorsRouter.post('/', signupLimiter, validate({ body: registerDoctorBody }), doctors.register);                          // C – create account
doctorsRouter.get('/', adminOnly, validate({ query: listDoctorsQuery }), doctors.list);                                // R – applications
doctorsRouter.get('/:id', adminOnly, validate({ params: idParams }), doctors.getOne);                                  // R
doctorsRouter.patch('/:id/verification', adminOnly, validate({ params: idParams, body: verificationBody }), doctors.review); // U – approve / reject
