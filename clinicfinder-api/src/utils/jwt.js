// jwt.js – sign and verify the access token sent as "Authorization: Bearer <token>"
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signAccessToken(user, { remember = false } = {}) {
  return jwt.sign({ role: user.role }, config.jwt.secret, {
    subject: String(user.id),
    expiresIn: remember ? config.jwt.rememberExpiresIn : config.jwt.expiresIn,
  });
}

// Throws if the token is invalid or expired
export const verifyAccessToken = (token) => jwt.verify(token, config.jwt.secret);
