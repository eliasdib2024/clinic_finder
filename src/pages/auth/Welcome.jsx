import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Droplet, ShieldCheck, Plus, X, ArrowRight } from 'lucide-react';
import { Button, Checkbox, Field, Input, Select } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { useDocumentTitle } from '../../hooks';
import { completeOnboarding } from '../../services/userService';
import { BLOOD_TYPES, GOVERNORATES, citiesOf } from '../../lib/constants';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Patient sign-up, step 2 of 2: the health profile doctors rely on.
 * Reached automatically after creating a patient account; the app stays locked until it's saved.
 */
export default function Welcome() {
  useDocumentTitle(tx('Your health profile'));
  const { user, setUser } = useAuth();
  const { insurers } = useCatalog();
  const toast = useToast();
  const navigate = useNavigate();
  const [v, setV] = useState({
    dob: '', governorate: '', city: '', bloodType: '', insuranceId: '', insuranceNumber: '', allergies: [], noKnownAllergies: false,
  });
  const [allergy, setAllergy] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setV((s) => ({
      ...s, [k]: val,
      ...(k === 'governorate' ? { city: '' } : {}),
      ...(k === 'insuranceId' && !val ? { insuranceNumber: '' } : {}),
    }));
    setErrors((s) => ({ ...s, [k]: '', ...(k === 'noKnownAllergies' ? { allergies: '' } : {}) }));
  };

  const addAllergy = () => {
    const a = allergy.trim();
    if (a && !v.allergies.some((x) => x.toLowerCase() === a.toLowerCase())) {
      setV((s) => ({ ...s, allergies: [...s.allergies, a], noKnownAllergies: false }));
      setErrors((s) => ({ ...s, allergies: '' }));
    }
    setAllergy('');
  };

  const validateLocal = (d) => {
    const e = {};
    if (!d.dob) e.dob = 'Enter your date of birth.';
    else if (d.dob > todayISO()) e.dob = 'Date of birth cannot be in the future.';
    if (!d.governorate) e.governorate = 'Choose a governorate.';
    if (!d.city) e.city = 'Choose a city.';
    if (d.insuranceId && !d.insuranceNumber.trim()) e.insuranceNumber = 'Enter your policy or membership number.';
    if (!d.allergies.length && !d.noKnownAllergies) e.allergies = 'Add your allergies, or confirm you have none.';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    // An allergy typed but not yet added with Enter/+ still counts.
    const pending = allergy.trim();
    const data = pending && !v.allergies.includes(pending) ? { ...v, allergies: [...v.allergies, pending], noKnownAllergies: false } : v;
    if (pending) { setV(data); setAllergy(''); }
    const errs = validateLocal(data);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const u = await completeOnboarding(data);
      setUser(u);
      toast.success(tx('You’re all set'), { body: tx('Your health profile is saved. You can book your first appointment now.') });
      navigate('/patient', { replace: true });
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(tx('Not saved'), { body: err.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="stack" style={{ '--gap': '22px' }}>
      <div className="stepper" aria-label={tx('Step {0} of 2', { 0: 2 })}>
        <span className="step done"><span className="dot">1</span>{tx('Account')}</span>
        <span className="bar" />
        <span className="step on"><span className="dot">2</span>{tx('Health profile')}</span>
      </div>
      <div>
        <h1>{tx('Welcome, {0}', { 0: user.name.split(' ')[0] })}</h1>
        <p className="sub">{tx('A few details so doctors can prepare for your visit and prescribe safely. You can change them anytime in Settings.')}</p>
      </div>

      <form className="stack enter-x" onSubmit={submit} noValidate style={{ '--gap': '16px' }}>
        <div className="grid grid-2" style={{ '--gap': '14px' }}>
          <Field label={tx('Date of birth')} error={errors.dob} required>
            <Input name="dob" type="date" value={v.dob} onChange={set('dob')} max={todayISO()} min="1900-01-01" autoComplete="bday" data-autofocus />
          </Field>
          <Field label={tx('Blood type')} hint={tx('Leave as “I don’t know” if unsure.')}>
            <Select name="bloodType" value={v.bloodType} onChange={set('bloodType')} placeholder={tx('I don’t know')} options={BLOOD_TYPES} />
          </Field>
        </div>

        <div className="grid grid-2" style={{ '--gap': '14px' }}>
          <Field label={tx('Governorate')} error={errors.governorate} required>
            <Select name="governorate" value={v.governorate} onChange={set('governorate')} placeholder={tx('Select')} options={GOVERNORATES} />
          </Field>
          <Field label={tx('City')} error={errors.city} required hint={!v.governorate ? tx('Choose a governorate first.') : undefined}>
            <Select name="city" value={v.city} onChange={set('city')} placeholder={tx('Select')} options={citiesOf(v.governorate)} disabled={!v.governorate} />
          </Field>
        </div>

        <div className="grid grid-2" style={{ '--gap': '14px' }}>
          <Field label={tx('Insurance')}>
            <Select name="insuranceId" value={v.insuranceId} onChange={set('insuranceId')} placeholder={tx('No insurance / self-pay')} options={insurers} />
          </Field>
          <Field label={tx('Policy or membership number')} error={errors.insuranceNumber} required={!!v.insuranceId}>
            <Input name="insuranceNumber" value={v.insuranceNumber} onChange={set('insuranceNumber')} disabled={!v.insuranceId} placeholder={v.insuranceId ? '' : tx('Not needed for self-pay')} />
          </Field>
        </div>

        {/* The label must sit on the input itself (not on a wrapper) so it is announced and clickable. */}
        <div className="row field-with-action">
          <Field className="grow" label={tx('Allergies')} error={errors.allergies} required hint={tx('Medications, foods or materials. Press Enter to add.')}>
            <Input name="allergies" icon={Droplet} value={allergy} onChange={(e) => setAllergy(e.target.value)} disabled={v.noKnownAllergies}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }} placeholder={tx('e.g. Penicillin')} />
          </Field>
          <Button variant="secondary" icon={Plus} onClick={addAllergy} aria-label={tx('Add allergy')} disabled={v.noKnownAllergies || !allergy.trim()} />
        </div>
        {v.allergies.length > 0 && (
          <div className="chips" style={{ marginTop: -6 }}>
            {v.allergies.map((a) => (
              <span key={a} className="chip chip-x">{tx(a)}
                <button type="button" onClick={() => setV((s) => ({ ...s, allergies: s.allergies.filter((x) => x !== a) }))} aria-label={tx('Remove {0}', { 0: a })}><X /></button>
              </span>
            ))}
          </div>
        )}
        {v.allergies.length === 0 && (
          <Checkbox name="noKnownAllergies" checked={v.noKnownAllergies} onChange={set('noKnownAllergies')} label={tx('I have no known allergies')} />
        )}

        <div className="banner info small">
          <ShieldCheck aria-hidden />
          <div>{tx('Only doctors you book can see these details. Allergies are checked automatically when a doctor writes you a prescription.')}</div>
        </div>

        <Button type="submit" size="lg" block loading={busy} iconEnd={ArrowRight}>{tx('Save and continue')}</Button>
        <p className="tiny muted row" style={{ '--gap': '6px', justifyContent: 'center' }}><MapPin size={14} aria-hidden />{tx('Your location helps us suggest doctors near you.')}</p>
      </form>
    </div>
  );
}
