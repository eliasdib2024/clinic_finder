import { tx } from '../../lib/i18n';
import { useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer, Copy, ShieldCheck } from 'lucide-react';
import { Button, Skeleton, ErrorState } from '../../components/ui';
import { PrescriptionDocument } from '../../components/shared/PrescriptionDocument';
import { getPrescription } from '../../services/prescriptionService';
import { useAsync, useDocumentTitle } from '../../hooks';
import { useToast } from '../../context/ToastContext';

export default function PrescriptionPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const toast = useToast();
  const role = pathname.startsWith('/doctor') ? 'doctor' : 'patient';
  const { data, loading, error, reload } = useAsync(() => getPrescription(id), [id]);
  useDocumentTitle(data ? tx('Prescription {0}', {
    0: data.code
  }) : tx('Prescription'));
  const copy = async () => { try { await navigator.clipboard.writeText(data.code); toast.success(tx('Code copied'), { body: data.code }); } catch { toast.info(data.code); } };
  return (
    <div style={{ maxWidth: 880, marginInline: 'auto' }}>
      <div className="row between wrap no-print" style={{ marginBottom: 18 }}>
        <Button to={`/${role}/prescriptions`} variant="ghost" size="sm" icon={ArrowLeft}>{tx('All prescriptions')}</Button>
        {data && (
          <div className="row wrap" style={{ '--gap': '8px' }}>
            <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>{tx('Copy code')}</Button>
            <Button variant="secondary" size="sm" icon={ShieldCheck} to={`/verify/${data.code}`} target="_blank">{tx('Verify')}</Button>
            <Button size="sm" icon={Printer} onClick={() => window.print()}>{tx('Print or save as PDF')}</Button>
          </div>
        )}
      </div>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div className="panel panel-pad stack"><Skeleton h={60} /><Skeleton h={90} /><Skeleton h={160} /></div> : <PrescriptionDocument rx={data} />}
      <p className="tiny muted no-print" style={{ marginTop: 12 }}>{tx('Tip: in the print dialog choose “Save as PDF” to keep a copy.')}</p>
    </div>
  );
}
