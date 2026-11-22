// templates.js – security emails in the account's language (en, fr, ar).
// Each template returns { subject, text, html }. The plain-text part matters: some mail apps
// show only text, and spam filters trust messages that have both.
import { config } from '../config/env.js';

const STRINGS = {
  en: {
    dir: 'ltr',
    resetSubject: 'Your ClinicFinder password reset code',
    resetPreview: 'Use this code to reset your password. It expires in {m} minutes.',
    hello: 'Hello {name},',
    resetIntro: 'We received a request to reset the password of your ClinicFinder account. Enter this code on the reset page:',
    resetExpiry: 'The code expires in {m} minutes and can only be used once.',
    resetIgnore: 'If you did not ask to reset your password, you can ignore this email. Your password stays the same, and nobody can change it without this code.',
    resetNever: 'ClinicFinder will never ask you for this code by phone, SMS or chat.',
    resetButton: 'Open the reset page',
    verifySubject: 'Confirm your ClinicFinder email address',
    verifyPreview: 'Your confirmation code. It expires in {m} minutes.',
    verifyIntro: 'Welcome to ClinicFinder! To confirm that this email address is yours, enter this code in the app:',
    verifyExpiry: 'The code expires in {m} minutes. You can ask for a new one from the app at any time.',
    verifyIgnore: 'If you did not create a ClinicFinder account, you can ignore this email.',
    verifyButton: 'Open ClinicFinder',
    changedSubject: 'Your ClinicFinder password was changed',
    changedPreview: 'Your password was just changed.',
    changedIntro: 'The password of your ClinicFinder account was changed on {when} (Beirut time). For your security, you were signed out on every device.',
    changedIntroOthers: 'The password of your ClinicFinder account was changed on {when} (Beirut time) from your account settings. For your security, you were signed out on your other devices.',
    changedOk: 'If this was you, there is nothing else to do.',
    changedNotYou: 'If you did not change it, reset your password now and contact {support}.',
    changedButton: 'Reset my password',
    footer: 'You are receiving this security email because of activity on your ClinicFinder account.',
  },
  fr: {
    dir: 'ltr',
    resetSubject: 'Votre code de réinitialisation ClinicFinder',
    resetPreview: 'Utilisez ce code pour réinitialiser votre mot de passe. Il expire dans {m} minutes.',
    hello: 'Bonjour {name},',
    resetIntro: 'Nous avons reçu une demande de réinitialisation du mot de passe de votre compte ClinicFinder. Saisissez ce code sur la page de réinitialisation :',
    resetExpiry: 'Le code expire dans {m} minutes et ne peut être utilisé qu’une seule fois.',
    resetIgnore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail. Votre mot de passe reste inchangé et personne ne peut le modifier sans ce code.',
    resetNever: 'ClinicFinder ne vous demandera jamais ce code par téléphone, SMS ou messagerie.',
    resetButton: 'Ouvrir la page de réinitialisation',
    verifySubject: 'Confirmez votre adresse e-mail ClinicFinder',
    verifyPreview: 'Votre code de confirmation. Il expire dans {m} minutes.',
    verifyIntro: 'Bienvenue sur ClinicFinder ! Pour confirmer que cette adresse e-mail vous appartient, saisissez ce code dans l’application :',
    verifyExpiry: 'Le code expire dans {m} minutes. Vous pouvez en demander un nouveau depuis l’application à tout moment.',
    verifyIgnore: 'Si vous n’avez pas créé de compte ClinicFinder, ignorez cet e-mail.',
    verifyButton: 'Ouvrir ClinicFinder',
    changedSubject: 'Votre mot de passe ClinicFinder a été modifié',
    changedPreview: 'Votre mot de passe vient d’être modifié.',
    changedIntro: 'Le mot de passe de votre compte ClinicFinder a été modifié le {when} (heure de Beyrouth). Par sécurité, vous avez été déconnecté de tous vos appareils.',
    changedIntroOthers: 'Le mot de passe de votre compte ClinicFinder a été modifié le {when} (heure de Beyrouth) depuis les paramètres du compte. Par sécurité, vous avez été déconnecté de vos autres appareils.',
    changedOk: 'Si c’est vous, vous n’avez rien d’autre à faire.',
    changedNotYou: 'Si ce n’est pas vous, réinitialisez votre mot de passe maintenant et contactez {support}.',
    changedButton: 'Réinitialiser mon mot de passe',
    footer: 'Vous recevez cet e-mail de sécurité suite à une activité sur votre compte ClinicFinder.',
  },
  ar: {
    dir: 'rtl',
    resetSubject: 'رمز إعادة تعيين كلمة المرور في ClinicFinder',
    resetPreview: 'استخدم هذا الرمز لإعادة تعيين كلمة المرور. تنتهي صلاحيته خلال {m} دقائق.',
    hello: 'مرحبًا {name}،',
    resetIntro: 'تلقّينا طلبًا لإعادة تعيين كلمة مرور حسابك في ClinicFinder. أدخل هذا الرمز في صفحة إعادة التعيين:',
    resetExpiry: 'تنتهي صلاحية الرمز خلال {m} دقائق ولا يمكن استخدامه إلا مرة واحدة.',
    resetIgnore: 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة. تبقى كلمة مرورك كما هي، ولا يمكن لأحد تغييرها من دون هذا الرمز.',
    resetNever: 'لن تطلب منك ClinicFinder هذا الرمز أبدًا عبر الهاتف أو الرسائل القصيرة أو الدردشة.',
    resetButton: 'فتح صفحة إعادة التعيين',
    verifySubject: 'تأكيد بريدك الإلكتروني في ClinicFinder',
    verifyPreview: 'رمز التأكيد الخاص بك. تنتهي صلاحيته خلال {m} دقيقة.',
    verifyIntro: 'مرحبًا بك في ClinicFinder! لتأكيد أن عنوان البريد الإلكتروني هذا يخصّك، أدخل هذا الرمز في التطبيق:',
    verifyExpiry: 'تنتهي صلاحية الرمز خلال {m} دقيقة. يمكنك طلب رمز جديد من التطبيق في أي وقت.',
    verifyIgnore: 'إذا لم تقم بإنشاء حساب في ClinicFinder، يمكنك تجاهل هذه الرسالة.',
    verifyButton: 'فتح ClinicFinder',
    changedSubject: 'تم تغيير كلمة مرورك في ClinicFinder',
    changedPreview: 'تم تغيير كلمة مرورك للتو.',
    changedIntro: 'تم تغيير كلمة مرور حسابك في ClinicFinder بتاريخ {when} (بتوقيت بيروت). حفاظًا على أمانك، تم تسجيل خروجك من جميع الأجهزة.',
    changedIntroOthers: 'تم تغيير كلمة مرور حسابك في ClinicFinder بتاريخ {when} (بتوقيت بيروت) من إعدادات الحساب. حفاظًا على أمانك، تم تسجيل خروجك من أجهزتك الأخرى.',
    changedOk: 'إذا كنت أنت من قام بذلك، فلا داعي لأي إجراء آخر.',
    changedNotYou: 'إذا لم تقم بتغييرها، أعد تعيين كلمة المرور الآن وتواصل مع {support}.',
    changedButton: 'إعادة تعيين كلمة المرور',
    footer: 'تصلك رسالة الأمان هذه بسبب نشاط على حسابك في ClinicFinder.',
  },
};

