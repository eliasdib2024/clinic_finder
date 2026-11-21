import { z } from 'zod';
import { email } from './common.schemas.js';

export const loginBody = z.object({
  email,
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.').max(128),
  remember: z.boolean().default(false),
}).strict();
