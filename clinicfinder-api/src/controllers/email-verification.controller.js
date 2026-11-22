// email-verification.controller.js – HTTP in, HTTP out. The user is signed in (authenticate ran first).
import * as emailVerification from '../services/email-verification.service.js';

export async function verifyEmail(req, res) {
  res.json(await emailVerification.verifyCode(req.user.id, req.body.code));
}

// 202 Accepted: the code is being emailed in the background
export async function resendVerification(req, res) {
  res.status(202).json(await emailVerification.resendCode(req.user.id));
}
