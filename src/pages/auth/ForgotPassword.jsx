import { tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import { Button, Field, Input, PasswordInput, CodeInput, PasswordStrength } from '../../components/ui';
import { ConfirmCheck } from '../../components/shared/BookingFlow';
import { forgotPassword, verifyResetCode, resetPassword } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { email as vEmail, password as vPassword, confirmPassword } from '../../lib/validators';

export default function ForgotPassword() {
  useDocumentTitle(tx('Reset password'));
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (!cooldown) return undefined; const t = setTimeout(() => setCooldown((c) => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  const sendCode = async (e) => {
    e?.preventDefault();
    const err = vEmail(email);
    if (err) { setErrors({ email: err }); return; }
    setBusy(true);
    try {
      const res = await forgotPassword(email);
      setStep(1); setCode(''); setCooldown(30);
      if (res.demoCode) toast.info(tx('Demo: your reset code'), { body: tx('A real server would email this code.'), code: res.demoCode });
      else toast.info(tx('Check your inbox'), { body: tx('If an account exists for this email, a code is on its way.') });
    } catch (e2) { setErrors({ email: e2.message }); } finally { setBusy(false); }
  };

  const checkCode = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setErrors({ code: 'Enter all 6 digits.' }); return; }
    setBusy(true);
    try { await verifyResetCode(email, code); setErrors({}); setStep(2); }
    catch (e2) { setErrors({ code: e2.message }); } finally { setBusy(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    const p = vPassword(pw); if (p) errs.pw = p;
    const c = confirmPassword(pw, confirm); if (c) errs.confirm = c;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await resetPassword(email, code, pw); setStep(3); toast.success(tx('Password updated')); }
    catch (e2) { setErrors({ pw: e2.message }); } finally { setBusy(false); }
  };

  const titles = [['Forgot your password?', 'Enter your account email and we’ll send a 6-digit code.'], ['Enter the code', 'We sent a 6-digit code to {0}. It expires in 10 minutes.'], ['Choose a new password', 'Use at least 8 characters with upper and lower case, a number and a symbol.'], ['Password updated', 'You can now sign in with your new password.']];

  return (
    <div className="stack" style={{ '--gap': '22px' }}>
      <div className="stepper" aria-label={tx('Step {0} of 3', {
        0: Math.min(step + 1, 3)
      })}>
        {['Email', 'Code', 'New password'].map((s, i) => (
          <span key={s} className="row" style={{ '--gap': '8px', flex: i < 2 ? 1 : 'none' }}>
            <span className={`step ${step === i ? 'on' : step > i ? 'done' : ''}`}><span className="dot">{i + 1}</span>{tx(s)}</span>
            {i < 2 && <span className="bar" />}
          </span>
        ))}
      </div>
      <div>
        <h1>{tx(titles[step][0])}</h1>
        <p className="sub">{tx(titles[step][1], { 0: email })}</p>
      </div>
      <div key={step} className="enter-x">
          {step === 0 && (
            <form className="stack" onSubmit={sendCode} noValidate>
              <Field label={tx('Email')} error={errors.email} required><Input type="email" icon={Mail} value={email} placeholder={tx("you@example.com")} onChange={(e) => { setEmail(e.target.value); setErrors({}); }} autoComplete="email" autoFocus /></Field>
              <Button type="submit" size="lg" block loading={busy}>{tx('Send code')}</Button>
            </form>
          )}
          {step === 1 && (
            <form className="stack" onSubmit={checkCode} noValidate>
              <Field error={errors.code}><CodeInput value={code} onChange={(c) => { setCode(c); setErrors({}); }} invalid={!!errors.code} autoFocus /></Field>
              <Button type="submit" size="lg" block loading={busy} icon={KeyRound}>{tx('Verify code')}</Button>
              <div className="row between small">
                <button type="button" className="link-btn" onClick={() => setStep(0)}><ArrowLeft size={14} />{tx('Change email')}</button>
                <button type="button" className="link-btn" disabled={cooldown > 0 || busy} onClick={sendCode} style={cooldown ? { color: 'var(--ink-4)' } : undefined}>{cooldown ? tx('Resend in {0}s', {
                  0: cooldown
                }) : tx('Resend code')}</button>
              </div>
            </form>
          )}
          {step === 2 && (
            <form className="stack" onSubmit={save} noValidate>
              <Field label={tx('New password')} error={errors.pw} required><PasswordInput icon={Lock} value={pw} onChange={(e) => { setPw(e.target.value); setErrors({}); }} autoComplete="new-password" autoFocus /></Field>
              <PasswordStrength password={pw} />
              <Field label={tx('Confirm new password')} error={errors.confirm} required><PasswordInput icon={Lock} value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors({}); }} autoComplete="new-password" /></Field>
              <Button type="submit" size="lg" block loading={busy}>{tx('Update password')}</Button>
            </form>
          )}
          {step === 3 && (
            <div className="stack">
              <ConfirmCheck />
              <Button size="lg" block onClick={() => navigate('/login', { replace: true })}>{tx('Sign in')}</Button>
            </div>
          )}
      </div>
      {step < 3 && <p className="small muted" style={{ textAlign: 'center' }}>{tx('Remembered it?')}{' '}<Link to="/login" className="strong">{tx('Back to sign in')}</Link></p>}
    </div>
  );
}
