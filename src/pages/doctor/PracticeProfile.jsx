import { tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Undo2, ShieldCheck, ShieldAlert, Send, ExternalLink, Building2, Home } from 'lucide-react';
import { Avatar, Badge, Button, ChipSelect, ConfirmDialog, Field, Input, Select, Switch, Textarea, Skeleton, ErrorState, VerificationBadge, Segmented, Modal } from '../../components/ui';
import { useAsync, useDocumentTitle, useUnsavedGuard } from '../../hooks';
import { getMyDoctorProfile, updateMyDoctorProfile, resubmitVerification } from '../../services/doctorService';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { GOVERNORATES, citiesOf } from '../../lib/constants';
import { fee as vFee, lebanesePhone } from '../../lib/validators';
import { timeAgo } from '../../lib/dates';

const pick = (d) => ({
  bio: d.bio || '', fee: String(d.fee), experience: String(d.experience), languages: [...d.languages], insurances: [...d.insurances],
  videoConsult: !!d.videoConsult, clinicId: d.clinicId || '', practice: { name: d.practice?.name || '', address: d.practice?.address || '', phone: d.practice?.phone || '' },
  governorate: d.governorate, city: d.city, education: (d.education || []).map((e) => ({ ...e, year: e.year ? String(e.year) : '' })),
});

