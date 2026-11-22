import { forbidden } from '../errors/http-error.js';

// authorize('admin') or authorize('doctor', 'admin') – use after authenticate
export const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(forbidden());
