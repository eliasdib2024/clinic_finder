// index.js – every API route, mounted under /api/v1
import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { patientsRouter } from './patients.routes.js';
import { doctorsRouter } from './doctors.routes.js';
import { usersRouter } from './users.routes.js';
import { lookupsRouter } from './lookups.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/patients', patientsRouter);
apiRouter.use('/doctors', doctorsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/lookups', lookupsRouter);
