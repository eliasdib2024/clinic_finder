import { tx } from '../../lib/i18n';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, CalendarCheck2, FileCheck2, Check, ArrowRight, Stethoscope, Clock, Languages, Wallet, Users, BellRing } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useCatalog } from '../../context/CatalogContext';
import { useDocumentTitle } from '../../hooks';
import { HeroVisual } from '../../components/3d/HeroVisual';
import { Button, PulseLine, AnimatedNumber, SkeletonCards } from '../../components/ui';
import { DoctorCard } from '../../components/shared/DoctorCard';
import { SpecialtyIcon } from '../../components/shared/SpecialtyIcon';
import { GOVERNORATES } from '../../lib/constants';
import { getFeaturedDoctors, searchDoctors } from '../../services/doctorService';
import { todayISO, diffDays } from '../../lib/dates';

function HeroSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [gov, setGov] = useState('');
  const [when, setWhen] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (gov) p.set('governorate', gov);
    if (when) p.set('availability', when);
    navigate(`/find${p.toString() ? `?${p}` : ''}`);
  };
  return (
    <form className="searchbar" onSubmit={submit} role="search" aria-label={tx('Find a doctor')}>
      <div className="sb-field">
        <label htmlFor="hs-q">{t('hero.searchLabel')}</label>
        <input id="hs-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('hero.searchPh')} autoComplete="off" />
      </div>
      <div className="sb-field">
        <label htmlFor="hs-g">{t('hero.where')}</label>
        <select id="hs-g" value={gov} onChange={(e) => setGov(e.target.value)}>
          <option value="">{t('hero.anywhere')}</option>
          {GOVERNORATES.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}
        </select>
      </div>
      <div className="sb-field">
        <label htmlFor="hs-w">{t('hero.when')}</label>
        <select id="hs-w" value={when} onChange={(e) => setWhen(e.target.value)}>
          <option value="">{t('hero.anytime')}</option>
          <option value="today">{t('hero.today')}</option>
          <option value="week">{t('hero.week')}</option>
        </select>
      </div>
      <Button type="submit" icon={Search}>{t('hero.search')}</Button>
    </form>
  );
}

