// auth.controller.js – HTTP in, HTTP out. Input is already validated by the middleware.
import * as authService from '../services/auth.service.js';

export async function login(req, res) {
  const session = await authService.login(req.body);
  req.log.info({ userId: session.user.id, role: session.user.role }, 'signed in');
  res.json(session);
}

export async function me(req, res) {
  res.json(await authService.me(req.user.id));
}