export default function PracticeProfile() {
  useDocumentTitle(tx('Practice profile'));
  const navigate = useNavigate();
  const toast = useToast();
  const { languages, insurers, clinics, reload: reloadCatalog } = useCatalog();
  const { data, loading, error, reload, setData } = useAsync(() => getMyDoctorProfile(), []);
  const [form, setForm] = useState(null);
  const [initial, setInitial] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [resubmit, setResubmit] = useState(false);
  const [resub, setResub] = useState({ licenseNumber: '', note: '' });

  useEffect(() => { reloadCatalog().catch(() => {}); }, [reloadCatalog]);
  useEffect(() => { if (data) { const f = pick(data); setForm(f); setInitial(JSON.stringify(f)); setResub({ licenseNumber: data.licenseNumber, note: '' }); } }, [data]);
  const dirty = form && JSON.stringify(form) !== initial;
  const guard = useUnsavedGuard(dirty && !busy, navigate);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !form) return <div className="stack"><Skeleton h={40} w={300} /><Skeleton h={500} r={22} /></div>;

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const setPractice = (k, v) => { setForm((f) => ({ ...f, practice: { ...f.practice, [k]: v } })); setErrors((e) => ({ ...e, [`practice.${k}`]: '' })); };
  const ownPractice = !form.clinicId;

  const save = async () => {
    const errs = {};
    if (vFee(form.fee)) errs.fee = vFee(form.fee);
    if (!form.languages.length) errs.languages = 'Select at least one language.';
    if (ownPractice) {
      if (!form.practice.name.trim()) errs['practice.name'] = 'Practice name is required.';
      if (!form.practice.address.trim()) errs['practice.address'] = 'Address is required.';
      if (form.practice.phone && lebanesePhone(form.practice.phone)) errs['practice.phone'] = lebanesePhone(form.practice.phone);
      if (!citiesOf(form.governorate).includes(form.city)) errs.city = 'Choose a city.';
    }
    form.education.forEach((e, i) => { if (!e.degree.trim() || !e.institution.trim()) errs[`edu${i}`] = 'Degree and institution are required.'; if (e.year && !/^(19|20)\d{2}$/.test(e.year)) errs[`edu${i}`] = 'Enter a valid year.'; });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error(tx('Check the highlighted fields')); return; }
    setBusy(true);
    try {
      const patch = { ...form, clinicId: form.clinicId || null, education: form.education.map((e) => ({ ...e, year: e.year ? Number(e.year) : null })) };
      if (!ownPractice) { delete patch.governorate; delete patch.city; }
      const d = await updateMyDoctorProfile(patch);
      setData(d);
      toast.success(tx('Profile saved'), { body: d.verification.status === 'approved' ? tx('Patients see the update right away.') : tx('Your changes are saved.') });
    } catch (e) { setErrors(e.fields || {}); toast.error(tx('Not saved'), { body: e.message }); } finally { setBusy(false); }
  };

  const doResubmit = async () => {
    const d = await resubmitVerification(resub);
    setData(d);
    toast.success(tx('Application re-submitted'), { body: tx('An administrator will review it again.') });
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('Practice profile')}</h1><p>{tx('What patients see on your public page and in search results.')}</p></div>
        {data.verification.status === 'approved' && <Button to={`/doctors/${data.id}`} target="_blank" variant="secondary" icon={ExternalLink}>{tx('View public page')}</Button>}
      </div>

      <section className={`banner ${data.verification.status === 'approved' ? 'success' : data.verification.status === 'rejected' ? 'danger' : 'warning'}`} aria-label={tx('Verification status')}>
        {data.verification.status === 'approved' ? <ShieldCheck aria-hidden /> : <ShieldAlert aria-hidden />}
        <div className="grow">
          <div className="row wrap" style={{ '--gap': '8px', marginBottom: 2 }}><strong style={{ margin: 0 }}>{tx('Verification')}</strong><VerificationBadge status={data.verification.status} />{data.verification.resubmitted && data.verification.status === 'pending' && <Badge tone="blue">{tx('Re-submitted')}</Badge>}</div>
          {data.verification.status === 'approved' && <>{tx('License {0} verified. Your profile is visible to patients.', { 0: data.licenseNumber })}</>}
          {data.verification.status === 'pending' && <>{tx('Submitted {0}. License no. {1} is being checked against the Order of Physicians registry.', { 0: timeAgo(data.verification.submittedAt), 1: data.licenseNumber })}</>}
          {data.verification.status === 'rejected' && <><div><strong style={{ display: 'inline' }}>{tx('Reason:')}{' '}</strong>{tx(data.verification.reason)}</div><Button size="sm" icon={Send} style={{ marginTop: 10 }} onClick={() => setResubmit(true)}>{tx('Review and re-submit')}</Button></>}
        </div>
      </section>

      <div className="split">
        <div className="stack" style={{ '--gap': '20px' }}>
          <section className="panel panel-pad stack" aria-labelledby="ab-h">
            <h2 id="ab-h" style={{ fontSize: 16 }}>{tx('About you')}</h2>
            {/* Identity is read-only here: the name is edited in Settings only, and doctors have no picture. */}
            <div className="identity-row">
              <Avatar name={data.name} size={64} square />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="strong" style={{ fontSize: 17 }}>{data.name}</div>
                <div className="small muted">{tx(data.specialty)}</div>
                <Link to="/doctor/settings" className="tiny">{tx('Change your name in Settings')}</Link>
              </div>
            </div>
            <Field label={tx('Years of experience')} error={errors.experience}><Input type="number" min={0} max={60} value={form.experience} onChange={(e) => set('experience', e.target.value)} style={{ maxWidth: 160 }} /></Field>
            <Field label={tx('Biography')} error={errors.bio} hint={tx(
              '{0}/1200 — your approach, conditions you treat, what patients can expect.',
              {
                0: form.bio.length
              }
            )}><Textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={5} maxLength={1200} /></Field>
          </section>

          <section className="panel panel-pad stack" aria-labelledby="cl-h">
            <h2 id="cl-h" style={{ fontSize: 16 }}>{tx('Where you practise')}</h2>
            <Segmented label={tx('Practice type')} value={ownPractice ? 'own' : 'listed'} onChange={(v) => set('clinicId', v === 'own' ? '' : (data.clinicId || clinics[0]?.id || ''))}
              options={[{ value: 'listed', label: 'Listed clinic', icon: Building2 }, { value: 'own', label: 'Own practice', icon: Home }]} />
            {!ownPractice ? (
              <Field label={tx('Clinic')} error={errors.clinicId} hint={tx('Location is taken from the clinic.')}><Select value={form.clinicId} onChange={(e) => set('clinicId', e.target.value)} options={clinics.map((c) => ({ value: c.id, label: `${c.name} — ${tx(c.city)}` }))} /></Field>
            ) : (
              <>
                <div className="grid grid-2" style={{ '--gap': '14px' }}>
                  <Field label={tx('Practice name')} error={errors['practice.name']} required><Input value={form.practice.name} onChange={(e) => setPractice('name', e.target.value)} /></Field>
                  <Field label={tx('Phone')} error={errors['practice.phone']}><Input type="tel" value={form.practice.phone} onChange={(e) => setPractice('phone', e.target.value)} placeholder="01 234 567" /></Field>
                </div>
                <Field label={tx('Street address')} error={errors['practice.address']} required><Input value={form.practice.address} onChange={(e) => setPractice('address', e.target.value)} placeholder={tx('Street, building, floor')} /></Field>
                <div className="grid grid-2" style={{ '--gap': '14px' }}>
                  <Field label={tx('Governorate')}><Select value={form.governorate} onChange={(e) => setForm((f) => ({ ...f, governorate: e.target.value, city: '' }))} options={GOVERNORATES} /></Field>
                  <Field label={tx('City')} error={tx(errors.city)}><Select value={tx(form.city)} onChange={(e) => set('city', e.target.value)} placeholder={tx('Select')} options={citiesOf(form.governorate)} /></Field>
                </div>
              </>
            )}
          </section>

          <section className="panel panel-pad stack" aria-labelledby="ed-h">
            <div className="row between"><h2 id="ed-h" style={{ fontSize: 16 }}>{tx('Education & training')}</h2><Button size="sm" variant="ghost" icon={Plus} onClick={() => set('education', [...form.education, { degree: '', institution: '', year: '' }])}>{tx('Add')}</Button></div>
            {form.education.length === 0 && <p className="small muted">{tx('Add your medical degree and specialty training.')}</p>}
            {form.education.map((e, i) => (
              <div key={i} className="stack" style={{ '--gap': '4px' }}>
                <div className="edu-row">
                  <Input aria-label={tx('Degree {0}', {
                    0: i + 1
                  })} value={e.degree} placeholder={tx('Degree')} onChange={(ev) => set('education', form.education.map((x, j) => (j === i ? { ...x, degree: ev.target.value } : x)))} />
                  <Input aria-label={tx('Institution {0}', {
                    0: i + 1
                  })} value={e.institution} placeholder={tx('Institution')} onChange={(ev) => set('education', form.education.map((x, j) => (j === i ? { ...x, institution: ev.target.value } : x)))} />
                  <Input aria-label={tx('Year {0}', {
                    0: i + 1
                  })} value={e.year} placeholder={tx('Year')} inputMode="numeric" maxLength={4} onChange={(ev) => set('education', form.education.map((x, j) => (j === i ? { ...x, year: ev.target.value } : x)))} />
                  <Button variant="ghost" icon={Trash2} aria-label={tx('Remove education {0}', {
                    0: i + 1
                  })} onClick={() => set('education', form.education.filter((_, j) => j !== i))} />
                </div>
                {errors[`edu${i}`] && <span className="field-error">{errors[`edu${i}`]}</span>}
              </div>
            ))}
          </section>
        </div>

        <div className="stack" style={{ '--gap': '20px' }}>
          <section className="panel panel-pad stack" aria-labelledby="fee-h">
            <h2 id="fee-h" style={{ fontSize: 16 }}>{tx('Consultation')}</h2>
            <Field label={tx('Fee (USD)')} error={errors.fee} required><Input type="number" min={0} max={1000} value={form.fee} onChange={(e) => set('fee', e.target.value)} /></Field>
            <Switch label={tx('Video consultations')} description={tx('Let patients book remote visits.')} checked={form.videoConsult} onChange={(c) => set('videoConsult', c)} />
          </section>
          <section className="panel panel-pad stack" aria-labelledby="lg-h">
            <h2 id="lg-h" style={{ fontSize: 16 }}>{tx('Languages spoken')}</h2>
            <ChipSelect label={tx('Languages')} options={languages} value={form.languages} onChange={(v) => set('languages', v)} />
            {errors.languages && <span className="field-error" role="alert">{errors.languages}</span>}
          </section>
          <section className="panel panel-pad stack" aria-labelledby="in-h">
            <h2 id="in-h" style={{ fontSize: 16 }}>{tx('Accepted insurance')}</h2>
            <ChipSelect label={tx('Insurance')} options={insurers} value={form.insurances} onChange={(v) => set('insurances', v)} />
            <span className="tiny muted">{tx('Patients filtering by “only my insurance” will find you.')}</span>
          </section>
          <section className="panel panel-pad stack small">
            <h2 style={{ fontSize: 16 }}>{tx('License')}</h2>
            <dl className="kv"><dt>{tx('Order of Physicians')}</dt><dd>{data.licenseNumber}</dd><dt>{tx('Specialty')}</dt><dd>{tx(data.specialty)}</dd></dl>
            <span className="tiny muted">{tx('Contact support to change your specialty or license number.')}</span>
          </section>
        </div>
      </div>

      {dirty && (
        <div className="unsaved-bar" role="status">
          <span className="row" style={{ '--gap': '10px' }}><Badge tone="amber">{tx('Unsaved')}</Badge>{tx('You have unsaved changes.')}</span>
          <div className="row" style={{ '--gap': '8px' }}>
            <Button variant="secondary" size="sm" icon={Undo2} onClick={() => { setForm(JSON.parse(initial)); setErrors({}); }} disabled={busy}>{tx('Discard')}</Button>
            <Button size="sm" icon={Save} onClick={save} loading={busy}>{tx('Save changes')}</Button>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!guard.pending} onClose={guard.cancel} onConfirm={async () => guard.confirm()} title={tx('Leave without saving?')} confirmLabel={tx('Leave page')} description={tx('Your profile changes will be lost.')} />
      <Modal open={resubmit} onClose={() => setResubmit(false)} title={tx('Re-submit for verification')} description={tx('Correct your details and add a note for the reviewer.')}
        footer={<><Button variant="secondary" onClick={() => setResubmit(false)}>{tx('Cancel')}</Button><Button icon={Send} onClick={async () => { try { await doResubmit(); setResubmit(false); } catch (e) { toast.error(tx('Not submitted'), { body: e.message }); } }}>{tx('Re-submit')}</Button></>}>
        <div className="stack">
          <div className="banner danger"><ShieldAlert aria-hidden /><div><strong>{tx('Previous decision')}</strong>{tx(data.verification.reason)}</div></div>
          <Field label={tx('Order of Physicians license number')} required><Input value={resub.licenseNumber} onChange={(e) => setResub((r) => ({ ...r, licenseNumber: e.target.value }))} inputMode="numeric" maxLength={6} data-autofocus /></Field>
          <Field label={tx('Note to the reviewer')} hint={tx('Optional')}><Textarea value={resub.note} onChange={(e) => setResub((r) => ({ ...r, note: e.target.value }))} rows={3} placeholder={tx('e.g. Corrected a typo in my license number.')} /></Field>
        </div>
      </Modal>
    </div>
  );
}