export default function Landing() {
  useDocumentTitle();
  const { t } = useI18n();
  const catalog = useCatalog();
  const [featured, setFeatured] = useState(null);
  const [counts, setCounts] = useState({ doctors: 0, bySpec: {}, rating: 0, today: 0 });

  useEffect(() => {
    getFeaturedDoctors(6).then(setFeatured).catch(() => setFeatured([]));
    searchDoctors({ pageSize: 500 }).then(({ items, total }) => {
      const bySpec = {};
      items.forEach((d) => { bySpec[d.specialtyId] = (bySpec[d.specialtyId] || 0) + 1; });
      const today = items.filter((d) => d.nextAvailable && diffDays(d.nextAvailable.date, todayISO()) < 7).length;
      setCounts({ doctors: total, bySpec, rating: items.reduce((s, d) => s + d.rating, 0) / (items.length || 1), today });
    }).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="enter-up slow">
            <h1 className="display">{t('hero.title')}</h1>
            <p className="hero-lede">{t('hero.lede')}</p>
            <HeroSearch />
            <div className="trust-row">
              <span><ShieldCheck aria-hidden />{tx('License-verified doctors')}</span>
              <span><CalendarCheck2 aria-hidden />{tx('Live availability')}</span>
              <span><FileCheck2 aria-hidden />{tx('Verifiable prescriptions')}</span>
            </div>
          </div>
          <div className="hero-visual enter-scale">
            <div className="hero-canvas"><HeroVisual /></div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="stat-band" aria-label={tx('ClinicFinder in numbers')}>
          <div><strong><AnimatedNumber value={counts.doctors} /></strong><span>{tx('verified doctors')}</span></div>
          <div><strong>9</strong><span>{tx('governorates, Akkar to the South')}</span></div>
          <div><strong><AnimatedNumber value={counts.today} /></strong><span>{tx('doctors with a free slot this week')}</span></div>
          <div><strong><AnimatedNumber value={counts.rating} format={(n) => n.toFixed(1)} /></strong><span>{tx('average patient rating')}</span></div>
        </div>
      </div>

      <section className="section" id="specialties" aria-labelledby="spec-h">
        <div className="container">
          <div className="section-head">
            <h2 id="spec-h" className="display">{tx('Start with what you need.')}</h2>
            <p>{tx(
              'Every specialty below links to doctors you can book this week. Counts update as doctors join or change their availability.'
            )}</p>
          </div>
          <div className="spec-grid">
            {catalog.specialties.map((s) => (
              <Link key={s.id} to={`/find?specialty=${s.id}`} className="spec-tile">
                <span className="ic"><SpecialtyIcon name={s.icon} /></span>
                <span>{tx(s.name)}</span>
                <small>{counts.bySpec[s.id] ? tx(counts.bySpec[s.id] === 1 ? '{0} doctor' : '{0} doctors', { 0: counts.bySpec[s.id] }) : tx('Coming soon')}</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how" style={{ background: 'var(--surface)', borderBlock: '1px solid var(--mist)' }} aria-labelledby="how-h">
        <div className="container">
          <div className="section-head">
            <h2 id="how-h" className="display">{tx('From search to prescription in four steps.')}</h2>
          </div>
          <PulseLine width={1200} height={60} className="journey-line" />
          <ol className="journey" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              ['Search', 'Filter by specialty, governorate and city, fee, language and the insurance you carry.'],
              ['Pick a real slot', 'See the doctor’s next 14 days and choose a morning or afternoon time that is actually free.'],
              ['Get confirmed', 'The doctor accepts your request — or it is confirmed instantly if they use auto-confirm.'],
              ['Keep your prescription', 'After the visit, your prescription arrives with a code any pharmacy can verify.'],
            ].map(([title, body], i) => (
              <li key={title} className="journey-step">
                <span className="num" aria-hidden>{i + 1}</span>
                <h3>{tx(title)}</h3>
                <p>{tx(body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="feat-h">
        <div className="container">
          <div className="row between wrap" style={{ marginBottom: 32, alignItems: 'flex-end' }}>
            <div className="section-head" style={{ margin: 0 }}>
              <h2 id="feat-h" className="display">{tx('Highly rated this month.')}</h2>
              <p>{tx('Patients’ top-rated doctors across Lebanon, with their next open slot.')}</p>
            </div>
            <Button to="/find" variant="secondary" iconEnd={ArrowRight}>{tx('See all doctors')}</Button>
          </div>
          {featured === null ? <SkeletonCards count={6} /> : (
            <div className="doc-grid">{featured.map((d) => <DoctorCard key={d.id} doctor={d} to={`/doctors/${d.id}`} />)}</div>
          )}
        </div>
      </section>

      <section className="section-tight" id="doctors" aria-label={tx('Benefits')}>
        <div className="container audience">
          <div className="audience-card patients">
            <h3 className="display">{tx('For patients')}</h3>
            <ul>
              <li><Search aria-hidden />{tx('Compare doctors by fee, language, insurance and rating — no phone calls.')}</li>
              <li><Clock aria-hidden />{tx(
                'Book, reschedule or cancel from your phone, with reminders before each visit.'
              )}</li>
              <li><Wallet aria-hidden />{tx(
                'Turn on “only my insurance” to see doctors who accept NSSF, COOP or your private insurer.'
              )}</li>
              <li><FileCheck2 aria-hidden />{tx('Every prescription in one place, printable or saved as PDF.')}</li>
            </ul>
            <Button to="/signup" iconEnd={ArrowRight}>{tx('Create a free account')}</Button>
          </div>
          <div className="audience-card doctors">
            <h3 className="display">{tx('For doctors')}</h3>
            <ul>
              <li><CalendarCheck2 aria-hidden />{tx(
                'Set weekly hours, breaks and days off. Patients only see slots you are really free.'
              )}</li>
              <li><BellRing aria-hidden />{tx(
                'Accept or decline requests in one tap, or let bookings confirm themselves.'
              )}</li>
              <li><Users aria-hidden />{tx('Patient records with allergies, blood type and visit history at hand.')}</li>
              <li><Stethoscope aria-hidden />{tx('Issue signed digital prescriptions with automatic allergy warnings.')}</li>
            </ul>
            <Button to="/signup?role=doctor" variant="secondary" iconEnd={ArrowRight} style={{ background: '#fff' }}>{tx('Join as a doctor')}</Button>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="display">{tx('Your next appointment is closer than you think.')}</h2>
              <p style={{ marginTop: 12, maxWidth: 520 }}>{tx(
                'Speaks Arabic, English, French or Armenian? Filter by language and book a doctor who speaks yours.'
              )}</p>
              <div className="row wrap" style={{ marginTop: 18, color: '#bfe6e1', fontSize: 14 }}>
                <span className="row" style={{ '--gap': '6px' }}><Languages size={16} aria-hidden />{tx('4 languages')}</span>
                <span className="row" style={{ '--gap': '6px' }}><Check size={16} aria-hidden />{tx('Free for patients')}</span>
              </div>
            </div>
            <Button to="/find" size="lg" variant="secondary" icon={Search}>{tx('Find a doctor')}</Button>
            <PulseLine width={1200} height={50} />
          </div>
        </div>
      </section>
    </>
  );
}
