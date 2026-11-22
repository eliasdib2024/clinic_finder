import { tx } from '../../lib/i18n';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Pill, ArrowRight } from 'lucide-react';
import { Avatar, EmptyState, ErrorState, Input, Select, SkeletonRows, Badge } from '../../components/ui';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { listMyPrescriptions } from '../../services/prescriptionService';
import { formatDate, todayISO, addDays } from '../../lib/dates';

export default function PatientPrescriptions() {
  useDocumentTitle(tx('My prescriptions'));
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('');
  const [doctor, setDoctor] = useState('');
  const dq = useDebounce(q, 250);
  const { data, loading, error, reload } = useAsync(() => listMyPrescriptions({ q: dq }), [dq]);
  const doctors = useMemo(() => [...new Map((data || []).map((p) => [p.doctorId, p.doctor.name])).entries()].map(([id, name]) => ({ id, name })), [data]);
  const items = (data || []).filter((p) => (!doctor || p.doctorId === doctor) && (!period || p.date >= addDays(todayISO(), -Number(period))));
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>{tx('My prescriptions')}</h1><p>{tx(
        'Every prescription your doctors issue on ClinicFinder, ready to print or show at the pharmacy.'
      )}</p></div></div>
      <div className="row wrap" style={{ '--gap': '10px' }}>
        <div className="grow" style={{ minWidth: 220 }}><Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search medication, doctor or code')} aria-label={tx('Search prescriptions')} /></div>
        <Select aria-label={tx('Doctor')} value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder={tx('All doctors')} options={doctors} style={{ width: 220 }} />
        <Select aria-label={tx('Period')} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder={tx('Any time')} options={[{ value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 3 months' }, { value: '365', label: 'Last 12 months' }]} style={{ width: 170 }} />
      </div>
      <section className="panel panel-flush">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <div style={{ padding: 20 }}><SkeletonRows /></div> : items.length === 0 ? (
          <EmptyState icon={FileText} title={q || doctor || period ? tx('No prescriptions match') : tx('No prescriptions yet')}>{q || doctor || period ? tx('Try a different search or clear the filters.') : tx(
            'After a visit, your doctor can issue a digital prescription. It will appear here.'
          )}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>{tx('Medications')}</th><th>{tx('Doctor')}</th><th>{tx('Date')}</th><th>{tx('Code')}</th><th><span className="sr-only">{tx('Open')}</span></th></tr></thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main">
                      <div className="row" style={{ '--gap': '12px' }}>
                        <span className="kpi-ic tone-emerald" style={{ width: 36, height: 36 }}><Pill size={17} aria-hidden /></span>
                        <div><Link to={`/patient/prescriptions/${p.id}`} className="strong" style={{ color: 'var(--ink)' }}>{p.medications.map((m) => m.name).join(', ')}</Link><div className="tiny muted">{p.diagnosis && <><bdi>{p.diagnosis}</bdi> · </>}{tx(p.medications.length === 1 ? '{0} item' : '{0} items', { 0: p.medications.length })}{p.followUp?.date && <> · {tx('Follow-up {0}', { 0: formatDate(p.followUp.date) })}</>}</div></div>
                      </div>
                    </td>
                    <td data-label="Doctor"><span className="row" style={{ '--gap': '8px' }}><Avatar name={p.doctor.name} size={26} />{p.doctor.name}</span></td>
                    <td data-label="Date" className="nowrap">{formatDate(p.date)}</td>
                    <td data-label="Code"><Badge tone="teal">{p.code}</Badge></td>
                    <td data-label=""><Link to={`/patient/prescriptions/${p.id}`} className="btn btn-ghost btn-sm" aria-label={tx('Open prescription {0}', {
                      0: p.code
                    })}>{tx('Open')}<ArrowRight size={15} aria-hidden /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
