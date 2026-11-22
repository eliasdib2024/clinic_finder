import { Router } from 'express';
import * as doctors from '../controllers/doctors.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { signupLimiter } from '../middleware/rate-limit.js';
import { idParams } from '../validation/common.schemas.js';
import { registerDoctorBody, listDoctorsQuery, verificationBody, updateMyProfileBody, resubmitBody } from '../validation/doctors.schemas.js';

export const doctorsRouter = Router();
const adminOnly = [authenticate, authorize('admin')];
const doctorOnly = [authenticate, authorize('doctor')];

doctorsRouter.post('/', signupLimiter, validate({ body: registerDoctorBody }), doctors.register);                          // C – create account
// The signed-in doctor's own profile ( /me routes must come before /:id )
doctorsRouter.get('/me', doctorOnly, doctors.getMe);                                                                   // R
doctorsRouter.patch('/me', doctorOnly, validate({ body: updateMyProfileBody }), doctors.updateMe);                     // U – practice profile
doctorsRouter.post('/me/verification', doctorOnly, validate({ body: resubmitBody }), doctors.resubmit);                 // re-submit a rejected application

doctorsRouter.get('/', adminOnly, validate({ query: listDoctorsQuery }), doctors.list);                                // R – applications
doctorsRouter.get('/:id', adminOnly, validate({ params: idParams }), doctors.getOne);                                  // R
doctorsRouter.patch('/:id/verification', adminOnly, validate({ params: idParams, body: verificationBody }), doctors.review); // U – approve / reject
