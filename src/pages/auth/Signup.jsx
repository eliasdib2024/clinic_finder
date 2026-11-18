import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserRound, Stethoscope, Mail, Phone, Lock, ArrowLeft, BadgeCheck } from 'lucide-react';
import { Button, Field, Input, PasswordInput, Select, Checkbox, PasswordStrength } from '../../components/ui';
import { useAuth, homeFor } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { GOVERNORATES, citiesOf } from '../../lib/constants';
import { email as vEmail, lebanesePhone, password as vPassword, confirmPassword, licenseNumber, required, validate } from '../../lib/validators';

export default function Signup() {
  useDocumentTitle(tx('Create account'));
  const [params] = useSearchParams();
  const { signup } = useAuth();
  const { specialties } = useCatalog();
  const toast = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState(params.get('role') === 'doctor' ? 'doctor' : 'patient');
  const [step, setStep] = useState(0);
  const [v, setV] = useState({ name: '', email: '', phone: '', password: '', confirm: '', specialtyId: '', licenseNumber: '', governorate: '', city: '', acceptTerms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV((s) => ({ ...s, [k]: val, ...(k === 'governorate' ? { city: '' } : {}) }));
    setErrors((s) => ({ ...s, [k]: '' }));
    setFormError('');
  };

  const step1Schema = {
    name: (x) => required(x, 'Full name') || (x.trim().length < 3 ? 'Enter your full name.' : ''),
    email: vEmail, phone: (x) => lebanesePhone(x), password: vPassword,
    confirm: (x, all) => confirmPassword(all.password, x),
  };
  const step2Schema = {
    specialtyId: (x) => required(x, 'Specialty'), licenseNumber,
    governorate: (x) => required(x, 'Governorate'), city: (x) => required(x, 'City'),
  };

  const submit = async (e) => {
    e.preventDefault();
    const schema = step === 0 ? step1Schema : step2Schema;
    const errs = validate(v, schema);
    if ((role === 'patient' || step === 1) && !v.acceptTerms) errs.acceptTerms = 'Please accept the terms to continue.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (role === 'doctor' && step === 0) { setStep(1); return; }
    setBusy(true);
    try {
      const user = await signup({ ...v, role });
      toast.success(role === 'doctor' ? tx('Application submitted') : tx('Account created'), { body: role === 'doctor' ? tx('An administrator will verify your license shortly.') : tx('One more step: your health profile.') });
      // Patients continue to step 2 (health profile); doctors land on their dashboard.
      navigate(user.role === 'patient' ? '/welcome' : homeFor(user.role), { replace: true });
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields);
        if (Object.keys(err.fields).some((k) => k in step1Schema)) setStep(0);
      }
      setFormError(err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="stack" style={{ '--gap': '22px' }}>
      <div>
        <h1>{tx('Create your account')}</h1>
        <p className="sub">{tx('It takes a minute. Next, patients add a short health profile and doctors add their license details.')}</p>
      </div>
      <div className="role-picker" role="radiogroup" aria-label={tx('Account type')}>
        <button type="button" role="radio" aria-checked={role === 'patient'} className="role-option" onClick={() => { setRole('patient'); setStep(0); }}>
          <span className="ic"><UserRound size={18} aria-hidden /></span><span><strong>{tx('I’m a patient')}</strong><span>{tx('Find and book doctors')}</span></span>
        </button>
        <button type="button" role="radio" aria-checked={role === 'doctor'} className="role-option" onClick={() => setRole('doctor')}>
          <span className="ic"><Stethoscope size={18} aria-hidden /></span><span><strong>{tx('I’m a doctor')}</strong><span>{tx('Receive bookings')}</span></span>
        </button>
      </div>
      {role === 'doctor' ? (
        <div className="stepper" aria-label={tx('Step {0} of 2', {
          0: step + 1
        })}>
          <span className={`step ${step === 0 ? 'on' : 'done'}`}><span className="dot">1</span>{tx('Your details')}</span>
          <span className="bar" />
          <span className={`step ${step === 1 ? 'on' : ''}`}><span className="dot">2</span>{tx('Practice & license')}</span>
        </div>
      ) : (
        <div className="stepper" aria-label={tx('Step {0} of 2', { 0: 1 })}>
          <span className="step on"><span className="dot">1</span>{tx('Account')}</span>
          <span className="bar" />
          <span className="step"><span className="dot">2</span>{tx('Health profile')}</span>
        </div>
      )}
      <form onSubmit={submit} noValidate>
          <div key={step} className="stack enter-x">
            {step === 0 ? (
              <>
                <Field label={tx('Full name')} error={errors.name} required><Input icon={UserRound} value={v.name} onChange={set('name')} autoComplete="name" placeholder={role === 'doctor' ? tx('e.g. Lina Khoury') : tx('e.g. Nadine Khalil')} /></Field>
                <div className="grid grid-2" style={{ '--gap': '14px' }}>
                  <Field label={tx('Email')} error={errors.email} required><Input type="email" icon={Mail} value={v.email} onChange={set('email')} autoComplete="email" placeholder={tx('you@example.com')} /></Field>
                  <Field label={tx('Mobile number')} error={errors.phone} required hint={tx('Lebanese number, e.g. 03 123 456')}><Input type="tel" icon={Phone} value={v.phone} onChange={set('phone')} autoComplete="tel" placeholder="+961 …" /></Field>
                </div>
                <Field label={tx('Password')} error={errors.password} required><PasswordInput icon={Lock} value={v.password} onChange={set('password')} autoComplete="new-password" placeholder={tx('Create a password')} /></Field>
                <PasswordStrength password={v.password} />
                <Field label={tx('Confirm password')} error={errors.confirm} required><PasswordInput icon={Lock} value={v.confirm} onChange={set('confirm')} autoComplete="new-password" placeholder={tx('Re-enter your password')} /></Field>
              </>
            ) : (
              <>
                <Field label={tx('Specialty')} error={errors.specialtyId} required><Select value={v.specialtyId} onChange={set('specialtyId')} placeholder={tx('Choose your specialty')} options={specialties} /></Field>
                <Field label={tx('Order of Physicians license number')} error={errors.licenseNumber} required hint={tx('Your Lebanese Order of Physicians registration number (4–6 digits).')}>
                  <Input icon={BadgeCheck} value={v.licenseNumber} onChange={set('licenseNumber')} inputMode="numeric" maxLength={6} placeholder={tx('e.g. 18342')} />
                </Field>
                <div className="grid grid-2" style={{ '--gap': '14px' }}>
                  <Field label={tx('Governorate')} error={errors.governorate} required><Select value={v.governorate} onChange={set('governorate')} placeholder={tx('Select')} options={GOVERNORATES} /></Field>
                  <Field label={tx('City')} error={tx(errors.city)} required><Select value={tx(v.city)} onChange={set('city')} placeholder={v.governorate ? tx('Select') : tx('Choose governorate first')} disabled={!v.governorate} options={citiesOf(v.governorate)} /></Field>
                </div>
              </>
            )}
            {(role === 'patient' || step === 1) && (
              <Field error={errors.acceptTerms}>
                <Checkbox checked={v.acceptTerms} onChange={set('acceptTerms')} label={<>{role === 'doctor' ? tx('I agree to the terms of use and privacy policy, and confirm my license details are accurate.') : tx('I agree to the terms of use and privacy policy.')}.</>} />
              </Field>
            )}
            {formError && <div className="banner danger" role="alert">{formError}</div>}
            <div className="row" style={{ '--gap': '10px' }}>
              {step === 1 && <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(0)}>{tx('Back')}</Button>}
              <Button type="submit" size="lg" block loading={busy}>{role === 'doctor' && step === 0 ? tx('Continue') : role === 'doctor' ? tx('Submit for verification') : tx('Create account')}</Button>
            </div>
          </div>
      </form>
      <p className="small muted" style={{ textAlign: 'center' }}>{tx('Already have an account?')}{' '}<Link to="/login" className="strong">{tx('Sign in')}</Link></p>
    </div>
  );
}