const SUPPORT = config.supportEmail;
const LOCALES = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-LB-u-nu-latn' };

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const firstName = (fullName) => String(fullName).replace(/^dr\.?\s+/i, '').split(/\s+/)[0] || fullName;

function layout(t, { preview, body, button }) {
  const align = t.dir === 'rtl' ? 'right' : 'left';
  return `<!doctype html>
<html lang="${t === STRINGS.ar ? 'ar' : t === STRINGS.fr ? 'fr' : 'en'}" dir="${t.dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f3f5f4;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a2e">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f4;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e2e8e6">
<tr><td style="padding:24px 28px 8px;text-align:${align}">
<span style="font-size:18px;font-weight:700;color:#0f5e57">ClinicFinder</span>
</td></tr>
<tr><td style="padding:8px 28px 28px;text-align:${align};font-size:15px;line-height:1.6">${body}
${button ? `<p style="margin:24px 0 0"><a href="${esc(button.href)}" style="display:inline-block;background:#0f5e57;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px">${esc(button.label)}</a></p>` : ''}
</td></tr>
</table>
<p style="max-width:520px;font-size:12px;line-height:1.5;color:#6b7a7e;margin:16px auto 0;text-align:center">${esc(t.footer)}</p>
</td></tr>
</table>
</body></html>`;
}

