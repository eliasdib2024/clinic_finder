import { tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button, Field, CodeInput } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { verifyEmail, resendVerification } from '../../services/authService';
import { nextStepFor } from '../../routes/guards';

/**
 * Confirm the email address with the 6-digit code emailed at sign-up.
 * Every signed-in page redirects here until it is done (see routes/guards.jsx).
 * The API enforces the rules (15-minute code, 5 attempts, 60 s between codes); this page only shows them.
 */
export default function VerifyEmail() {
  useDocumentTitle(tx('Confirm your email'));
  const { user, setUser, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const done = (u) => {
    setUser(u);
    toast.success(tx('Email confirmed'), { body: tx('Thank you! Your account is ready.') });
    navigate(nextStepFor(u), { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError(tx('Enter all 6 digits.')); return; }
    setBusy(true);
    try {
      done(await verifyEmail(code));
    } catch (err) {
      setError(err.fields?.code || err.message);
      setCode('');
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setSending(true); setError('');
    try {
      const res = await resendVerification();
      setCode('');
      setCooldown(res.resendAfterSeconds ?? 60);
      toast.info(tx('A new code is on its way'), { body: tx('Only the latest code works.') });
    } catch (err) {
      const wait = /(\d+) seconds/.exec(err.message)?.[1];
      if (err.status === 429 && wait) setCooldown(Number(wait));              // a code was sent less than a minute ago
      else if (err.status === 409) { const u = await refresh(); if (u) navigate(nextStepFor(u), { replace: true }); } // already confirmed
      else setError(err.message);
    } finally { setSending(false); }
  };

  return (
    <div className="stack" style={{ '--gap': '22px' }}>
      <div>
        <h1>{tx('Confirm your email')}</h1>
        <p className="sub">{tx('We sent a 6-digit code to {0}. Enter it below to continue.', { 0: user?.email })}</p>
      </div>
      <form className="stack" onSubmit={submit} noValidate>
        <Field error={error}>
          <CodeInput value={code} onChange={(c) => { setCode(c); setError(''); }} invalid={!!error} autoFocus />
        </Field>
        <Button type="submit" size="lg" block loading={busy} icon={MailCheck}>{tx('Confirm email')}</Button>
        <div className="row between small">
          <span className="muted">{tx('The code expires after 15 minutes.')}</span>
          <button type="button" className="link-btn" disabled={cooldown > 0 || sending} onClick={resend}
            style={cooldown ? { color: 'var(--ink-4)' } : undefined}>
            {cooldown ? tx('Resend in {0}s', { 0: cooldown }) : tx('Resend code')}
          </button>
        </div>
        <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>{tx('Didn’t get it? Check your spam or junk folder.')}</p>
      </form>
    </div>
  );
}
