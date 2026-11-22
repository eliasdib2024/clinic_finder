import { tx } from '../../lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Eye, PenLine, AlertTriangle, ShieldAlert, ArrowLeft, Stethoscope } from 'lucide-react';
import { Button, Checkbox, Field, Input, Modal, Select, Switch, Textarea, Skeleton } from '../../components/ui';
import { MedicationCombo } from '../../components/shared/MedicationCombo';
import { PrescriptionDocument } from '../../components/shared/PrescriptionDocument';
import { useAsync, useBeforeUnload, useDocumentTitle } from '../../hooks';
import { getMyPatients, getPatientRecord, getMyDoctorProfile } from '../../services/doctorService';
import { createPrescription } from '../../services/prescriptionService';
import { useToast } from '../../context/ToastContext';
import { FREQUENCIES, DURATIONS } from '../../lib/constants';
import { allergyConflicts } from '../../lib/allergies';
import { STATUS_LABEL } from '../../lib/lifecycle';
import { addDays, diffDays, formatDate, formatTime, todayISO } from '../../lib/dates';

// Quick picks for the follow-up date (days from today).
const FOLLOW_UP_PICKS = [[7, '1 week'], [14, '2 weeks'], [30, '1 month'], [90, '3 months']];

const emptyRow = () => ({ key: Math.random().toString(36).slice(2), name: '', dose: '', frequency: '', duration: '', notes: '' });