export function passwordResetCodeEmail({ name, language, code }) {
  const t = STRINGS[language] ?? STRINGS.en;
  const m = config.passwordReset.codeTtlMinutes;
  const link = `${config.appUrl}/forgot-password`;
  const p = (s) => `<p style="margin:0 0 14px">${esc(s)}</p>`;
  const body = [
    p(fill(t.hello, { name: firstName(name) })),
    p(t.resetIntro),
    `<p dir="ltr" style="margin:6px 0 18px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:700;font-family:Consolas,Menlo,monospace;color:#0f5e57;background:#eef6f5;border-radius:10px;padding:14px 0">${esc(code)}</p>`,
    p(fill(t.resetExpiry, { m })),
    p(t.resetIgnore),
    `<p style="margin:0;font-size:13px;color:#6b7a7e">${esc(t.resetNever)}</p>`,
  ].join('\n');

  return {
    subject: t.resetSubject,
    text: [fill(t.hello, { name: firstName(name) }), '', t.resetIntro, '', `    ${code}`, '',
      fill(t.resetExpiry, { m }), '', t.resetIgnore, '', t.resetNever, '', link].join('\n'),
    html: layout(t, { preview: fill(t.resetPreview, { m }), body, button: { href: link, label: t.resetButton } }),
  };
}

export function emailVerificationCodeEmail({ name, language, code }) {
  const t = STRINGS[language] ?? STRINGS.en;
  const m = config.emailVerification.codeTtlMinutes;
  const link = config.appUrl;
  const p = (s) => `<p style="margin:0 0 14px">${esc(s)}</p>`;
  const body = [
    p(fill(t.hello, { name: firstName(name) })),
    p(t.verifyIntro),
    `<p dir="ltr" style="margin:6px 0 18px;text-align:center;font-size:32px;letter-spacing:10px;font-weight:700;font-family:Consolas,Menlo,monospace;color:#0f5e57;background:#eef6f5;border-radius:10px;padding:14px 0">${esc(code)}</p>`,
    p(fill(t.verifyExpiry, { m })),
    p(t.verifyIgnore),
    `<p style="margin:0;font-size:13px;color:#6b7a7e">${esc(t.resetNever)}</p>`,
  ].join('\n');

  return {
    subject: t.verifySubject,
    text: [fill(t.hello, { name: firstName(name) }), '', t.verifyIntro, '', `    ${code}`, '',
      fill(t.verifyExpiry, { m }), '', t.verifyIgnore, '', t.resetNever, '', link].join('\n'),
    html: layout(t, { preview: fill(t.verifyPreview, { m }), body, button: { href: link, label: t.verifyButton } }),
  };
}

// fromSettings: changed in Settings (this device stays signed in) rather than reset with an emailed code
export function passwordChangedEmail({ name, language, when = new Date(), fromSettings = false }) {
  const t = STRINGS[language] ?? STRINGS.en;
  const whenText = new Intl.DateTimeFormat(LOCALES[language] ?? LOCALES.en, {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Beirut',
  }).format(when);
  const link = `${config.appUrl}/forgot-password`;
  const p = (s) => `<p style="margin:0 0 14px">${esc(s)}</p>`;
  const body = [
    p(fill(t.hello, { name: firstName(name) })),
    p(fill(fromSettings ? t.changedIntroOthers : t.changedIntro, { when: whenText })),
    p(t.changedOk),
    // Shows support@clinicfinder.lb, but clicking it writes to the real support inbox
    `<p style="margin:0 0 14px">${esc(t.changedNotYou).replace('{support}',
      `<a href="mailto:${esc(SUPPORT)}" style="color:#0f5e57">${esc(config.supportEmailDisplay)}</a>`)}</p>`,
  ].join('\n');

  return {
    subject: t.changedSubject,
    text: [fill(t.hello, { name: firstName(name) }), '', fill(fromSettings ? t.changedIntroOthers : t.changedIntro, { when: whenText }), '',
      t.changedOk, fill(t.changedNotYou, { support: SUPPORT }), '', link].join('\n'),
    html: layout(t, { preview: t.changedPreview, body, button: { href: link, label: t.changedButton } }),
  };
}
