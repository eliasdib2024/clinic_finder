import { getLocale, tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { initials } from '../../lib/format';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserRound, HeartPulse, Lock, Bell, Globe, ShieldAlert, Mail, Phone, LogOut, Trash2, RotateCcw, X, Plus } from 'lucide-react';
import { Avatar, Badge, Button, Checkbox, ConfirmDialog, Field, Input, PasswordInput, PasswordStrength, Select, Switch, Tabs, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { useDocumentTitle } from '../../hooks';
import { updateProfile, updateHealth, updateSettings, deactivateAccount } from '../../services/userService';
import { changePassword } from '../../services/authService';
import { resetDb } from '../../services/db';
import { BLOOD_TYPES, GOVERNORATES, citiesOf } from '../../lib/constants';
import { LANGS } from '../../lib/i18n';
import { email as vEmail, lebanesePhone, formatLebanesePhone, password as vPassword, confirmPassword, validate } from '../../lib/validators';

/**
 * Name shown beside the avatar, rebuilt from the input on every keystroke.
 * Each character keeps a stable key, so only newly typed letters animate in;
 * the initials pop whenever they change.
 */
// Arabic letters join to their neighbours, so a joined script animates word by word
// (splitting it per letter would break the shaping); other scripts go letter by letter.
const JOINING = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const graphemes = (str) => (typeof Intl !== 'undefined' && Intl.Segmenter
  ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(str)].map((g) => g.segment)
  : [...str]);
const pieces = (str) => (JOINING.test(str) ? str.split(/( )/).filter(Boolean) : graphemes(str));

