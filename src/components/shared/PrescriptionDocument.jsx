import { tx } from '../../lib/i18n';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { BrandMark } from '../layout/Brand';
import { formatDate } from '../../lib/dates';
import { allergyConflicts } from '../../lib/allergies';
import { formatLebanesePhone } from '../../lib/validators';

// Decorative verification matrix derived from the code (not a scannable QR).
function CodeMatrix({ code }) {
  const bits = [...code].map((c) => c.charCodeAt(0)).reduce((acc, n, i) => acc.concat(Array.from({ length: 8 }, (_, b) => ((n * (i + 3)) >> b) & 1)), []);
  return <div className="rx-qr" aria-hidden>{Array.from({ length: 81 }, (_, i) => <i key={i} className={bits[i % bits.length] ? '' : 'o'} />)}</div>;
}

const age = (dob) => (dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : null);

export function PrescriptionDocument({ rx, preview }) {
  const p = rx.patient || {};
  const d = rx.doctor || {};
  return (
    <article className="rx-doc" aria-label={tx('Prescription {0}', {
      0: rx.code || 'preview'
    })}>
      <header className="rx-head">
        <div className="row start" style={{ '--gap': '14px' }}>
          <BrandMark size={40} />
          <div>
            <h2>{d.name}</h2>
            <div className="small muted">{tx(d.specialty)}{' '}{tx('· Order of Physicians no.')}{' '}{d.licenseNumber}</div>
            <div className="small muted"><bdi>{d.clinic}</bdi> — <bdi>{d.address}</bdi></div>
            {d.phone && <div className="small muted">{tx('Tel.')}{' '}{formatLebanesePhone(d.phone)}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div className="rx-symbol" aria-hidden>℞</div>
          <div className="small muted">{formatDate(rx.date, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </header>
      <section className="rx-parties">
        <div>
          <h4>{tx('Patient')}</h4>
          <div className="strong">{p.name}</div>
          <div className="small muted">{[p.dob && tx('{0} years', { 0: age(p.dob) }), p.gender === 'f' ? tx('Female') : p.gender === 'm' ? tx('Male') : null, p.bloodType && tx('Blood {0}', { 0: p.bloodType })].filter(Boolean).join(' · ')}</div>
          {p.insurance && <div className="small muted">{tx('Insurance:')}{' '}{p.insurance}</div>}
        </div>
        <div>
          <h4>{tx('Known allergies')}</h4>
          <div>{p.allergies?.length ? p.allergies.map((x) => tx(x)).join(', ') : tx('None reported')}</div>
        </div>
      </section>
      <section className="rx-dx">
        <h4>{tx('Diagnosis')}</h4>
        <div className="rx-dx-text">{rx.diagnosis ? <bdi>{rx.diagnosis}</bdi> : <span className="muted">{tx('Not recorded')}</span>}</div>
      </section>
      <table className="rx-meds">
        <thead><tr><th>{tx('Medication')}</th><th>{tx('Dose')}</th><th>{tx('Frequency')}</th><th>{tx('Duration')}</th></tr></thead>
        <tbody>
          {rx.medications.map((m, i) => {
            const conflicts = allergyConflicts(m.name, p.allergies);
            return (
              <tr key={i}>
                <td><strong>{m.name || '—'}</strong>{m.notes && <div className="small muted">{tx(m.notes)}</div>}{preview && conflicts.length > 0 && <div className="rx-alert"><AlertTriangle size={14} />{tx('Allergy:')}{' '}{conflicts.map((x) => tx(x)).join(', ')}</div>}</td>
                <td>{tx(m.dose) || '—'}</td><td>{tx(m.frequency) || '—'}</td><td>{tx(m.duration) || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rx.notes && <p className="small" style={{ marginBottom: 12 }}><strong>{tx('Instructions:')}{' '}</strong>{tx(rx.notes)}</p>}
      {rx.followUp?.date && (
        <section className="rx-followup" aria-label={tx('Follow-up')}>
          <CalendarClock aria-hidden />
          <div>
            <h4>{tx('Follow-up visit')}</h4>
            <div className="strong">{formatDate(rx.followUp.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            {rx.followUp.note && <div className="small">{rx.followUp.note}</div>}
          </div>
        </section>
      )}
      <footer className="rx-foot">
        <div className="row" style={{ '--gap': '14px' }}>
          <CodeMatrix code={rx.code || 'RX-PREV-00'} />
          <div>
            <div className="small muted">{tx('Verification code')}</div>
            <div className="rx-code">{rx.code || tx('Issued on signing')}</div>
            <div className="tiny muted">{tx('Verify at clinicfinder.lb/verify')}</div>
          </div>
        </div>
        <div className="rx-sign">
          <div className="sig">{preview ? ' ' : d.name?.replace(/^Dr\.\s*/, 'Dr. ')}</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>{preview ? tx('Signature applied when issued') : tx('Digitally signed')}</div>
        </div>
      </footer>
    </article>
  );
}
