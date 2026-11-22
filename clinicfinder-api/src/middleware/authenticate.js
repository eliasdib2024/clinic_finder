import { unauthorized, forbidden } from '../errors/http-error.js';
import { verifyAccessToken, passwordVersion } from '../utils/jwt.js';
import * as usersRepository from '../repositories/users.repository.js';

// Requires "Authorization: Bearer <token>". On success: req.user = { id, role }.
// The account is re-checked on every request, so a suspended user is locked out immediately
// even though their token has not expired yet. The same check signs out every session
// once the password has been changed or reset (the token's `pwv` no longer matches).
export async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('Authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    return next(unauthorized(err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please sign in again.'
      : 'Invalid sign-in token. Please sign in again.'));
  }

  const account = await usersRepository.findAuthState(Number(payload.sub));
  if (!account) return next(unauthorized('This account no longer exists.'));
  if (payload.pwv !== passwordVersion(account.passwordHash)) {
    return next(unauthorized('Your password was changed. Please sign in again.'));
  }
  if (account.status !== 'active') return next(forbidden('This account is not active. Contact support@clinicfinder.lb.'));

  req.user = { id: account.id, role: account.role };
  next();
}
