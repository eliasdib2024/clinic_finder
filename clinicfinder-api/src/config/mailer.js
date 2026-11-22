// mailer.js – the one Nodemailer transport for the whole app.
//
//   MAIL_TRANSPORT=console  development: the email is printed in the API terminal, nothing leaves the computer
//   MAIL_TRANSPORT=smtp     any SMTP provider. Amazon SES (recommended on AWS), SendGrid, Mailgun, Gmail…
//                           only the SMTP_* values in .env change, never the code.
import nodemailer from 'nodemailer';
import { config } from './env.js';
import { logger } from '../loggers/logger.js';

const { transport, smtp } = config.mail;
const log = logger.child({ module: 'mail' });

export const mailer = transport === 'smtp'
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,                  // true = TLS from the start (465); false = upgrade with STARTTLS (587)
      requireTLS: !smtp.secure,             // never send credentials or codes over an unencrypted connection
      auth: { user: smtp.user, pass: smtp.pass },
      pool: true,                           // reuse connections instead of opening one per email
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  : nodemailer.createTransport({ jsonTransport: true });   // builds the message without sending it

export const printsToConsole = transport === 'console';

// Says at start-up which mode is active, and with smtp checks the login straight away,
// so a wrong host, port or app password shows in the terminal instead of failing silently later.
if (!config.isTest) {
  if (printsToConsole) {
    log.warn('MAIL_TRANSPORT=console: emails are printed in this terminal, NOT sent. Set MAIL_TRANSPORT=smtp to send them.');
  } else {
    mailer.verify()
      .then(() => log.info({ host: smtp.host, port: smtp.port, user: smtp.user }, 'SMTP connection OK, emails will be sent'))
      .catch((err) => log.error(
        { host: smtp.host, port: smtp.port, user: smtp.user, smtpError: err.code, smtpResponse: err.response },
        `SMTP connection FAILED: ${err.message}`,
      ));
  }
}
