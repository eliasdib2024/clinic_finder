import { Router } from 'express';
import * as lookups from '../controllers/lookups.controller.js';

export const lookupsRouter = Router();

lookupsRouter.get('/', lookups.getAll);   // public: the sign-up forms need it before the user has an account
