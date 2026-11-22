import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserRound, Stethoscope, ShieldCheck } from 'lucide-react';
import { Button, Field, Input, PasswordInput, Checkbox } from '../../components/ui';
import { useAuth, homeFor } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { isApiConfigured } from '../../services/http';
import { email as vEmail, required, validate } from '../../lib/validators';

const DEMO = [
  { role: 'Patient', email: 'patient@clinicfinder.lb', password: 'Patient@123', icon: UserRound },
  { role: 'Doctor', email: 'doctor@clinicfinder.lb', password: 'Doctor@123', icon: Stethoscope },
  { role: 'Admin', email: 'admin@clinicfinder.lb', password: 'Admin@123', icon: ShieldCheck },
];

export default function Login() {
  useDocumentTitle(tx('Sign in'));
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => { const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setValues((s) => ({ ...s, [k]: v })); setErrors((s) => ({ ...s, [k]: '' })); setFormError(''); };

  const doLogin = async (creds) => {
    setBusy(true); setFormError('');
    try {
      const user = await login(creds);
      toast.success(tx('Welcome back, {0}', {
        0: user.name.split(' ')[user.role === 'doctor' ? 1 : 0]
      }));
      const from = location.state?.from;
      const allowed = from && from.startsWith(`/${user.role}`) || (from && /^\/doctors\//.test(from) && user.role === 'patient');
      navigate(allowed ? from.replace(/^\/doctors\//, '/patient/doctors/') : homeFor(user.role), { replace: true });
    } catch (e) {
      if (e.fields) setErrors(e.fields);
      setFormError(e.message);
    } finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(values, { email: vEmail, password: (v) => required(v, 'Password') });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    doLogin(values);
  };

  return (
    <div className="stack" style={{ '--gap': '24px' }}>
      <div>
        <h1>{tx('Sign in')}</h1>
        <p className="sub">{tx('Welcome back. Sign in to manage your appointments.')}</p>
      </div>
      {location.state?.from && <div className="banner info"><Lock aria-hidden /><div>{tx('Sign in to continue to that page.')}</div></div>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label={tx('Email')} error={errors.email} required>
          <Input type="email" icon={Mail} value={values.email} onChange={set('email')} autoComplete="email" placeholder={tx('you@example.com')} />
        </Field>
        <Field label={tx('Password')} error={errors.password} required aside={<Link to="/forgot-password" className="small" style={{ fontWeight: 600 }}>{tx('Forgot password?')}</Link>}>
          <PasswordInput icon={Lock} value={values.password} onChange={set('password')} autoComplete="current-password" />
        </Field>
        <Checkbox label={tx('Keep me signed in on this device')} checked={values.remember} onChange={set('remember')} />
        {formError && <div className="banner danger" role="alert">{formError}</div>}
        <Button type="submit" size="lg" block loading={busy}>{tx('Sign in')}</Button>
      </form>
      {/* Demo accounts exist only in the browser mock, not in the real database */}
      {!isApiConfigured() && (
      <div className="demo-box">
        <div className="small strong" style={{ marginBottom: 4 }}>{tx('Try a demo account')}</div>
        <p className="tiny muted" style={{ marginBottom: 10 }}>{tx('Demo sign-in runs in your browser only — it isn’t production security.')}</p>
        <div className="row wrap" style={{ '--gap': '8px' }}>
          {DEMO.map((d) => <Button key={d.role} variant="secondary" size="sm" icon={d.icon} disabled={busy} onClick={() => { setValues({ email: d.email, password: d.password, remember: true }); doLogin({ email: d.email, password: d.password, remember: true }); }}>{tx(d.role)}</Button>)}
        </div>
      </div>
      )}
      <p className="small muted" style={{ textAlign: 'center' }}>{tx('New to ClinicFinder?')}{' '}<Link to="/signup" className="strong">{tx('Create an account')}</Link></p>
    </div>
  );
}
