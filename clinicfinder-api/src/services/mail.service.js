// mail.service.js – sends the app's emails. Knows nothing about HTTP.
//
// Emails are sent in the background: the API answers straight away and never waits for the
// mail server. That keeps responses fast, and it keeps "forgot password" answering in the same
// time whether or not the email has an account (otherwise the delay would reveal it).
// A failed send is logged (without the code) and never crashes the request.
import { mailer, printsToConsole } from '../config/mailer.js';
import { config } from '../config/env.js';
import { logger } from '../loggers/logger.js';
import { passwordResetCodeEmail, passwordChangedEmail, emailVerificationCodeEmail } from '../emails/templates.js';

const log = logger.child({ module: 'mail' });

async function deliver(to, { subject, text, html }, kind) {
  try {
    // replyTo: pressing "Reply" on any of our emails writes to the real support inbox
    const info = await mailer.sendMail({ from: config.mail.from, replyTo: config.supportEmail, to, subject, text, html });
    if (printsToConsole) {
      // Development only (MAIL_TRANSPORT=console): show the email so the flow can be tested without a mail account.
      // In production the transport is smtp and this branch never runs, so codes never reach the logs.
      log.info({ kind, to }, `email not sent (MAIL_TRANSPORT=console)\n──────── ${subject} ────────\n${text}\n────────────────────────────`);
    } else {
      log.info({ kind, messageId: info.messageId }, 'email sent');
    }
  } catch (err) {
    // Not under "code": the logger hides every "*.code" field (reset codes), which would also hide EAUTH, ETIMEDOUT…
    log.error({ kind, smtpError: err.code, smtpResponse: err.response }, `email could not be sent: ${err.message}`);
  }
}

const inBackground = (fn) => { setImmediate(fn); };

export function sendPasswordResetCode(user, code) {
  inBackground(() => deliver(user.email, passwordResetCodeEmail({ name: user.fullName, language: user.language, code }), 'password-reset-code'));
}

export function sendEmailVerificationCode(user, code) {
  inBackground(() => deliver(user.email, emailVerificationCodeEmail({ name: user.fullName, language: user.language, code }), 'email-verification-code'));
}

export function sendPasswordChanged(user, { fromSettings = false } = {}) {
  inBackground(() => deliver(user.email, passwordChangedEmail({ name: user.fullName, language: user.language, fromSettings }), 'password-changed'));
}
