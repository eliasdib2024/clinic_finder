import { tx } from '../../lib/i18n';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Languages, Star, CalendarClock, Video, ShieldCheck } from 'lucide-react';
import { Avatar, Badge } from '../ui';
import { currency } from '../../lib/format';
import { relativeDay, formatTime } from '../../lib/dates';

export function NextSlot({ next }) {
  if (!next) return <span className="next-slot none"><CalendarClock aria-hidden />{tx('No slots in the next 3 weeks')}</span>;
  return <span className="next-slot"><CalendarClock aria-hidden />{tx('Next:')}{' '}{tx('{0}, {1}', { 0: relativeDay(next.date), 1: formatTime(next.time) })}</span>;
}

export const DoctorCard = forwardRef(function DoctorCard({ doctor, to, myInsurance }, ref) {
  const accepts = myInsurance && doctor.insurances.includes(myInsurance);
  return (
    <article ref={ref} className="panel doc-card enter-up">
      <div className="doc-top">
        <Avatar name={doctor.name} size={56} square verified />
        <div className="grow">
          <h3><Link to={to}>{doctor.name}</Link></h3>
          <div className="small muted" style={{ marginTop: 2 }}>{tx(doctor.specialty)} · {doctor.experience}{' '}{tx('yrs experience')}</div>
          <div className="row" style={{ marginTop: 8, '--gap': '8px' }}>
            <span className="rating"><Star aria-hidden />{doctor.rating.toFixed(1)}<span className="muted" style={{ fontWeight: 400 }}>({doctor.reviewsCount})</span></span>
            {doctor.videoConsult && <Badge tone="blue" icon={Video}>{tx('Video')}</Badge>}
          </div>
        </div>
      </div>
      <div className="doc-meta">
        <span><MapPin aria-hidden /><bdi>{doctor.location.name}</bdi>, {tx(doctor.city)}</span>
        <span><Languages aria-hidden />{doctor.languageNames.join(', ')}</span>
        {accepts && <span style={{ color: 'var(--teal-700)', fontWeight: 600 }}><ShieldCheck aria-hidden style={{ color: 'var(--teal-600)' }} />{tx('Accepts your insurance')}</span>}
      </div>
      <div className="doc-foot">
        <div>
          <div className="strong tnum">{currency(doctor.fee)}</div>
          <NextSlot next={doctor.nextAvailable} />
        </div>
        <Link to={to} className="btn btn-soft btn-sm" aria-label={tx('View profile and book {0}', {
          0: doctor.name
        })}>{tx('Book')}</Link>
      </div>
    </article>
  );
});
