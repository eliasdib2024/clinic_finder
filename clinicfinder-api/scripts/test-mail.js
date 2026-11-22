// test-mail.js – checks the email settings in .env by sending one real email.
//   npm run mail:test -- you@example.com
// Uses the same transport as the API (src/config/mailer.js), so if this arrives, the codes will too.
import { mailer, printsToConsole } from '../src/config/mailer.js';
import { config } from '../src/config/env.js';
import { emailVerificationCodeEmail } from '../src/emails/templates.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run mail:test -- you@example.com');
  process.exit(1);
}

const { smtp } = config.mail;
console.log(`Transport: ${config.mail.transport}${printsToConsole ? '' : ` (${smtp.host}:${smtp.port}, secure=${smtp.secure}, user=${smtp.user})`}`);
console.log(`From:      ${config.mail.from}\nTo:        ${to}\n`);

try {
  // A sample verification email with a fake code, so you also see how the real template looks
  const email = emailVerificationCodeEmail({ name: 'Test User', language: 'en', code: '123456' });
  const info = await mailer.sendMail({
    from: config.mail.from, replyTo: config.supportEmail, to,
    subject: `[TEST] ${email.subject}`, text: email.text, html: email.html,
  });
  if (printsToConsole) {
    console.log('MAIL_TRANSPORT=console: nothing was sent. Set MAIL_TRANSPORT=smtp to send a real email.');
  } else {
    console.log(`Sent. Server answer: ${info.response}\nCheck the inbox (and the spam folder) of ${to}.`);
  }
} catch (err) {
  console.error(`NOT sent: ${err.message}`);
  if (err.code === 'EAUTH') console.error('→ Wrong SMTP_USER / SMTP_PASS. With Gmail, SMTP_PASS must be an app password, not your normal password.');
  if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'EDNS'].includes(err.code)) console.error('→ Cannot reach the server: check SMTP_HOST, SMTP_PORT and SMTP_SECURE (465 → true, 587 → false), or a firewall/antivirus.');
  process.exitCode = 1;
} finally {
  mailer.close();
}
