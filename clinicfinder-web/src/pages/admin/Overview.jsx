import { STATUS_LABEL } from '../../lib/lifecycle';
import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, ShieldCheck, CalendarDays, FileText, Building2, UserPlus, Ban, Library, CalendarCheck, Table2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { AnimatedNumber, Button, ErrorState, Segmented, Skeleton, SkeletonRows } from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks';
import { getStats } from '../../services/adminService';
import { useI18n } from '../../context/I18nContext';
import { formatDay, parseISODate, timeAgo, todayISO } from '../../lib/dates';

// Validated categorical palette (dataviz validator: all checks pass, light surface).
const C = { completed: '#009482', upcoming: '#5a7fe0', cancelled: '#c46a24' };
const SERIES = [['completed', 'Completed'], ['upcoming', 'Pending / confirmed'], ['cancelled', 'Cancelled / no-show']];
const ACT = { verification: [ShieldCheck, 'tone-amber'], signup: [UserPlus, 'tone-teal'], booking: [CalendarCheck, 'tone-blue'], user: [Ban, 'tone-rose'], clinic: [Building2, 'tone-blue'], catalog: [Library, 'tone-slate'], info: [CalendarDays, 'tone-slate'] };

function DayTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tip">
      <strong>{formatDay(label)}{label === todayISO() ? tx(' · today') : ''}</strong>
      {SERIES.map(([k, name]) => <div key={k} className="r"><i style={{ background: C[k] }} />{tx(name)}: {row[k]}</div>)}
      <div className="r" style={{ marginTop: 4, color: '#9fc4c0' }}>{tx('Total')}{' '}{row.total}</div>
    </div>
  );
}
// Value label drawn past the outer end of a horizontal bar, whichever way the axis runs.
const EndLabel = ({ x, y, width, height, value, rtl }) => {
  const outer = rtl ? Math.min(x, x + width) - 6 : Math.max(x, x + width) + 6;
  return <text x={outer} y={y + height / 2} dy={4} textAnchor={rtl ? 'end' : 'start'} fill="var(--ink-2)" fontSize={12}>{value}</text>;
};
const SimpleTip = ({ active, payload, unit }) => (active && payload?.length ? <div className="chart-tip"><strong>{payload[0].payload.name}</strong>{payload[0].value} {tx(unit)}</div> : null);