function LiveNamePreview({ name, savedName, hueKey, prefix, meta }) {
  const base = name.replace(/^\s+/, '');
  // Same rule as the server: "Dr." is added unless the doctor already typed it.
  const shown = prefix && /^dr\.?\s/i.test(base) ? base : `${prefix}${base}`;
  const ini = initials(shown);
  const changed = shown.trim() !== savedName.trim();
  return (
    <div className="row live-name" style={{ '--gap': '14px' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={ini || 'empty'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 28 }} style={{ display: 'inline-flex' }}>
          <Avatar name={shown.trim() ? shown : '?'} size={56} hueKey={hueKey} />
        </motion.span>
      </AnimatePresence>
      <div style={{ minWidth: 0 }}>
        <div className="row wrap" style={{ '--gap': '8px' }}>
          <div className="strong live-name-text" aria-hidden="true">
            {shown.trim()
              ? pieces(shown).map((p, i) => <span key={`${i}-${p}`} className="live-letter">{p === ' ' ? '\u00a0' : p}</span>)
              : <span className="muted" style={{ fontWeight: 400 }}>{tx('Your name')}</span>}
          </div>
          <span className="sr-only">{shown}</span>
          {changed && shown.trim() && <Badge tone="amber">{tx('Preview')}</Badge>}
        </div>
        <div className="small muted">{meta}</div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [v, setV] = useState({ name: user.name.replace(/^Dr\.\s*/, ''), email: user.email, phone: formatLebanesePhone(user.phone), gender: user.gender || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: '' })); };
  const save = async (e) => {
    e.preventDefault();
    const errs = validate(v, { name: (x) => (x.trim().length < 3 ? 'Enter your full name.' : ''), email: vEmail, phone: (x) => lebanesePhone(x) });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { setUser(await updateProfile(v)); toast.success(tx('Profile saved')); } catch (err) { setErrors(err.fields || {}); toast.error(tx('Profile not saved'), { body: err.message }); } finally { setBusy(false); }
  };
  return (
    <form className="stack" onSubmit={save} noValidate style={{ maxWidth: 620 }}>
      <LiveNamePreview name={v.name} savedName={user.name} hueKey={user.name} prefix={user.role === 'doctor' ? 'Dr. ' : ''}
        meta={tx({ patient: 'Patient account · member since {0}', doctor: 'Doctor account · member since {0}', admin: 'Administrator account · member since {0}' }[user.role], { 0: new Date(user.createdAt).toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' }) })} />
      <Field label={tx('Full name')} error={errors.name} required hint={user.role === 'doctor' ? tx('“Dr.” is added automatically.') : undefined}><Input icon={UserRound} value={v.name} onChange={set('name')} autoComplete="name" /></Field>
      <div className="grid grid-2" style={{ '--gap': '14px' }}>
        <Field label={tx('Email')} error={errors.email} required><Input icon={Mail} type="email" value={v.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label={tx('Mobile number')} error={errors.phone} required><Input icon={Phone} type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" /></Field>
      </div>
      <Field label={tx('Gender')}><Select value={v.gender} onChange={set('gender')} placeholder={tx('Prefer not to say')} options={[{ value: 'f', label: 'Female' }, { value: 'm', label: 'Male' }]} /></Field>
      <div><Button type="submit" loading={busy}>{tx('Save changes')}</Button></div>
    </form>
  );
}

function HealthTab() {
  const { user, setUser } = useAuth();
  const { insurers } = useCatalog();
  const toast = useToast();
  const p = user.patient || {};
  const [v, setV] = useState({ bloodType: p.bloodType || '', allergies: p.allergies || [], noKnownAllergies: !!p.noKnownAllergies, insuranceId: p.insuranceId || '', insuranceNumber: p.insuranceNumber || '', dob: p.dob || '', governorate: p.governorate || '', city: p.city || '', emergencyContact: p.emergencyContact || '' });
  const [allergy, setAllergy] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value; setV((s) => ({ ...s, [k]: val, ...(k === 'governorate' ? { city: '' } : {}) })); setErrors((s) => ({ ...s, [k]: '' })); };
  const addAllergy = () => { const a = allergy.trim(); if (a && !v.allergies.some((x) => x.toLowerCase() === a.toLowerCase())) setV((s) => ({ ...s, allergies: [...s.allergies, a], noKnownAllergies: false })); setAllergy(''); };
  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (v.emergencyContact && lebanesePhone(v.emergencyContact)) errs.emergencyContact = lebanesePhone(v.emergencyContact);
    if (v.insuranceId && !v.insuranceNumber.trim()) errs.insuranceNumber = 'Enter your policy or membership number.';
    if (v.governorate && !v.city) errs.city = 'Choose a city.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { setUser(await updateHealth(v)); toast.success(tx('Health details saved'), { body: tx('Doctors you book will see your blood type and allergies.') }); }
    catch (err) { setErrors(err.fields || {}); toast.error(tx('Not saved'), { body: err.message }); } finally { setBusy(false); }
  };
  return (
    <form className="stack" onSubmit={save} noValidate style={{ maxWidth: 620 }}>
      <p className="muted small">{tx(
        'Shared only with doctors you book, so they can prepare and avoid prescribing something you’re allergic to.'
      )}</p>
      <div className="grid grid-2" style={{ '--gap': '14px' }}>
        <Field label={tx('Blood type')}><Select value={v.bloodType} onChange={set('bloodType')} placeholder={tx('Unknown')} options={BLOOD_TYPES} /></Field>
        <Field label={tx('Date of birth')} error={errors.dob}><Input type="date" value={v.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} /></Field>
      </div>
      <div className="row field-with-action">
        <Field className="grow" label={tx('Allergies')} hint={tx('Medications, foods or materials. Press Enter to add.')}>
          <Input value={allergy} onChange={(e) => setAllergy(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(); } }} placeholder={tx('e.g. Penicillin')} />
        </Field>
        <Button variant="secondary" icon={Plus} onClick={addAllergy} aria-label={tx('Add allergy')} />
      </div>
      {v.allergies.length > 0 && <div className="chips">{v.allergies.map((a) => <span key={a} className="chip chip-x">{tx(a)}<button type="button" onClick={() => setV((s) => ({ ...s, allergies: s.allergies.filter((x) => x !== a) }))} aria-label={tx('Remove {0}', {
        0: a
      })}><X /></button></span>)}</div>}
      {v.allergies.length === 0 && <Checkbox checked={v.noKnownAllergies} onChange={set('noKnownAllergies')} label={tx('I have no known allergies')} />}
      <div className="grid grid-2" style={{ '--gap': '14px' }}>
        <Field label={tx('Governorate')} error={errors.governorate}><Select value={v.governorate} onChange={set('governorate')} placeholder={tx('Select')} options={GOVERNORATES} /></Field>
        <Field label={tx('City')} error={errors.city}><Select value={v.city} onChange={set('city')} placeholder={tx('Select')} options={citiesOf(v.governorate)} disabled={!v.governorate} /></Field>
      </div>
      <div className="grid grid-2" style={{ '--gap': '14px' }}>
        <Field label={tx('Insurance')}><Select value={v.insuranceId} onChange={set('insuranceId')} placeholder={tx('No insurance / self-pay')} options={insurers} /></Field>
        <Field label={tx('Policy or membership number')} error={errors.insuranceNumber}><Input value={v.insuranceNumber} onChange={set('insuranceNumber')} disabled={!v.insuranceId} /></Field>
      </div>
      <Field label={tx('Emergency contact')} error={errors.emergencyContact} hint={tx('Optional — a Lebanese phone number.')}><Input icon={Phone} type="tel" value={v.emergencyContact} onChange={set('emergencyContact')} /></Field>
      <div><Button type="submit" loading={busy}>{tx('Save health details')}</Button></div>
    </form>
  );
}

function PasswordTab() {
  const toast = useToast();
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: '' })); };
  const save = async (e) => {
    e.preventDefault();
    const errs = validate(v, { current: (x) => (x ? '' : 'Enter your current password.'), next: vPassword, confirm: (x, all) => confirmPassword(all.next, x) });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await changePassword(v.current, v.next); setV({ current: '', next: '', confirm: '' }); toast.success(tx('Password changed')); }
    catch (err) { setErrors(err.fields || { current: err.message }); } finally { setBusy(false); }
  };
  return (
    <form className="stack" onSubmit={save} noValidate style={{ maxWidth: 460 }}>
      <Field label={tx('Current password')} error={errors.current} required><PasswordInput value={v.current} onChange={set('current')} autoComplete="current-password" placeholder={tx('Enter your current password')} /></Field>
      <Field label={tx('New password')} error={errors.next} required><PasswordInput value={v.next} onChange={set('next')} autoComplete="new-password" placeholder={tx('Create a new password')} /></Field>
      <PasswordStrength password={v.next} />
      <Field label={tx('Confirm new password')} error={errors.confirm} required><PasswordInput value={v.confirm} onChange={set('confirm')} autoComplete="new-password" placeholder={tx('Re-enter your new password')} /></Field>
      <div><Button type="submit" loading={busy} icon={Lock}>{tx('Change password')}</Button></div>
    </form>
  );
}

