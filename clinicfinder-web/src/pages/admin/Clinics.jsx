import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Search, Phone, MapPin } from 'lucide-react';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, Select, SkeletonRows } from '../../components/ui';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { listClinics, createClinic, updateClinic, deleteClinic } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { useCatalog } from '../../context/CatalogContext';
import { CLINIC_TYPES, GOVERNORATES, citiesOf, governorateName } from '../../lib/constants';
import { lebanesePhone, formatLebanesePhone } from '../../lib/validators';

const EMPTY = { name: '', type: 'medical-center', governorate: '', city: '', address: '', phone: '' };

function ClinicForm({ open, initial, onClose, onSaved }) {
  const toast = useToast();
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) { setLastOpen(true); setV(initial ? { ...initial, phone: formatLebanesePhone(initial.phone) } : EMPTY); setErrors({}); }
  if (!open && lastOpen) setLastOpen(false);
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value, ...(k === 'governorate' ? { city: '' } : {}) })); setErrors((s) => ({ ...s, [k]: '' })); };
  const save = async (e) => {
    e?.preventDefault();
    const errs = {};
    if (v.name.trim().length < 3) errs.name = 'Enter the clinic name (3+ characters).';
    if (!v.governorate) errs.governorate = 'Choose a governorate.';
    if (!v.city) errs.city = 'Choose a city.';
    if (v.address.trim().length < 5) errs.address = 'Enter the street address.';
    if (lebanesePhone(v.phone)) errs.phone = lebanesePhone(v.phone);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const c = initial ? await updateClinic(initial.id, v) : await createClinic(v);
      toast.success(initial ? tx('Clinic updated') : tx('Clinic created'), { body: c.name });
      onSaved(); onClose();
    } catch (err) { setErrors(err.fields || {}); if (!err.fields) toast.error(tx('Not saved'), { body: err.message }); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={initial ? tx('Edit clinic') : tx('Add a clinic')} description={initial?.doctors ? tx(initial.doctors === 1 ? '1 doctor practises here — location changes apply to them too.' : '{0} doctors practise here — location changes apply to them too.', { 0: initial.doctors }) : undefined}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>{tx('Cancel')}</Button><Button onClick={save} loading={busy}>{initial ? tx('Save changes') : tx('Create clinic')}</Button></>}>
      <form className="stack" onSubmit={save} noValidate>
        <Field label={tx('Clinic name')} error={errors.name} required><Input value={v.name} onChange={set('name')} data-autofocus /></Field>
        <Field label={tx('Type')} error={errors.type} required><Select value={v.type} onChange={set('type')} options={CLINIC_TYPES} /></Field>
        <div className="grid grid-2" style={{ '--gap': '14px' }}>
          <Field label={tx('Governorate')} error={errors.governorate} required><Select value={v.governorate} onChange={set('governorate')} placeholder={tx('Select')} options={GOVERNORATES} /></Field>
          <Field label={tx('City')} error={tx(errors.city)} required><Select value={tx(v.city)} onChange={set('city')} placeholder={v.governorate ? tx('Select') : tx('Governorate first')} disabled={!v.governorate} options={citiesOf(v.governorate)} /></Field>
        </div>
        <Field label={tx('Street address')} error={errors.address} required><Input value={v.address} onChange={set('address')} placeholder={tx('Street, building, floor')} /></Field>
        <Field label={tx('Phone')} error={errors.phone} required hint={tx('Lebanese landline or mobile')}><Input type="tel" value={v.phone} onChange={set('phone')} placeholder="01 234 567" /></Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function AdminClinics() {
  useDocumentTitle(tx('Clinics'));
  const toast = useToast();
  const { reload: reloadCatalog } = useCatalog();
  const [q, setQ] = useState('');
  const [gov, setGov] = useState('');
  const dq = useDebounce(q, 200);
  const [form, setForm] = useState(null); // { initial }
  const [del, setDel] = useState(null);
  const { data, loading, error, reload } = useAsync(() => listClinics(), []);
  const refresh = () => { reload(); reloadCatalog().catch(() => {}); };
  const items = (data || []).filter((c) => (!gov || c.governorate === gov) && (!dq || [c.name, c.city, c.address].some((x) => x.toLowerCase().includes(dq.toLowerCase()))));

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('Clinics')}</h1><p>{tx('Clinics doctors can choose as their place of practice.')}</p></div>
        <Button icon={Plus} onClick={() => setForm({ initial: null })}>{tx('Add clinic')}</Button>
      </div>
      <div className="row wrap" style={{ '--gap': '10px' }}>
        <div className="grow" style={{ minWidth: 220, maxWidth: 420 }}><Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search name, city or address')} aria-label={tx('Search clinics')} /></div>
        <Select aria-label={tx('Governorate')} value={gov} onChange={(e) => setGov(e.target.value)} placeholder={tx('All governorates')} options={GOVERNORATES} style={{ width: 210 }} />
      </div>
      <section className="panel panel-flush">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div style={{ padding: 20 }}><SkeletonRows rows={5} /></div> : items.length === 0 ? (
          <EmptyState icon={Building2} title={data?.length ? tx('No clinics match') : tx('No clinics yet')} action={!data?.length && <Button icon={Plus} onClick={() => setForm({ initial: null })}>{tx('Add the first clinic')}</Button>}>{data?.length ? tx('Try another search.') : tx('Add clinics so doctors can link their profile to them.')}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>{tx('Clinic')}</th><th>{tx('Type')}</th><th>{tx('Location')}</th><th>{tx('Phone')}</th><th>{tx('Doctors')}</th><th><span className="sr-only">{tx('Actions')}</span></th></tr></thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-main"><span className="row" style={{ '--gap': '10px' }}><span className="kpi-ic tone-blue" style={{ width: 34, height: 34 }}><Building2 size={16} aria-hidden /></span><span><span className="strong" style={{ display: 'block' }}><bdi>{c.name}</bdi></span><span className="tiny muted"><bdi>{c.address}</bdi></span></span></span></td>
                    <td data-label="Type"><Badge tone="slate">{tx(CLINIC_TYPES.find((t) => t.id === c.type)?.name)}</Badge></td>
                    <td data-label="Location"><span className="row" style={{ '--gap': '6px' }}><MapPin size={14} className="muted" />{tx(c.city)}, {tx(governorateName(c.governorate))}</span></td>
                    <td data-label="Phone" className="nowrap"><span className="row" style={{ '--gap': '6px' }}><Phone size={14} className="muted" />{formatLebanesePhone(c.phone)}</span></td>
                    <td data-label="Doctors" className="tnum">{c.doctors}</td>
                    <td data-label="">
                      <div className="row" style={{ '--gap': '4px', justifyContent: 'flex-end' }}>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ initial: c })} aria-label={tx('Edit {0}', {
                          0: c.name
                        })}>{tx('Edit')}</Button>
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDel(c)} aria-label={tx('Delete {0}', {
                          0: c.name
                        })} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ClinicForm open={!!form} initial={form?.initial} onClose={() => setForm(null)} onSaved={refresh} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={tx('Delete {0}?', {
        0: del?.name
      })} confirmLabel={tx('Delete clinic')}
        description={del?.doctors ? tx(del.doctors === 1 ? '1 doctor practises here, so it can’t be deleted until they move to another clinic.' : '{0} doctors practise here, so it can’t be deleted until they move to another clinic.', { 0: del.doctors }) : tx('This clinic will be removed from the list doctors can choose from.')}
        onConfirm={async () => { await deleteClinic(del.id); toast.success(tx('Clinic deleted')); refresh(); }} />
    </div>
  );
}
