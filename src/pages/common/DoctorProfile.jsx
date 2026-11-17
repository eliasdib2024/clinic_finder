import { tx } from '../../lib/i18n';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Star, GraduationCap, Languages, ShieldCheck, ShieldX, ShieldQuestion, Building2, Video, CalendarCheck, Clock, LogIn, Share2 } from 'lucide-react';
import { Avatar, Badge, Button, VerificationBadge, Skeleton, ErrorState } from '../../components/ui';
import { SlotPicker } from '../../components/shared/SlotPicker';
import { BookingFlow } from '../../components/shared/BookingFlow';
import { NextSlot } from '../../components/shared/DoctorCard';
import { SpecialtyIcon } from '../../components/shared/SpecialtyIcon';
import { getDoctor } from '../../services/doctorService';
import { useAsync, useDocumentTitle } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useToast } from '../../context/ToastContext';
import { WEEKDAYS, CLINIC_TYPES } from '../../lib/constants';
import { weekdayKey, todayISO, formatTime } from '../../lib/dates';
import { currency } from '../../lib/format';
import { formatLebanesePhone } from '../../lib/validators';

function Hours({ schedule }) {
  const today = weekdayKey(todayISO());
  return (
    <table className="hours-table">
      <tbody>
        {WEEKDAYS.map(({ key, label }) => {
          const d = schedule[key];
          return (
            <tr key={key} className={key === today ? 'today' : ''}>
              <td>{tx(label)}{key === today ? ` (${tx('today')})` : ''}</td>
              <td>{d?.enabled ? <>{formatTime(d.start)} – {formatTime(d.end)}{d.breaks?.length ? <span className="tiny muted" style={{ display: 'block' }}>{tx('Break')}{' '}{d.breaks.map((b) => `${formatTime(b.start)}–${formatTime(b.end)}`).join(', ')}</span> : null}</> : <span className="muted">{tx('Closed')}</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function DoctorProfile({ base = 'patient' }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { insurerName } = useCatalog();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: d, loading, error, reload } = useAsync(() => getDoctor(id), [id]);
  const [slot, setSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useDocumentTitle(d?.name);

  const back = base === 'public' ? '/find' : '/patient/search';
  if (error) return <div className={base === 'public' ? 'container' : ''} style={{ padding: base === 'public' ? 40 : 0 }}><ErrorState error={error} onRetry={reload} /><div style={{ textAlign: 'center' }}><Link to={back}>{tx('Back to search')}</Link></div></div>;

  const canBook = user?.role === 'patient';
  const myIns = canBook ? user.patient?.insuranceId : null;
  const insState = !myIns ? 'unknown' : d?.insurances.includes(myIns) ? 'yes' : 'no';

  const startBooking = () => {
    if (!user) { navigate('/login', { state: { from: `/doctors/${id}` } }); return; }
    if (!canBook) { toast.info(tx('Booking is for patient accounts'), { body: tx('Sign in with a patient account to book.') }); return; }
    setBooking(true);
  };
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname.replace('/patient/doctors/', '/doctors/')}`;
    try { await navigator.clipboard.writeText(url); toast.success(tx('Profile link copied')); } catch { toast.info(tx('Copy this link'), { body: url }); }
  };

  const content = (
    <>
      <div className="row between" style={{ marginBottom: 16 }}>
        <Button to={back} variant="ghost" size="sm" icon={ArrowLeft}>{tx('Back to search')}</Button>
        <Button variant="ghost" size="sm" icon={Share2} onClick={share} disabled={!d}>{tx('Share')}</Button>
      </div>
      {loading || !d ? (
        <div className="split"><div className="panel panel-pad stack"><div className="row"><Skeleton w={96} h={96} r={28} /><div className="grow stack" style={{ '--gap': '10px' }}><Skeleton w="50%" h={24} /><Skeleton w="30%" /></div></div><Skeleton h={80} /><Skeleton h={120} /></div><div className="panel panel-pad"><Skeleton h={300} /></div></div>
      ) : (
        <div className="split">
          <div className="stack" style={{ '--gap': '20px' }}>
            <section className="panel profile-hero">
              <Avatar name={d.name} size={104} square verified={d.verification.status === 'approved'} />
              <div className="grow stack" style={{ '--gap': '14px' }}>
                <div>
                  <div className="row wrap" style={{ '--gap': '10px' }}>
                    <h1>{d.name}</h1>
                    <VerificationBadge status={d.verification.status} />
                  </div>
                  <div className="row wrap muted" style={{ marginTop: 6, '--gap': '14px' }}>
                    <span className="row" style={{ '--gap': '6px' }}><SpecialtyIcon name={d.specialtyIcon} size={16} />{tx(d.specialty)}</span>
                    <span className="row" style={{ '--gap': '6px' }}><MapPin size={16} aria-hidden />{tx(d.city)}, {d.governorateName}</span>
                    <span className="rating"><Star aria-hidden />{d.rating ? d.rating.toFixed(1) : tx('New')}<span className="muted" style={{ fontWeight: 400 }}>· {d.reviewsCount}{' '}{tx('reviews')}</span></span>
                  </div>
                </div>
                <div className="facts">
                  <div><strong>{d.experience}{' '}{tx('yrs')}</strong><span>{tx('Experience')}</span></div>
                  <div><strong>{currency(d.fee)}</strong><span>{tx('Consultation')}</span></div>
                  <div><strong>{d.slotLength}{' '}{tx('min')}</strong><span>{tx('Visit length')}</span></div>
                  <div><strong>{d.videoConsult ? tx('Yes') : tx('No')}</strong><span>{tx('Video visits')}</span></div>
                </div>
              </div>
            </section>

            {canBook && (
              <div className={`ins-check ${insState === 'yes' ? 'tone-teal' : insState === 'no' ? 'tone-amber' : 'tone-slate'}`} role="status">
                {insState === 'yes' ? <ShieldCheck aria-hidden /> : insState === 'no' ? <ShieldX aria-hidden /> : <ShieldQuestion aria-hidden />}
                <span>
                  {insState === 'yes' && <><strong>{tx('{0} accepted.', { 0: insurerName(myIns) })}</strong>{' '}{tx('Bring your insurance card to the visit.')}</>}
                  {insState === 'no' && <><strong>{tx('{0} isn’t listed by this doctor.', { 0: insurerName(myIns) })}</strong>{' '}{tx('You can still book and pay the fee directly.')}</>}
                  {insState === 'unknown' && <><Link to="/patient/settings?tab=health">{tx('Add your insurance in Settings')}</Link>{' '}{tx('to see if it’s accepted here.')}</>}
                </span>
              </div>
            )}

            <section className="panel panel-pad stack" aria-labelledby="about-h">
              <h2 id="about-h" style={{ fontSize: 17 }}>{tx('About')}</h2>
              <p style={{ color: 'var(--ink-2)', maxWidth: '70ch' }}>{d.bio ? tx(d.bio) : tx('This doctor hasn’t added a biography yet.')}</p>
              <div className="grid grid-2" style={{ '--gap': '20px', marginTop: 6 }}>
                <div className="stack" style={{ '--gap': '8px' }}>
                  <h3 className="small strong row" style={{ '--gap': '8px' }}><Languages size={16} className="muted" aria-hidden />{tx('Languages')}</h3>
                  <div className="chips">{d.languageNames.map((l) => <Badge key={l} tone="slate">{l}</Badge>)}</div>
                </div>
                <div className="stack" style={{ '--gap': '8px' }}>
                  <h3 className="small strong row" style={{ '--gap': '8px' }}><ShieldCheck size={16} className="muted" aria-hidden />{tx('Accepted insurance')}</h3>
                  <div className="chips">{d.insuranceNames.length ? d.insuranceNames.map((l) => <Badge key={l} tone={myIns && insurerName(myIns) === l ? 'teal' : 'slate'}>{l}</Badge>) : <span className="small muted">{tx('Self-pay only')}</span>}</div>
                </div>
              </div>
            </section>

            <section className="panel panel-pad stack" aria-labelledby="edu-h">
              <h2 id="edu-h" style={{ fontSize: 17 }}>{tx('Qualifications')}</h2>
              {d.education.length === 0 ? <p className="muted small">{tx('No qualifications listed yet.')}</p> : d.education.map((e, i) => (
                <div key={i} className="row start" style={{ '--gap': '14px' }}>
                  <span className="kpi-ic tone-teal" style={{ width: 36, height: 36 }}><GraduationCap size={18} aria-hidden /></span>
                  <div><div className="strong">{tx(e.degree)}</div><div className="small muted">{e.institution}{e.year ? ` · ${e.year}` : ''}</div></div>
                </div>
              ))}
              <div className="small muted">{tx('Lebanese Order of Physicians registration no.')}{' '}{d.licenseNumber}</div>
            </section>

            <section className="panel panel-pad" aria-labelledby="clinic-h">
              <div className="grid grid-2" style={{ '--gap': '28px' }}>
                <div className="stack" style={{ '--gap': '10px' }}>
                  <h2 id="clinic-h" style={{ fontSize: 17 }}>{tx('Clinic')}</h2>
                  <div className="row start" style={{ '--gap': '12px' }}>
                    <span className="kpi-ic tone-blue" style={{ width: 36, height: 36 }}><Building2 size={18} aria-hidden /></span>
                    <div>
                      <div className="strong"><bdi>{d.location.name}</bdi></div>
                      <div className="small muted">{tx(CLINIC_TYPES.find((t) => t.id === d.location.type)?.name)}</div>
                      <div className="small" style={{ marginTop: 6 }}><bdi>{d.location.address}</bdi>{d.location.address ? ', ' : ''}{tx(d.city)}, {d.governorateName}</div>
                      {d.location.phone && <a className="small row" style={{ '--gap': '6px', marginTop: 6 }} href={`tel:${d.location.phone}`}><Phone size={14} aria-hidden />{formatLebanesePhone(d.location.phone)}</a>}
                    </div>
                  </div>
                  <a className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} target="_blank" rel="noreferrer"
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${tx(d.city)}, Lebanon`)}`}><MapPin size={15} aria-hidden />{tx('Open map')}</a>
                </div>
                <div className="stack" style={{ '--gap': '10px' }}>
                  <h2 style={{ fontSize: 17 }} className="row" ><Clock size={17} className="muted" aria-hidden style={{ marginInlineEnd: 8 }} />{tx('Opening hours')}</h2>
                  <Hours schedule={d.schedule} />
                  {d.blockedDates?.length > 0 && <p className="tiny muted">{tx('Closed on')}{' '}{d.blockedDates.map((b) => b.date).join(', ')}.</p>}
                </div>
              </div>
            </section>
          </div>

          <aside className="sticky-book">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2>{tx('Book an appointment')}</h2>
                  <div className="small muted" style={{ marginTop: 4 }}><NextSlot next={d.nextAvailable} /></div>
                </div>
              </div>
              <div className="panel-body stack">
                {d.verification.status !== 'approved' ? (
                  <div className="banner warning"><ShieldQuestion aria-hidden /><div>{tx('This profile is awaiting verification and can’t take bookings yet.')}</div></div>
                ) : (
                  <>
                    <SlotPicker doctorId={d.id} value={slot} onChange={setSlot} refreshKey={refreshKey} />
                    <div className="row small muted wrap" style={{ '--gap': '14px' }}>
                      <span className="row" style={{ '--gap': '6px' }}><Building2 size={15} aria-hidden />{tx('In person')}</span>
                      {d.videoConsult && <span className="row" style={{ '--gap': '6px' }}><Video size={15} aria-hidden />{tx('Video')}</span>}
                      <span>{currency(d.fee)}</span>
                    </div>
                    <Button size="lg" block icon={user ? CalendarCheck : LogIn} onClick={startBooking} disabled={user && !canBook}>
                      {!user ? tx('Sign in to book') : slot?.time ? tx('Book {0}', {
                        0: formatTime(slot.time)
                      }) : tx('Book appointment')}
                    </Button>
                    {user && !canBook && <p className="tiny muted" style={{ textAlign: 'center' }}>{tx('Only patient accounts can book appointments.')}</p>}
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      {d && canBook && <BookingFlow doctor={d} open={booking} onClose={() => setBooking(false)} initialSlot={slot} onBooked={() => { setRefreshKey((k) => k + 1); setSlot(null); }} />}
    </>
  );

  return base === 'public' ? <div className="container public-profile" style={{ padding: '20px 24px 40px' }}>{content}</div> : content;
}