function NotificationsTab() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const n = user.settings?.notifications || {};
  const toggle = async (key, value) => {
    try { setUser(await updateSettings({ notifications: { [key]: value } })); toast.success(tx('Preference saved')); } catch (e) { toast.error(tx('Not saved'), { body: e.message }); }
  };
  const rows = [
    ['email', 'Email updates', 'Booking confirmations, changes and cancellations.'],
    ['sms', 'SMS messages', 'Text messages to your Lebanese mobile number.'],
    ['reminders', 'Appointment reminders', '24 hours and 2 hours before each visit.'],
    ...(user.role === 'doctor' ? [['newBooking', 'New booking alerts', 'Be notified the moment a patient requests a slot.']] : []),
    ['marketing', 'Health tips and news', 'Occasional updates from ClinicFinder.'],
  ];
  return (
    <div className="stack" style={{ maxWidth: 620, '--gap': '0' }}>
      {rows.map(([k, label, desc]) => <div key={k} style={{ padding: '14px 0', borderBottom: '1px solid var(--mist)' }}><Switch label={label} description={desc} checked={!!n[k]} onChange={(c) => toggle(k, c)} /></div>)}
      <p className="tiny muted" style={{ marginTop: 12 }}>{tx(
        'Demo build: email and SMS delivery are simulated. In-app notifications always appear under the bell icon.'
      )}</p>
    </div>
  );
}

