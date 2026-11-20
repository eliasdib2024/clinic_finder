import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, FilePlus2, ArrowRight } from 'lucide-react';
import { Avatar, Badge, Button, EmptyState, ErrorState, Input, SkeletonRows } from '../../components/ui';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { listMyPrescriptions } from '../../services/prescriptionService';
import { formatDate } from '../../lib/dates';

export default function DoctorPrescriptions() {
  useDocumentTitle(tx('Prescriptions'));
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 250);
  const { data, loading, error, reload } = useAsync(() => listMyPrescriptions({ q: dq }), [dq]);
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('Prescriptions')}</h1><p>{tx(
          'Every prescription you’ve issued, searchable by patient, medication or code.'
        )}</p></div>
        <Button to="/doctor/prescriptions/new" icon={FilePlus2}>{tx('New prescription')}</Button>
      </div>
      <div style={{ maxWidth: 420 }}><Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search patient, medication or RX code')} aria-label={tx('Search prescriptions')} /></div>
      <section className="panel panel-flush">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <div style={{ padding: 20 }}><SkeletonRows /></div> : data.length === 0 ? (
          <EmptyState icon={FileText} title={q ? tx('No prescriptions match') : tx('No prescriptions yet')} action={!q && <Button to="/doctor/prescriptions/new" icon={FilePlus2}>{tx('Write your first prescription')}</Button>}>{q ? tx('Try another search.') : tx(
            'Prescriptions you issue are listed here and sent to the patient instantly.'
          )}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>{tx('Patient')}</th><th>{tx('Diagnosis')}</th><th>{tx('Medications')}</th><th>{tx('Date')}</th><th>{tx('Code')}</th><th><span className="sr-only">{tx('Open')}</span></th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-main"><span className="row" style={{ '--gap': '10px' }}><Avatar name={p.patient.name} size={32} /><strong>{p.patient.name}</strong></span></td>
                    <td data-label="Diagnosis"><bdi>{p.diagnosis || '—'}</bdi>{p.followUp?.date && <div className="tiny muted">{tx('Follow-up {0}', { 0: formatDate(p.followUp.date) })}</div>}</td>
                    <td data-label="Medications">{p.medications.map((m) => m.name).join(', ')}</td>
                    <td data-label="Date" className="nowrap">{formatDate(p.date)}</td>
                    <td data-label="Code"><Badge tone="teal">{p.code}</Badge></td>
                    <td data-label=""><Link to={`/doctor/prescriptions/${p.id}`} className="btn btn-ghost btn-sm">{tx('Open')}<ArrowRight size={15} aria-hidden /></Link></td>
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
