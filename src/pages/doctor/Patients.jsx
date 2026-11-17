import { noteText } from '../../components/shared/AppointmentBits';
import { tx } from '../../lib/i18n';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, FilePlus2, FileText, Droplet, ShieldCheck, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Avatar, Badge, Button, Drawer, EmptyState, ErrorState, Input, Select, SkeletonRows, StatusBadge, Tabs } from '../../components/ui';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { getMyPatients, getPatientRecord } from '../../services/doctorService';
import { formatDate, formatTime, relativeDay } from '../../lib/dates';
import { formatLebanesePhone } from '../../lib/validators';

const age = (dob) => (dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : null);

function RecordDrawer({ patientId, onClose }) {
  const { data, loading, error } = useAsync(() => (patientId ? getPatientRecord(patientId) : Promise.resolve(null)), [patientId]);
  const [tab, setTab] = useState('visits');
  const p = data?.patient;
  return (
    <Drawer open={!!patientId} onClose={onClose} title={tx('Patient record')} width="min(560px, 100vw)"
      footer={p && <Button icon={FilePlus2} to={`/doctor/prescriptions/new?patient=${p.id}`}>{tx('New prescription')}</Button>}>
      {error ? <ErrorState error={error} /> : loading || !p ? <SkeletonRows rows={5} /> : (
        <div className="stack" style={{ '--gap': '20px' }}>
          <div className="row" style={{ '--gap': '14px' }}>
            <Avatar name={p.name} size={60} />
            <div><h3 style={{ fontSize: 19 }}>{p.name}</h3><div className="small muted">{[age(p.dob) && tx('{0} years', { 0: age(p.dob) }), p.gender === 'f' ? tx('Female') : p.gender === 'm' ? tx('Male') : null].filter(Boolean).join(' · ')}</div></div>
          </div>
          {p.allergies.length > 0 && <div className="banner danger"><AlertTriangle aria-hidden /><div><strong>{tx('Allergies')}</strong>{p.allergies.map((x) => tx(x)).join(', ')}</div></div>}
          <div className="grid grid-2" style={{ '--gap': '10px' }}>
            <div className="tile"><div className="row small muted" style={{ '--gap': '6px' }}><Droplet size={14} />{tx('Blood type')}</div><div className="strong" style={{ fontSize: 18 }}>{p.bloodType || '—'}</div></div>
            <div className="tile"><div className="row small muted" style={{ '--gap': '6px' }}><ShieldCheck size={14} />{tx('Insurance')}</div><div className="strong">{p.insurance || tx('Self-pay')}</div>{p.insuranceNumber && <div className="tiny muted">{p.insuranceNumber}</div>}</div>
          </div>
          <dl className="kv">
            <dt><span className="row" style={{ '--gap': '6px' }}><Phone size={14} />{tx('Phone')}</span></dt><dd><a href={`tel:${p.phone}`}>{formatLebanesePhone(p.phone)}</a></dd>
            <dt><span className="row" style={{ '--gap': '6px' }}><Mail size={14} />{tx('Email')}</span></dt><dd><a href={`mailto:${p.email}`}>{p.email}</a></dd>
            {p.dob && <><dt>{tx('Date of birth')}</dt><dd>{formatDate(p.dob, { day: 'numeric', month: 'long', year: 'numeric' })}</dd></>}
          </dl>
          <Tabs label={tx('Record sections')} value={tab} onChange={setTab} tabs={[{ id: 'visits', label: 'Visits', count: data.appointments.length }, { id: 'rx', label: 'Prescriptions', count: data.prescriptions.length }]} />
          {tab === 'visits' ? (
            <div className="stack" style={{ '--gap': '0' }}>
              {data.appointments.map((a) => (
                <div key={a.id} className="list-row">
                  <div className="grow"><div className="strong small">{formatDate(a.date)} · {formatTime(a.time)}</div><div className="tiny muted">{tx(a.reason)}</div>{a.statusNote && <div className="tiny muted">“{noteText(a)}”</div>}</div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : data.prescriptions.length === 0 ? <p className="small muted">{tx('No prescriptions issued yet.')}</p> : (
            <div className="stack" style={{ '--gap': '0' }}>
              {data.prescriptions.map((r) => (
                <Link key={r.id} to={`/doctor/prescriptions/${r.id}`} className="list-row" style={{ color: 'inherit' }}>
                  <span className="kpi-ic tone-emerald" style={{ width: 34, height: 34 }}><FileText size={16} aria-hidden /></span>
                  <div className="grow"><div className="strong small">{r.medications.map((m) => m.name).join(', ')}</div><div className="tiny muted">{formatDate(r.date)} · {r.code}</div></div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default function DoctorPatients() {
  useDocumentTitle(tx('Patients'));
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);
  const dq = useDebounce(q, 200);
  const { data, loading, error, reload } = useAsync(() => getMyPatients(), []);
  const items = useMemo(() => (data || []).filter((p) => {
    const s = dq.toLowerCase();
    if (s && ![p.name, p.email, p.phone, p.insurance].some((x) => x?.toLowerCase().includes(s))) return false;
    if (filter === 'upcoming' && !p.nextVisit) return false;
    if (filter === 'allergies' && !p.allergies.length) return false;
    return true;
  }), [data, dq, filter]);

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>{tx('Patients')}</h1><p>{tx(
        'Everyone who has booked with you, with their health details and visit history.'
      )}</p></div></div>
      <div className="row wrap" style={{ '--gap': '10px' }}>
        <div className="grow" style={{ minWidth: 220, maxWidth: 420 }}><Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search by name, phone, email or insurance')} aria-label={tx('Search patients')} /></div>
        <Select aria-label={tx('Filter')} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tx('All patients')} options={[{ value: 'upcoming', label: 'With an upcoming visit' }, { value: 'allergies', label: 'With allergies' }]} style={{ width: 230 }} />
      </div>
      <section className="panel panel-flush">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div style={{ padding: 20 }}><SkeletonRows rows={5} /></div> : items.length === 0 ? (
          <EmptyState icon={Users} title={data?.length ? tx('No patients match') : tx('No patients yet')}>{data?.length ? tx('Try a different search.') : tx('Patients appear here after their first booking.')}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>{tx('Patient')}</th><th>{tx('Blood')}</th><th>{tx('Allergies')}</th><th>{tx('Insurance')}</th><th>{tx('Last visit')}</th><th>{tx('Next visit')}</th></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => setOpen(p.id)}>
                    <td className="cell-main"><button className="row link-btn" style={{ color: 'var(--ink)', '--gap': '10px' }} onClick={(e) => { e.stopPropagation(); setOpen(p.id); }}><Avatar name={p.name} size={34} /><span style={{ textAlign: 'start' }}><span className="strong" style={{ display: 'block' }}>{p.name}</span><span className="tiny muted" style={{ fontWeight: 400 }}>{formatLebanesePhone(p.phone)}</span></span></button></td>
                    <td data-label="Blood">{p.bloodType || '—'}</td>
                    <td data-label="Allergies">{p.allergies.length ? <Badge tone="rose">{p.allergies.map((x) => tx(x)).join(', ')}</Badge> : <span className="muted">{tx('None')}</span>}</td>
                    <td data-label="Insurance">{p.insurance || <span className="muted">{tx('Self-pay')}</span>}</td>
                    <td data-label="Last visit" className="nowrap">{p.lastVisit ? formatDate(p.lastVisit, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td data-label="Next visit" className="nowrap">{p.nextVisit ? `${tx('{0}, {1}', { 0: relativeDay(p.nextVisit.date), 1: formatTime(p.nextVisit.time) })}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <RecordDrawer patientId={open} onClose={() => setOpen(null)} />
    </div>
  );
}
