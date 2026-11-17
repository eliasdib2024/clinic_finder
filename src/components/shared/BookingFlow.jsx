import { tx } from '../../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Video, ArrowLeft, CalendarCheck, CalendarPlus } from 'lucide-react';
import { Modal, Button, Field, Textarea, PulseLine, Avatar, Badge } from '../ui';
import { SlotPicker } from './SlotPicker';
import { createAppointment } from '../../services/appointmentService';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime, dateTime } from '../../lib/dates';
import { currency } from '../../lib/format';

const STEPS = ['Date & time', 'Visit details', 'Review', 'Done'];

export function ConfirmCheck() {
  return (
    <div className="confirm-anim" aria-hidden>
      <svg viewBox="0 0 100 100">
        <motion.circle cx="50" cy="50" r="44" fill="var(--emerald-50)" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} style={{ originX: '50px', originY: '50px' }} />
        <motion.circle cx="50" cy="50" r="44" fill="none" stroke="var(--emerald)" strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} />
        <motion.path d="M31 51 l13 13 l26 -28" fill="none" stroke="var(--teal-600)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.45, ease: 'easeOut' }} />
      </svg>
    </div>
  );
}

function icsFor(appt, doctor) {
  const start = dateTime(appt.date, appt.time);
  const end = new Date(start.getTime() + (appt.duration || 30) * 60000);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ClinicFinder//EN', 'BEGIN:VEVENT', `UID:${appt.id}@clinicfinder.lb`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:Appointment with ${doctor.name}`, `LOCATION:${appt.type === 'video' ? 'Video consultation' : `${doctor.location.name}, ${doctor.location.address}, ${tx(doctor.city)}`}`, `DESCRIPTION:${appt.reason}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
}

