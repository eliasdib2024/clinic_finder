import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Search, Ban, RotateCcw } from 'lucide-react';
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Select, SkeletonRows, Tabs, VerificationBadge } from '../../components/ui';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { listUsers, setUserStatus } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../lib/dates';
import { formatLebanesePhone } from '../../lib/validators';

const STATUS_TONE = { active: 'teal', suspended: 'rose', deactivated: 'slate' };

export default function AdminUsers() {
  useDocumentTitle(tx('Users'));
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || 'all';
  const status = params.get('status') || 'all';
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 250);
  const [action, setAction] = useState(null);
  const { data, loading, error, reload } = useAsync(() => listUsers({ role, status, q: dq }), [role, status, dq]);
  const setParam = (k, v) => { const n = new URLSearchParams(params); if (v && v !== 'all') n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };

  const apply = async (reason) => {
    const u = action.user;
    const next = action.kind === 'suspend' ? 'suspended' : 'active';
    const res = await setUserStatus(u.id, next, reason);
    toast.success(next === 'suspended' ? tx('{0} suspended', {
      0: u.name
    }) : tx('{0} reactivated', {
      0: u.name
    }), { body: next === 'suspended' ? tx(res.cancelled === 1 ? '1 upcoming booking was cancelled.' : '{0} upcoming bookings were cancelled.', { 0: res.cancelled }) : tx('They can sign in again.') });
    reload();
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div><h1>{tx('Users')}</h1><p>{tx('Patients and doctors registered on ClinicFinder.')}</p></div></div>
      <Tabs label={tx('Role')} value={role} onChange={(v) => setParam('role', v)} tabs={[{ id: 'all', label: 'Everyone' }, { id: 'patient', label: 'Patients' }, { id: 'doctor', label: 'Doctors' }]} />
      <div className="row wrap" style={{ '--gap': '10px' }}>
        <div className="grow" style={{ minWidth: 220, maxWidth: 420 }}><Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search name, email or phone')} aria-label={tx('Search users')} /></div>
        <Select aria-label={tx('Status')} value={status} onChange={(e) => setParam('status', e.target.value)} options={[{ value: 'all', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'deactivated', label: 'Deactivated' }]} style={{ width: 180 }} />
        {data && <span className="small muted">{tx(data.length === 1 ? '{0} user' : '{0} users', { 0: data.length })}</span>}
      </div>
      <section className="panel panel-flush">
        {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <div style={{ padding: 20 }}><SkeletonRows rows={6} /></div> : data.length === 0 ? (
          <EmptyState icon={Users} title={tx('No users match')}>{tx('Try another search or clear the filters.')}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>{tx('User')}</th><th>{tx('Role')}</th><th>{tx('Phone')}</th><th>{tx('Status')}</th><th>{tx('Bookings')}</th><th>{tx('Joined')}</th><th><span className="sr-only">{tx('Actions')}</span></th></tr></thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-main"><span className="row" style={{ '--gap': '10px' }}><Avatar name={u.name} size={34} /><span><span className="strong" style={{ display: 'block' }}>{u.name}</span><span className="tiny muted">{u.email}</span></span></span></td>
                    <td data-label="Role"><span className="row wrap" style={{ '--gap': '6px' }}><Badge tone={u.role === 'doctor' ? 'blue' : 'slate'}>{u.role === 'doctor' ? tx('Doctor') : tx('Patient')}</Badge>{u.verification && u.verification !== 'approved' && <VerificationBadge status={u.verification} />}</span>{u.specialty && <div className="tiny muted" style={{ marginTop: 2 }}>{tx(u.specialty)}</div>}</td>
                    <td data-label="Phone" className="nowrap">{formatLebanesePhone(u.phone)}</td>
                    <td data-label="Status"><Badge tone={STATUS_TONE[u.status]} dot>{tx(u.status[0].toUpperCase() + u.status.slice(1))}</Badge></td>
                    <td data-label="Bookings" className="tnum"><span>{u.appointments}{u.upcoming ? <span className="tiny muted"> · {tx('{0} upcoming', { 0: u.upcoming })}</span> : null}</span></td>
                    <td data-label="Joined" className="nowrap">{formatDate(u.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td data-label="">
                      {u.status === 'active'
                        ? <Button size="sm" variant="danger-soft" icon={Ban} onClick={() => setAction({ kind: 'suspend', user: u })} aria-label={tx('Suspend {0}', {
                        0: u.name
                      })}>{tx('Suspend')}</Button>
                        : <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setAction({ kind: 'reactivate', user: u })} aria-label={tx('Reactivate {0}', {
                        0: u.name
                      })}>{tx('Reactivate')}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDialog open={action?.kind === 'suspend'} onClose={() => setAction(null)} title={tx('Suspend {0}?', {
        0: action?.user?.name
      })} confirmLabel={tx('Suspend user')}
        description={action?.user ? tx('They’ll be signed out and can’t sign in. {0}', {
          0: action.user.upcoming ? `Their ${action.user.upcoming} upcoming booking${action.user.upcoming > 1 ? 's' : ''} will be cancelled.` : 'They have no upcoming bookings.'
        }) : ''}
        withReason reasonLabel={tx('Internal reason')} reasonPlaceholder={tx('e.g. Repeated no-shows, reported abuse…')} onConfirm={apply} />
      <ConfirmDialog open={action?.kind === 'reactivate'} onClose={() => setAction(null)} tone="primary" title={tx('Reactivate {0}?', {
        0: action?.user?.name
      })} confirmLabel={tx('Reactivate')}
        description={tx('They can sign in again. Cancelled bookings are not restored.')} onConfirm={() => apply('')} />
    </div>
  );
}
