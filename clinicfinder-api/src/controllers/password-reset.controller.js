// password-reset.controller.js – HTTP in, HTTP out. Input is already validated by the middleware.
import * as passwordReset from '../services/password-reset.service.js';

// 202 Accepted: the request is taken; whether an email goes out is deliberately not revealed
export async function forgotPassword(req, res) {
  res.status(202).json(await passwordReset.requestReset(req.body.email));
}

export async function verifyResetCode(req, res) {
  res.json(await passwordReset.verifyCode(req.body.email, req.body.code));
}

export async function resetPassword(req, res) {
  res.json(await passwordReset.resetPassword(req.body.resetToken, req.body.password));
}
