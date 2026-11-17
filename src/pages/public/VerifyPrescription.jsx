import { tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, Search } from 'lucide-react';
import { Button, Field, Input } from '../../components/ui';
import { ConfirmCheck } from '../../components/shared/BookingFlow';
import { verifyPrescription } from '../../services/prescriptionService';
import { useDocumentTitle } from '../../hooks';
import { formatDate } from '../../lib/dates';

export default function VerifyPrescription() {
  useDocumentTitle(tx('Verify a prescription'));
  const { code: param } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(param || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = async (c) => {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await verifyPrescription(c)); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { if (param) check(param); }, [param]);

  const submit = (e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (!c) { setError('Enter the code printed on the prescription.'); return; } navigate(`/verify/${c}`); if (c === param) check(c); };

  return (
    <div className="container" style={{ maxWidth: 640, padding: '48px 24px 64px' }}>
      <h1 className="display" style={{ fontSize: 'clamp(38px, 5vw, 56px)' }}>{tx('Verify a prescription')}</h1>
      <p className="muted" style={{ marginTop: 12, fontSize: 16 }}>{tx(
        'Pharmacists and patients can check that a ClinicFinder prescription is genuine. Enter the code printed at the bottom of the document.'
      )}</p>
      <form className="panel panel-pad stack" style={{ marginTop: 28 }} onSubmit={submit} noValidate>
        <Field label={tx('Verification code')} error={error && !result ? error : ''} hint={tx('Format: RX-AB12-34')}>
          <Input icon={ShieldCheck} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }} placeholder="RX-____-__" autoComplete="off" spellCheck={false} style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '.08em' }} />
        </Field>
        <Button type="submit" icon={Search} loading={busy}>{tx('Verify')}</Button>
      </form>
      {result && (
        <section className="panel panel-pad stack" style={{ marginTop: 20 }} aria-live="polite">
          <ConfirmCheck />
          <h2 style={{ textAlign: 'center', fontSize: 20 }}>{tx('Genuine prescription')}</h2>
          <dl className="review-list">
            <div><dt>{tx('Code')}</dt><dd className="tnum">{result.code}</dd></div>
            <div><dt>{tx('Issued')}</dt><dd>{formatDate(result.date)}</dd></div>
            <div><dt>{tx('Doctor')}</dt><dd>{result.doctor.name}<br /><span className="muted" style={{ fontWeight: 400 }}>{tx(result.doctor.specialty)}{' '}{tx('· OPL')}{' '}{result.doctor.licenseNumber}</span></dd></div>
            <div><dt>{tx('Patient')}</dt><dd>{result.patientInitials}</dd></div>
            <div><dt>{tx('Medications')}</dt><dd>{result.medicationCount}</dd></div>
          </dl>
          <p className="tiny muted">{tx(
            'Only non-sensitive details are shown. The full prescription is visible to the patient and the prescribing doctor.'
          )}</p>
        </section>
      )}
      {error && param && !busy && (
        <div className="banner danger" style={{ marginTop: 20 }} role="alert"><ShieldX aria-hidden /><div><strong>{tx('Not verified')}</strong>{error}{' '}{tx('Check the code and try again, or contact the prescribing doctor.')}</div></div>
      )}
      <p className="small muted" style={{ marginTop: 20 }}>{tx(
        'Demo tip: sign in as the demo patient and open any prescription to find a real code.'
      )}</p>
    </div>
  );
}