export function BookingFlow({ doctor, open, onClose, initialSlot, onBooked }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState(initialSlot || null);
  const [type, setType] = useState('in-person');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Reset only when the dialog opens — later changes to the parent's slot must not restart the flow.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) { setStep(initialSlot?.time ? 1 : 0); setSlot(initialSlot || null); setType('in-person'); setReason(''); setErr(''); setBooked(null); }
    wasOpen.current = open;
  }, [open, initialSlot]);

  const next = () => {
    if (step === 0 && !slot?.time) { setErr('Choose a time to continue.'); return; }
    if (step === 1 && reason.trim().length < 3) { setErr('Please describe the reason for your visit.'); return; }
    setErr(''); setStep((s) => s + 1);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const a = await createAppointment({ doctorId: doctor.id, date: slot.date, time: slot.time, type, reason });
      setBooked(a); setStep(3);
      onBooked?.(a);
    } catch (e) {
      if (e.status === 409 && /taken|available/.test(e.message)) { setRefreshKey((k) => k + 1); setSlot({ date: slot.date, time: null }); setStep(0); }
      toast.error(tx('Booking not completed'), { body: e.message });
    } finally { setBusy(false); }
  };

  const close = () => { if (!busy) onClose(); };

  const footer = step === 3 ? (
    <>
      <a className="btn btn-secondary" href={booked ? icsFor(booked, doctor) : '#'} download="clinicfinder-appointment.ics"><CalendarPlus size={17} aria-hidden />{tx('Add to calendar')}</a>
      <Button onClick={() => { onClose(); navigate('/patient/appointments'); }} icon={CalendarCheck}>{tx('View my appointments')}</Button>
    </>
  ) : (
    <>
      {step > 0 && <Button variant="ghost" icon={ArrowLeft} onClick={() => { setErr(''); setStep((s) => s - 1); }} disabled={busy} style={{ marginInlineEnd: 'auto' }}>{tx('Back')}</Button>}
      <Button variant="secondary" onClick={close} disabled={busy}>{tx('Cancel')}</Button>
      {step < 2 ? <Button onClick={next}>{tx('Continue')}</Button> : <Button onClick={confirm} loading={busy}>{tx('Confirm booking')}</Button>}
    </>
  );

  return (
    <Modal open={open} onClose={close} size="lg" title={step === 3 ? (booked?.status === 'confirmed' ? tx('You’re booked') : tx('Request sent')) : tx('Book {0}', {
      0: doctor.name
    })}
      description={step < 3 ? `${tx(doctor.specialty)} · ${doctor.location.name}, ${tx(doctor.city)}` : undefined} footer={footer} footerBordered>
      <div className="book-progress" aria-label={tx('Step {0} of 4: {1}', {
        0: step + 1,
        1: STEPS[step]
      })}>
        <PulseLine width={700} height={34} progress={(step + 1) / 4} />
        <div className="book-progress-labels">{STEPS.map((s, i) => <span key={s} className={i <= step ? 'on' : ''}>{tx(s)}</span>)}</div>
      </div>
      <div key={step} className="enter-x" style={{ paddingTop: 12 }}>
          {step === 0 && (
            <div className="stack">
              <SlotPicker doctorId={doctor.id} value={slot} onChange={(v) => { if (stepRef.current === 0) { setSlot(v); setErr(''); } }} refreshKey={refreshKey} />
              {err && <p className="field-error" role="alert">{err}</p>}
            </div>
          )}
          {step === 1 && (
            <div className="stack" style={{ '--gap': '18px' }}>
              <div>
                <div className="field-label" style={{ marginBottom: 8 }} id="vtype">{tx('Type of visit')}</div>
                <div className="type-cards" role="radiogroup" aria-labelledby="vtype">
                  <button type="button" role="radio" aria-checked={type === 'in-person'} className="type-card" onClick={() => setType('in-person')}>
                    <Building2 aria-hidden /><strong>{tx('In person')}</strong><span><bdi>{doctor.location.name}</bdi>, {tx(doctor.city)}</span>
                  </button>
                  <button type="button" role="radio" aria-checked={type === 'video'} className="type-card" disabled={!doctor.videoConsult} onClick={() => setType('video')}>
                    <Video aria-hidden /><strong>{tx('Video consultation')}</strong><span>{doctor.videoConsult ? tx('A secure link is shared before the visit') : tx('Not offered by this doctor')}</span>
                  </button>
                </div>
              </div>
              <Field label={tx('Reason for visit')} required error={err} hint={tx('Shared only with the doctor. A sentence is enough.')}>
                <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} placeholder={tx('e.g. Chest tightness when climbing stairs for two weeks')} maxLength={500} rows={4} data-autofocus />
              </Field>
            </div>
          )}
          {step === 2 && slot?.time && (
            <div className="stack" style={{ '--gap': '16px' }}>
              <div className="row"><Avatar name={doctor.name} size={48} square /><div><div className="strong">{doctor.name}</div><div className="small muted">{tx(doctor.specialty)}</div></div></div>
              <dl className="review-list">
                <div><dt>{tx('Date')}</dt><dd>{formatDate(slot.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
                <div><dt>{tx('Time')}</dt><dd>{formatTime(slot.time)} · {doctor.slotLength}{' '}{tx('min')}</dd></div>
                <div><dt>{tx('Visit')}</dt><dd>{type === 'video' ? tx('Video consultation') : tx('In person')}</dd></div>
                {type === 'in-person' && <div><dt>{tx('Where')}</dt><dd><bdi>{doctor.location.name}</bdi><br /><span className="muted" style={{ fontWeight: 400 }}><bdi>{doctor.location.address}</bdi>, {tx(doctor.city)}</span></dd></div>}
                <div><dt>{tx('Reason')}</dt><dd style={{ fontWeight: 400, maxWidth: 360 }}>{reason}</dd></div>
                <div><dt>{tx('Consultation fee')}</dt><dd>{currency(doctor.fee)} <span className="muted" style={{ fontWeight: 400 }}>{tx('paid at the clinic')}</span></dd></div>
              </dl>
              <div className={`banner ${doctor.autoConfirm ? 'success' : 'info'}`}>
                <CalendarCheck aria-hidden />
                <div>{doctor.autoConfirm ? <><strong>{tx('Instant confirmation')}</strong>{tx('This doctor confirms bookings automatically.')}</> : <><strong>{tx('The doctor confirms your request')}</strong>{tx(
                  'You’ll get a notification as soon as it’s accepted. The slot is held for you meanwhile.'
                )}</>}</div>
              </div>
            </div>
          )}
          {step === 3 && booked && (
            <div className="stack" style={{ '--gap': '16px' }}>
              <ConfirmCheck />
              <p style={{ textAlign: 'center' }} className="muted">{booked.status === 'confirmed' ? tx('Your appointment is confirmed.') : tx('Your request is with the doctor. We’ll notify you when it’s confirmed.')}</p>
              <div className="ticket">
                <div className="ticket-top"><strong>{doctor.name}</strong><Badge tone={booked.status === 'confirmed' ? 'teal' : 'amber'} dot>{booked.status === 'confirmed' ? tx('Confirmed') : tx('Pending')}</Badge></div>
                <div className="ticket-body">
                  <div><span>{tx('Date')}</span><strong>{formatDate(booked.date)}</strong></div>
                  <div><span>{tx('Time')}</span><strong>{formatTime(booked.time)}</strong></div>
                  <div><span>{tx('Visit')}</span><strong>{booked.type === 'video' ? tx('Video') : tx('In person')}</strong></div>
                  <div><span>{tx('Booking reference')}</span><strong className="tnum">{booked.id.slice(-8).toUpperCase()}</strong></div>
                </div>
              </div>
            </div>
          )}
      </div>
    </Modal>
  );
}