export default function NewPrescription() {
  useDocumentTitle(tx('New prescription'));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [patientId, setPatientId] = useState(params.get('patient') || '');
  const [appointmentId, setAppointmentId] = useState(params.get('appointment') || '');
  const [rows, setRows] = useState([emptyRow()]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState({ enabled: false, date: '', note: '' });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const patients = useAsync(() => getMyPatients(), []);
  const me = useAsync(() => getMyDoctorProfile(), []);
  const record = useAsync(() => (patientId ? getPatientRecord(patientId) : Promise.resolve(null)), [patientId]);

  const dirty = rows.some((r) => r.name || r.dose) || notes.trim().length > 0 || diagnosis.trim().length > 0 || followUp.enabled;
  useBeforeUnload(dirty && !busy);

  const patient = record.data?.patient;
  const linkable = (record.data?.appointments || []).filter((a) => ['confirmed', 'completed'].includes(a.status) && !a.prescriptionId);
  useEffect(() => { if (record.data && appointmentId && !linkable.some((a) => a.id === appointmentId)) setAppointmentId(''); /* eslint-disable-next-line */ }, [record.data]);

  const conflicts = useMemo(() => rows.map((r) => allergyConflicts(r.name, patient?.allergies || [])), [rows, patient]);
  const anyConflict = conflicts.some((c) => c.length);
  useEffect(() => { setAck(false); }, [anyConflict]);

  const setRow = (key, patch) => { setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))); setErrors({}); };
  const validate = () => {
    const e = {};
    if (!patientId) e.patientId = 'Select a patient.';
    if (diagnosis.trim().length < 3) e.diagnosis = 'Enter the diagnosis.';
    if (followUp.enabled) {
      if (!followUp.date) e.followUpDate = 'Choose a follow-up date.';
      else if (followUp.date <= todayISO()) e.followUpDate = 'The follow-up must be after today.';
      else if (diffDays(followUp.date, todayISO()) > 365) e.followUpDate = 'Choose a follow-up within the next year.';
    }
    const filled = rows.filter((r) => r.name || r.dose || r.frequency || r.duration);
    if (!filled.length) e.medications = 'Add at least one medication.';
    rows.forEach((r, i) => {
      if (!(r.name || r.dose || r.frequency || r.duration)) return;
      if (!r.name.trim()) e[`m${i}name`] = 'Required';
      if (!r.dose.trim()) e[`m${i}dose`] = 'Required';
      if (!r.frequency.trim()) e[`m${i}frequency`] = 'Required';
      if (!r.duration.trim()) e[`m${i}duration`] = 'Required';
    });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const followUpPayload = followUp.enabled && followUp.date ? { date: followUp.date, note: followUp.note.trim() } : null;
  const setFU = (patch) => { setFollowUp((f) => ({ ...f, ...patch })); setErrors((e) => ({ ...e, followUpDate: '' })); };

  const issue = async () => {
    if (!validate()) { toast.error(tx('Complete the prescription'), { body: tx('Check the highlighted fields.') }); return; }
    if (anyConflict && !ack) { setErrors({ ack: 'Confirm you reviewed the allergy warning.' }); return; }
    setBusy(true);
    try {
      const rx = await createPrescription({ patientId, appointmentId: appointmentId || null, diagnosis, medications: rows, notes, followUp: followUpPayload });
      toast.success(tx('Prescription {0} issued', {
        0: rx.code
      }), { body: rx.appointmentCompleted ? tx('The linked visit was marked completed.') : tx('{0} can now view it.', {
        0: rx.patient.name
      }) });
      setPreview(false);
      navigate(`/doctor/prescriptions/${rx.id}`, { replace: true });
    } catch (e) { if (e.fields) setErrors(e.fields); toast.error(tx('Not issued'), { body: e.message }); } finally { setBusy(false); }
  };

  const draft = patient && me.data ? {
    date: todayISO(), diagnosis: diagnosis.trim(), followUp: followUpPayload, medications: rows.filter((r) => r.name || r.dose), notes,
    doctor: { name: me.data.name, specialty: me.data.specialty, licenseNumber: me.data.licenseNumber, clinic: me.data.location.name, address: `${me.data.location.address}, ${tx(me.data.city)}`, phone: me.data.location.phone },
    patient: { ...patient },
  } : null;
  const unverified = me.data && me.data.verification.status !== 'approved';

  return (
    <div className="stack" style={{ '--gap': '20px', maxWidth: 1080 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><Button to="/doctor/prescriptions" variant="ghost" size="sm" icon={ArrowLeft} style={{ marginInlineStart: -10, marginBottom: 6 }}>{tx('Prescriptions')}</Button><h1>{tx('New prescription')}</h1><p>{tx(
          'Medication names autocomplete. Allergy conflicts are flagged before you sign.'
        )}</p></div>
      </div>
      {unverified && <div className="banner warning"><ShieldAlert aria-hidden /><div><strong>{tx('Verification required')}</strong>{tx(
        'You can draft a prescription, but issuing is available once your profile is verified.'
      )}</div></div>}

      <section className="panel panel-pad stack" aria-labelledby="pt-h">
        <h2 id="pt-h" style={{ fontSize: 16 }}>{tx('Patient')}</h2>
        <div className="grid grid-2" style={{ '--gap': '14px' }}>
          <Field label={tx('Patient')} required error={errors.patientId}>
            {patients.loading ? <Skeleton h={44} /> : <Select value={patientId} onChange={(e) => { setPatientId(e.target.value); setAppointmentId(''); setErrors({}); }} placeholder={tx('Select a patient')} options={(patients.data || []).map((p) => ({ value: p.id, label: p.name }))} />}
          </Field>
          <Field label={tx('Linked appointment')} hint={tx('Linking a confirmed visit from today or earlier marks it completed.')}>
            <Select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} disabled={!patientId} placeholder={tx('No linked appointment')}
              options={linkable.map((a) => ({ value: a.id, label: `${formatDate(a.date)} · ${formatTime(a.time)} — ${tx(STATUS_LABEL[a.status] || a.status)}` }))} />
          </Field>
        </div>
        {patient && (
          <div className="row wrap small" style={{ '--gap': '18px' }}>
            <span><span className="muted">{tx('Blood type')}{' '}</span><strong>{patient.bloodType || '—'}</strong></span>
            <span><span className="muted">{tx('Insurance')}{' '}</span><strong>{patient.insurance || tx('Self-pay')}</strong></span>
            <span><span className="muted">{tx('Allergies')}{' '}</span><strong style={{ color: patient.allergies.length ? 'var(--rose)' : undefined }}>{patient.allergies.map((x) => tx(x)).join(', ') || tx('None reported')}</strong></span>
          </div>
        )}
      </section>

      <section className="panel panel-pad stack" aria-labelledby="dx-h">
        <h2 id="dx-h" style={{ fontSize: 16 }}>{tx('Diagnosis')}</h2>
        <Field label={tx('Primary diagnosis')} required error={errors.diagnosis} hint={tx('Shown on the prescription the patient and pharmacist see. Not shown on the public verification page.')}>
          <Input icon={Stethoscope} value={diagnosis} maxLength={200} onChange={(e) => { setDiagnosis(e.target.value); setErrors((er) => ({ ...er, diagnosis: '' })); }} placeholder={tx('e.g. Acute bacterial sinusitis')} />
        </Field>
      </section>

      <section className="panel panel-pad stack" aria-labelledby="med-h">
        <div className="row between"><h2 id="med-h" style={{ fontSize: 16 }}>{tx('Medications')}</h2><span className="small muted">{tx(rows.length === 1 ? '{0} row' : '{0} rows', { 0: rows.length })}</span></div>
        {errors.medications && <p className="field-error" role="alert">{errors.medications}</p>}
        {rows.map((r, i) => (
          <div key={r.key} className={`med-row ${conflicts[i].length ? 'conflict' : ''}`}>
            <Field label={tx('Medication {0}', {
              0: i + 1
            })} error={errors[`m${i}name`]} required id={`med-${r.key}`}><MedicationCombo value={r.name} onChange={(v) => setRow(r.key, { name: v })} /></Field>
            <Field label={tx('Dose')} error={errors[`m${i}dose`]} required><Input value={r.dose} onChange={(e) => setRow(r.key, { dose: e.target.value })} placeholder={tx('1 tablet')} /></Field>
            <Field label={tx('Frequency')} error={errors[`m${i}frequency`]} required><Select value={r.frequency} onChange={(e) => setRow(r.key, { frequency: e.target.value })} placeholder={tx('Choose')} options={FREQUENCIES} /></Field>
            <Field label={tx('Duration')} error={errors[`m${i}duration`]} required><Select value={r.duration} onChange={(e) => setRow(r.key, { duration: e.target.value })} placeholder={tx('Choose')} options={DURATIONS} /></Field>
            <div style={{ paddingTop: 26 }}><Button variant="ghost" icon={Trash2} aria-label={tx('Remove medication {0}', {
              0: i + 1
            })} disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input value={r.notes} onChange={(e) => setRow(r.key, { notes: e.target.value })} placeholder={tx('Instructions for this medication (optional), e.g. take with food')} aria-label={tx('Instructions for medication {0}', {
                0: i + 1
              })} />
              {conflicts[i].length > 0 && <div className="rx-alert" role="alert"><AlertTriangle size={15} />{tx('Possible allergy conflict: patient is allergic to {0}.', { 0: conflicts[i].map((x) => tx(x)).join(', ') })}.</div>}
            </div>
          </div>
        ))}
        <div><Button variant="secondary" icon={Plus} onClick={() => setRows((rs) => [...rs, emptyRow()])} disabled={rows.length >= 10}>{tx('Add medication')}</Button></div>
        <Field label={tx('General instructions')} hint={tx('Optional — lifestyle advice, tests to do.')}><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={600} placeholder={tx('e.g. Drink plenty of fluids and avoid strenuous exercise.')} /></Field>
      </section>

      <section className="panel panel-pad stack" aria-labelledby="fu-h">
        <h2 id="fu-h" style={{ fontSize: 16 }}>{tx('Follow-up')}</h2>
        <Switch label={tx('Schedule a follow-up visit')} description={tx('Adds a follow-up date to the prescription and notifies the patient.')}
          checked={followUp.enabled} onChange={(c) => setFU(c ? { enabled: true } : { enabled: false, date: '', note: '' })} />
        {followUp.enabled && (
          <div className="stack enter-up" style={{ '--gap': '12px' }}>
            <div className="chips" role="group" aria-label={tx('Quick picks')}>
              {FOLLOW_UP_PICKS.map(([days, label]) => {
                const d = addDays(todayISO(), days);
                return <button key={days} type="button" className="chip" aria-pressed={followUp.date === d} onClick={() => setFU({ date: d })}>{tx('In {0}', { 0: tx(label) })}</button>;
              })}
            </div>
            <div className="grid grid-2" style={{ '--gap': '14px' }}>
              <Field label={tx('Follow-up date')} required error={errors.followUpDate} hint={followUp.date ? formatDate(followUp.date) : undefined}>
                <Input type="date" value={followUp.date} min={addDays(todayISO(), 1)} max={addDays(todayISO(), 365)} onChange={(e) => setFU({ date: e.target.value })} />
              </Field>
              <Field label={tx('Follow-up note')} hint={tx('Optional')}>
                <Input value={followUp.note} maxLength={300} onChange={(e) => setFU({ note: e.target.value })} placeholder={tx('e.g. Bring your blood test results')} />
              </Field>
            </div>
          </div>
        )}
      </section>

      {anyConflict && (
        <div className="banner danger">
          <AlertTriangle aria-hidden />
          <div className="stack" style={{ '--gap': '8px' }}>
            <div><strong>{tx('Allergy warning')}</strong>{tx(
              'One or more medications may conflict with this patient’s recorded allergies.'
            )}</div>
            <Checkbox checked={ack} onChange={(e) => { setAck(e.target.checked); setErrors({}); }} label={tx('I reviewed the warning and want to prescribe anyway.')} />
            {errors.ack && <span className="field-error">{errors.ack}</span>}
          </div>
        </div>
      )}

      <div className="row wrap" style={{ justifyContent: 'flex-end', '--gap': '10px' }}>
        <Button variant="secondary" icon={Eye} onClick={() => { if (validate()) setPreview(true); }} disabled={!draft}>{tx('Preview')}</Button>
        <Button icon={PenLine} onClick={issue} loading={busy} disabled={unverified}>{tx('Sign & issue')}</Button>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} size="xl" title={tx('Preview prescription')} description={tx(
        'This is how the patient will see it. The verification code is generated when you sign.'
      )}
        footer={<><Button variant="secondary" onClick={() => setPreview(false)}>{tx('Keep editing')}</Button><Button icon={PenLine} onClick={issue} loading={busy} disabled={unverified}>{tx('Sign & issue')}</Button></>} footerBordered>
        {draft && <PrescriptionDocument rx={draft} preview />}
      </Modal>
    </div>
  );
}