export default function AdminOverview() {
  useDocumentTitle(tx('Admin overview'));
  const { data, loading, error, reload } = useAsync(() => getStats(), []);
  const [view, setView] = useState('chart');
  // Charts draw in an LTR box (SVG text anchors break under dir=rtl) and are mirrored for Arabic.
  const rtl = useI18n().dir === 'rtl';
  const side = (a, b) => (rtl ? { left: b, right: a } : { left: a, right: b });
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const t = data?.totals;
  const kpis = [
    ['Patients', t?.patients, Users, 'tone-teal', '/admin/users?role=patient', t ? '{0} active' : ''],
    ['Verified doctors', t?.doctors, Stethoscope, 'tone-blue', '/admin/users?role=doctor', ''],
    ['Pending verifications', t?.pendingVerifications, ShieldCheck, 'tone-amber', '/admin/verifications', t?.pendingVerifications ? 'Needs review' : 'All clear'],
    ['Appointments', t?.appointments, CalendarDays, 'tone-emerald', null, t ? '{1} in the last 30 days' : ''],
  ];
  const tick = (d) => parseISODate(d).getDate();

  return (
    <div className="stack" style={{ '--gap': '24px' }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div><h1>{tx('Platform overview')}</h1><p>{tx('Activity across ClinicFinder, updated with every booking and review.')}</p></div>
        {t?.pendingVerifications > 0 && <Button to="/admin/verifications" icon={ShieldCheck}>{tx(t.pendingVerifications === 1 ? 'Review {0} application' : 'Review {0} applications', { 0: t.pendingVerifications })}</Button>}
      </div>

      <div className="grid grid-4" style={{ '--gap': '14px' }}>
        {kpis.map(([label, value, Icon, tone, to, sub]) => {
          const inner = (
            <>
              <div className="kpi-top"><span className={`kpi-ic ${tone}`}><Icon aria-hidden /></span>{sub && <span className="tiny muted">{tx(sub, { 0: t?.activePatients, 1: t?.appointments30 })}</span>}</div>
              <div><div className="kpi-value">{loading ? <Skeleton w={60} h={30} /> : <AnimatedNumber value={value} />}</div><div className="kpi-label">{tx(label)}</div></div>
            </>
          );
          return to ? <Link key={label} to={to} className="panel kpi" style={{ color: 'inherit' }}>{inner}</Link> : <div key={label} className="panel kpi">{inner}</div>;
        })}
      </div>

      <section className="panel" aria-labelledby="perday-h">
        <div className="panel-head">
          <div><h2 id="perday-h">{tx('Appointments per day')}</h2><div className="small muted" style={{ marginTop: 2 }}>{tx('Last 14 days and the coming week')}</div></div>
          <div className="row wrap" style={{ '--gap': '14px' }}>
            <div className="legend">{SERIES.map(([k, name]) => <span key={k}><i style={{ background: C[k] }} />{tx(name)}</span>)}</div>
            <Segmented label={tx('View')} value={view} onChange={setView} options={[{ value: 'chart', label: 'Chart', icon: BarChart3 }, { value: 'table', label: 'Table', icon: Table2 }]} />
          </div>
        </div>
        <div className="panel-body">
          {loading ? <Skeleton h={280} /> : view === 'chart' ? (
            <div className="chart-box" dir="ltr">
              <ResponsiveContainer>
                <BarChart data={data.perDay} margin={{ top: 22, bottom: 0, ...side(-20, 8) }} barCategoryGap="22%">
                  <CartesianGrid vertical={false} stroke="var(--mist)" />
                  <XAxis dataKey="date" tickFormatter={tick} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} interval={0} reversed={rtl} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} orientation={rtl ? 'right' : 'left'} />
                  <Tooltip content={<DayTip />} cursor={{ fill: 'rgba(15,118,110,.06)' }} />
                  <ReferenceLine x={todayISO()} stroke="var(--ink-4)" strokeDasharray="3 3" label={{ value: tx('Today'), position: 'top', fill: 'var(--ink-3)', fontSize: 11 }} />
                  <Bar dataKey="completed" stackId="a" fill={C.completed} stroke="#fff" strokeWidth={2} animationDuration={800} />
                  <Bar dataKey="upcoming" stackId="a" fill={C.upcoming} stroke="#fff" strokeWidth={2} animationDuration={800} />
                  <Bar dataKey="cancelled" stackId="a" fill={C.cancelled} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="table">
                <thead><tr><th>{tx('Date')}</th>{SERIES.map(([k, n]) => <th key={k}>{tx(n)}</th>)}<th>{tx('Total')}</th></tr></thead>
                <tbody>{data.perDay.map((r) => <tr key={r.date}><td>{formatDay(r.date)}</td><td>{r.completed}</td><td>{r.upcoming}</td><td>{r.cancelled}</td><td className="strong">{r.total}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-2" style={{ '--gap': '20px' }}>
        <section className="panel" aria-labelledby="dem-h">
          <div className="panel-head"><div><h2 id="dem-h">{tx('Demand by specialty')}</h2><div className="small muted" style={{ marginTop: 2 }}>{tx('All-time bookings')}</div></div></div>
          <div className="panel-body">
            {loading ? <Skeleton h={300} /> : (
              <div style={{ height: 320 }} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={data.demand.slice(0, 8)} layout="vertical" margin={{ top: 0, bottom: 0, ...side(10, 30) }}>
                    <CartesianGrid horizontal={false} stroke="var(--mist)" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} reversed={rtl} />
                    <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 12, textAnchor: rtl ? 'start' : 'end', dx: rtl ? 4 : -4 }} orientation={rtl ? 'right' : 'left'} />
                    <Tooltip content={<SimpleTip unit="bookings" />} cursor={{ fill: 'rgba(15,118,110,.06)' }} />
                    <Bar dataKey="bookings" fill={C.completed} radius={rtl ? [4, 0, 0, 4] : [0, 4, 4, 0]} barSize={16} animationDuration={900} label={(props) => <EndLabel {...props} rtl={rtl} />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
        <section className="panel" aria-labelledby="gov-h">
          <div className="panel-head"><div><h2 id="gov-h">{tx('Doctors by governorate')}</h2><div className="small muted" style={{ marginTop: 2 }}>{tx('Verified doctors only')}</div></div></div>
          <div className="panel-body">
            {loading ? <Skeleton h={300} /> : (
              <div style={{ height: 320 }} dir="ltr">
                <ResponsiveContainer>
                  <BarChart data={data.byGov} layout="vertical" margin={{ top: 0, bottom: 0, ...side(10, 30) }}>
                    <CartesianGrid horizontal={false} stroke="var(--mist)" />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-3)', fontSize: 12 }} reversed={rtl} />
                    <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 12, textAnchor: rtl ? 'start' : 'end', dx: rtl ? 4 : -4 }} orientation={rtl ? 'right' : 'left'} />
                    <Tooltip content={<SimpleTip unit="doctors" />} cursor={{ fill: 'rgba(15,118,110,.06)' }} />
                    <Bar dataKey="doctors" fill={C.upcoming} radius={rtl ? [4, 0, 0, 4] : [0, 4, 4, 0]} barSize={16} animationDuration={900} label={(props) => <EndLabel {...props} rtl={rtl} />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="split">
        <section className="panel" aria-labelledby="act-h">
          <div className="panel-head"><h2 id="act-h">{tx('Recent activity')}</h2></div>
          <div className="panel-body">
            {loading ? <SkeletonRows rows={5} /> : data.activity.length === 0 ? <p className="small muted">{tx('No activity yet.')}</p> : data.activity.map((a) => {
              const [Icon, tone] = ACT[a.kind] || ACT.info;
              return (
                <div key={a.id} className="activity-item">
                  <span className={`a-ic ${tone}`}><Icon aria-hidden /></span>
                  <div className="grow"><div className="small">{tx(a.text, a.vars)}</div><time className="tiny muted" dateTime={a.at}>{timeAgo(a.at)}</time></div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel" aria-labelledby="st-h">
          <div className="panel-head"><h2 id="st-h">{tx('Appointment status')}</h2></div>
          <div className="panel-body stack" style={{ '--gap': '12px' }}>
            {loading ? <SkeletonRows rows={4} /> : data.statusBreakdown.map((s) => {
              const max = Math.max(...data.statusBreakdown.map((x) => x.count), 1);
              return (
                <div key={s.status}>
                  <div className="row between small"><span>{tx(STATUS_LABEL[s.status])}</span><strong className="tnum">{s.count}</strong></div>
                  <div className="day-bar" style={{ marginTop: 6 }} aria-hidden><i style={{ insetInlineStart: 0, width: `${(s.count / max) * 100}%`, background: 'var(--teal-500)' }} /></div>
                </div>
              );
            })}
            {t && <div className="row wrap small muted" style={{ '--gap': '14px', marginTop: 8 }}><span className="row" style={{ '--gap': '6px' }}><FileText size={14} />{tx('{0} prescriptions', { 0: t.prescriptions })}</span><span className="row" style={{ '--gap': '6px' }}><Building2 size={14} />{tx('{0} clinics', { 0: t.clinics })}</span><span className="row" style={{ '--gap': '6px' }}><Ban size={14} />{tx('{0} suspended', { 0: t.suspended })}</span></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