function LanguageTab() {
  const { setUser } = useAuth();
  const { lang, setLang } = useI18n();
  const toast = useToast();
  const choose = async (id) => { setLang(id); try { setUser(await updateSettings({ language: id })); toast.success(tx('Language updated')); } catch { /* keep */ } };
  return (
    <div className="stack" style={{ maxWidth: 520 }}>
      <p className="muted small">{tx(
        'The whole interface is translated. Arabic switches the layout to right-to-left.'
      )}</p>
      <div className="stack" role="radiogroup" aria-label={tx('Language')} style={{ '--gap': '8px' }}>
        {LANGS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={lang === l.id} className="role-option" onClick={() => choose(l.id)} lang={l.id}>
            <span className="ic"><Globe size={18} aria-hidden /></span><span><strong>{l.label}</strong><span>{l.dir === 'rtl' ? tx('Right-to-left layout') : tx('Left-to-right layout')}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountTab() {
  const { user, logout, setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [deact, setDeact] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); toast.info(tx('Signed out')); };
  const doDeactivate = async () => {
    setBusy(true);
    try { await deactivateAccount(confirmEmail); setUser(null); toast.info(tx('Account deactivated'), { body: tx('Your upcoming bookings were cancelled.') }); navigate('/', { replace: true }); }
    catch (e) { setErr(e.fields?.confirm || e.message); } finally { setBusy(false); }
  };
  return (
    <div className="stack" style={{ maxWidth: 620, '--gap': '20px' }}>
      <div className="panel panel-pad row between wrap"><div><div className="strong">{tx('Sign out')}</div><div className="small muted">{tx('End your session on this device.')}</div></div><Button variant="secondary" icon={LogOut} onClick={signOut}>{tx('Sign out')}</Button></div>
      <div className="panel panel-pad row between wrap"><div><div className="strong">{tx('Reset demo data')}</div><div className="small muted">{tx(
        'Restore the original demo doctors, patients and bookings. You’ll be signed out.'
      )}</div></div><Button variant="secondary" icon={RotateCcw} onClick={() => setReset(true)}>{tx('Reset data')}</Button></div>
      {user.role !== 'admin' && (
        <div className="panel panel-pad row between wrap" style={{ borderColor: '#f5c6d0' }}><div><div className="strong" style={{ color: 'var(--rose)' }}>{tx('Deactivate account')}</div><div className="small muted">{tx('Cancels your upcoming bookings and signs you out everywhere.')}</div></div><Button variant="danger-soft" icon={Trash2} onClick={() => setDeact(true)}>{tx('Deactivate')}</Button></div>
      )}
      <Modal open={deact} onClose={() => !busy && setDeact(false)} title={tx('Deactivate your account?')}
        footer={<><Button variant="secondary" onClick={() => setDeact(false)} disabled={busy}>{tx('Keep my account')}</Button><Button variant="danger" loading={busy} onClick={doDeactivate} disabled={!confirmEmail}>{tx('Deactivate account')}</Button></>}>
        <div className="stack">
          <div className="banner danger"><ShieldAlert aria-hidden /><div>{tx(
            'All your pending and confirmed appointments will be cancelled and doctors notified. Contact support to restore the account later.'
          )}</div></div>
          <Field label={tx('Type {0} to confirm', {
            0: user.email
          })} error={err}><Input value={confirmEmail} onChange={(e) => { setConfirmEmail(e.target.value); setErr(''); }} autoComplete="off" data-autofocus /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={reset} onClose={() => setReset(false)} title={tx('Reset all demo data?')} confirmLabel={tx('Reset data')} description={tx(
        'Every change made in this browser — bookings, prescriptions, accounts — will be replaced with the original demo data.'
      )}
        onConfirm={async () => { resetDb(); await logout().catch(() => {}); window.location.assign(import.meta.env.VITE_ROUTER === 'hash' ? './#/login' : '/login'); }} />
    </div>
  );
}

export default function Settings() {
  useDocumentTitle(tx('Settings'));
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    ...(user.role === 'patient' ? [{ id: 'health', label: 'Health & insurance', icon: HeartPulse }] : []),
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'account', label: 'Account', icon: ShieldAlert },
  ];
  const tab = tabs.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'profile';
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>{tx('Settings')}</h1><p>{tx('Manage your profile, security and preferences.')}</p></div></div>
      <Tabs label={tx('Settings sections')} tabs={tabs} value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      <section className="panel panel-pad" aria-label={tx(tabs.find((t) => t.id === tab)?.label)}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'language' && <LanguageTab />}
        {tab === 'account' && <AccountTab />}
      </section>
    </div>
  );
}
