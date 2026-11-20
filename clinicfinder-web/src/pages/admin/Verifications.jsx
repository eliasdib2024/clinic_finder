import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { ShieldCheck, Check, X, Eye, BadgeCheck, MapPin, Mail, Phone, Clock, History } from 'lucide-react';
import { Avatar, Badge, Button, ConfirmDialog, Drawer, EmptyState, ErrorState, SkeletonRows, Tabs, VerificationBadge } from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks';
import { listDoctorsByVerification, setVerification } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { timeAgo, formatDate } from '../../lib/dates';
import { formatLebanesePhone } from '../../lib/validators';
import { currency } from '../../lib/format';

export default function AdminVerifications() {
  useDocumentTitle(tx('Doctor verification'));
  const toast = useToast();
  const [tab, setTab] = useState('pending');
  const { data, loading, error, reload } = useAsync(() => listDoctorsByVerification('all'), []);
  const [review, setReview] = useState(null);
  const [action, setAction] = useState(null);

  const list = (data || []).filter((d) => tab === 'all' || d.verification.status === tab);
  const count = (s) => (data || []).filter((d) => s === 'all' || d.verification.status === s).length;

  const decide = async (status, reason) => {
    const d = action.doctor;
    await setVerification(d.id, status, reason);
    toast.success(status === 'approved' ? tx('{0} is verified', {
      0: d.name
    }) : tx('Application rejected'), { body: status === 'approved' ? tx('Their profile is now visible to patients.') : tx('The doctor can see your reason and re-submit.') });
    setReview(null);
    reload();
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>{tx('Doctor verification')}</h1><p>{tx(
        'Check each license against the Lebanese Order of Physicians registry before approving.'
      )}</p></div></div>
      <Tabs label={tx('Verification status')} value={tab} onChange={setTab} tabs={[
        { id: 'pending', label: 'Pending', count: data ? count('pending') : undefined },
        { id: 'rejected', label: 'Rejected', count: data ? count('rejected') : undefined },
        { id: 'approved', label: 'Approved', count: data ? count('approved') : undefined },
        { id: 'all', label: 'All', count: data ? count('all') : undefined },
      ]} />
      <section className="panel panel-flush">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading ? <div style={{ padding: 20 }}><SkeletonRows rows={4} /></div> : list.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={tab === 'pending' ? tx('No applications waiting') : tx('Nothing here')}>{tab === 'pending' ? tx('New doctor sign-ups and re-submissions will appear here.') : tx('No doctors with this status.')}</EmptyState>
        ) : list.map((d) => (
          <article key={d.id} className="appt-card" style={{ gridTemplateColumns: '56px minmax(0, 1fr) auto' }}>
            <Avatar name={d.name} size={52} square />
            <div style={{ minWidth: 0 }}>
              <div className="row wrap" style={{ '--gap': '8px' }}><strong>{d.name}</strong><VerificationBadge status={d.verification.status} />{d.verification.resubmitted && d.verification.status === 'pending' && <Badge tone="blue" icon={History}>{tx('Re-submitted')}</Badge>}</div>
              <div className="appt-meta">
                <span><BadgeCheck aria-hidden />{tx(d.specialty)}{' '}{tx('· OPL')}{' '}{d.licenseNumber}</span>
                <span><MapPin aria-hidden />{tx(d.city)}, {d.governorateName}</span>
                <span><Clock aria-hidden />{tx('Submitted')}{' '}{timeAgo(d.verification.submittedAt)}</span>
              </div>
              {d.verification.reason && <div className="note-box"><X aria-hidden /><span>{d.verification.status === 'rejected' ? tx('Rejected: ') : tx('Previous rejection: ')}{tx(d.verification.reason)}</span></div>}
            </div>
            <div className="appt-actions">
              <Button variant="ghost" size="sm" icon={Eye} onClick={() => setReview(d)}>{tx('Review')}</Button>
              {d.verification.status === 'pending' && <>
                <Button size="sm" icon={Check} onClick={() => setAction({ kind: 'approve', doctor: d })}>{tx('Approve')}</Button>
                <Button size="sm" variant="danger-soft" icon={X} onClick={() => setAction({ kind: 'reject', doctor: d })}>{tx('Reject')}</Button>
              </>}
            </div>
          </article>
        ))}
      </section>

      <Drawer open={!!review} onClose={() => setReview(null)} title={tx('Application details')}
        footer={review?.verification.status === 'pending' && <><Button variant="danger-soft" icon={X} onClick={() => setAction({ kind: 'reject', doctor: review })}>{tx('Reject')}</Button><Button icon={Check} onClick={() => setAction({ kind: 'approve', doctor: review })}>{tx('Approve')}</Button></>}>
        {review && (
          <div className="stack" style={{ '--gap': '18px' }}>
            <div className="row" style={{ '--gap': '14px' }}><Avatar name={review.name} size={64} square /><div><h3 style={{ fontSize: 19 }}>{review.name}</h3><div className="small muted">{tx(review.specialty)}</div><div style={{ marginTop: 6 }}><VerificationBadge status={review.verification.status} /></div></div></div>
            <div className="tile stack" style={{ '--gap': '6px' }}>
              <div className="small muted">{tx('Order of Physicians license number')}</div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '.06em' }} className="tnum">{review.licenseNumber}</div>
              <div className="tiny muted">{tx('Check this number in the official registry before approving.')}</div>
            </div>
            <dl className="kv">
              <dt><span className="row" style={{ '--gap': '6px' }}><Mail size={14} />{tx('Email')}</span></dt><dd>{review.email}</dd>
              <dt><span className="row" style={{ '--gap': '6px' }}><Phone size={14} />{tx('Phone')}</span></dt><dd>{formatLebanesePhone(review.phone)}</dd>
              <dt>{tx('Location')}</dt><dd><bdi>{review.location.name}</bdi><div className="small muted">{review.location.address ? <><bdi>{review.location.address}</bdi>, </> : ''}{tx(review.city)}, {review.governorateName}</div></dd>
              <dt>{tx('Experience')}</dt><dd>{review.experience}{' '}{tx('years')}</dd>
              <dt>{tx('Fee')}</dt><dd>{currency(review.fee)}</dd>
              <dt>{tx('Languages')}</dt><dd>{review.languageNames.join(', ')}</dd>
              <dt>{tx('Submitted')}</dt><dd>{formatDate(review.verification.submittedAt.slice(0, 10))}</dd>
              {review.verification.note && <><dt>{tx('Doctor’s note')}</dt><dd>{review.verification.note}</dd></>}
            </dl>
            {review.education.length > 0 && <div><div className="small strong" style={{ marginBottom: 6 }}>{tx('Education')}</div>{review.education.map((e, i) => <div key={i} className="small">{tx(e.degree)} — <span className="muted">{e.institution}{e.year ? `, ${e.year}` : ''}</span></div>)}</div>}
            {review.bio && <div><div className="small strong" style={{ marginBottom: 6 }}>{tx('Biography')}</div><p className="small muted">{tx(review.bio)}</p></div>}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={action?.kind === 'approve'} onClose={() => setAction(null)} tone="primary" title={tx('Approve {0}?', {
        0: action?.doctor?.name
      })} confirmLabel={tx('Approve and publish')}
        description={tx(
          'The doctor becomes visible in search and can receive bookings and issue prescriptions.'
        )} onConfirm={() => decide('approved')} />
      <ConfirmDialog open={action?.kind === 'reject'} onClose={() => setAction(null)} title={tx('Reject {0}?', {
        0: action?.doctor?.name
      })} confirmLabel={tx('Reject application')} minReason={10}
        description={tx('The doctor sees this reason and can correct their details and re-submit.')} withReason reasonLabel={tx('Reason shown to the doctor')}
        reasonPlaceholder={tx('e.g. The license number doesn’t match the Order of Physicians registry.')} onConfirm={(reason) => decide('rejected', reason)} />
    </div>
  );
}
