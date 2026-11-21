import { Router } from 'express';
import * as patients from '../controllers/patients.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { signupLimiter } from '../middleware/rate-limit.js';
import { registerPatientBody, healthProfileBody, healthProfilePatchBody } from '../validation/patients.schemas.js';

export const patientsRouter = Router();
const patientOnly = [authenticate, authorize('patient')];

patientsRouter.post('/', signupLimiter, validate({ body: registerPatientBody }), patients.register);          // C – create account
patientsRouter.get('/me', patientOnly, patients.getMe);                                                    // R
patientsRouter.put('/me/health-profile', patientOnly, validate({ body: healthProfileBody }), patients.saveHealthProfile);        // U (full)
patientsRouter.patch('/me/health-profile', patientOnly, validate({ body: healthProfilePatchBody }), patients.updateHealthProfile); // U (partial)
