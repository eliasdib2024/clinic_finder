// one-time-code.js – 6-digit codes for password reset.
//
// • Generated with crypto.randomInt (cryptographically secure, every code equally likely).
// • Only an HMAC of the code is stored, keyed with the server's pepper: someone who reads the
//   database cannot learn or test codes without the secret. A fast HMAC is enough here because
//   each code is limited to 5 attempts and 10 minutes (bcrypt is for passwords, which have no such limits).
// • Compared in constant time, so response timing reveals nothing about how close a guess was.
import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../config/env.js';

export const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashCode = (code) =>
  createHmac('sha256', config.password.pepper).update(`password-reset:${code}`).digest('hex');

export function codeMatches(code, storedHash) {
  if (!storedHash) return false;
  const a = Buffer.from(hashCode(code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Short fingerprint of a stored value, put inside tokens so they stop working when the value changes
// (the password hash, or the reset code). The value itself is never put in the token.
export const fingerprint = (value) =>
  createHash('sha256').update(String(value)).digest('base64url').slice(0, 16);
