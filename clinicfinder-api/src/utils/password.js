// password.js – hashing with bcrypt + a secret pepper.
//
//   stored hash = bcrypt( HMAC-SHA256(password, PASSWORD_PEPPER) )
//
// • bcrypt adds a random salt per user and is deliberately slow (cost = BCRYPT_ROUNDS).
// • The pepper is a secret kept in the environment, NOT in the database: a leaked database
//   alone is not enough to start guessing passwords.
// • HMAC first also keeps the input at a fixed length (bcrypt ignores bytes after 72).
// Changing PASSWORD_PEPPER later makes every existing password invalid – set it once.
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const pepper = (password) => createHmac('sha256', config.password.pepper).update(password, 'utf8').digest('base64');

export const hashPassword = (password) => bcrypt.hash(pepper(password), config.password.rounds);

export const verifyPassword = (password, hash) => bcrypt.compare(pepper(password), hash);

// Used when the email is unknown, so a failed sign-in takes the same time either way
// (an attacker cannot tell which emails have accounts by measuring response time).
let dummyHash;
export async function fakeVerify(password) {
  dummyHash ??= await hashPassword('not-a-real-password');
  await verifyPassword(password, dummyHash);
  return false;
}
