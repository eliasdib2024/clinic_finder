import { tx } from '../../lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, RotateCcw, SearchX, ShieldCheck } from 'lucide-react';
import { Button, Field, Input, Select, ChipSelect, Segmented, Switch, Drawer, SkeletonCards, EmptyState, ErrorState } from '../../components/ui';
import { DoctorCard } from '../../components/shared/DoctorCard';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { useAsync, useDebounce, useDocumentTitle } from '../../hooks';
import { searchDoctors, SORTS } from '../../services/doctorService';
import { GOVERNORATES, citiesOf, governorateName } from '../../lib/constants';
import { currency } from '../../lib/format';

const LIST_KEYS = ['languages', 'insurances'];
const ALL_KEYS = ['q', 'specialty', 'governorate', 'city', 'minFee', 'maxFee', 'languages', 'insurances', 'myInsurance', 'availability', 'minRating', 'minExperience', 'video', 'sort', 'page'];

function readFilters(params) {
  const f = {};
  for (const k of ALL_KEYS) {
    const v = params.get(k);
    if (v === null || v === '') continue;
    f[k] = LIST_KEYS.includes(k) ? v.split(',').filter(Boolean) : v;
  }
  return f;
}

function FilterPanel({ filters, update, canMyInsurance, myInsuranceName }) {
  const { specialties, languages, insurers } = useCatalog();
  const [minFee, setMinFee] = useState(filters.minFee || '');
  const [maxFee, setMaxFee] = useState(filters.maxFee || '');
  const dMin = useDebounce(minFee, 400);
  const dMax = useDebounce(maxFee, 400);
  useEffect(() => { setMinFee(filters.minFee || ''); setMaxFee(filters.maxFee || ''); }, [filters.minFee, filters.maxFee]);
  useEffect(() => {
    if ((dMin || '') !== (filters.minFee || '') || (dMax || '') !== (filters.maxFee || '')) update({ minFee: dMin, maxFee: dMax });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dMin, dMax]);

  return (
    <div>
      <div className="filter-group">
        <h4>{tx('Specialty')}</h4>
        <Select aria-label={tx('Specialty')} value={filters.specialty || ''} onChange={(e) => update({ specialty: e.target.value })} placeholder={tx('All specialties')} options={specialties} />
      </div>
      <div className="filter-group">
        <h4>{tx('Location')}</h4>
        <Select aria-label={tx('Governorate')} value={filters.governorate || ''} onChange={(e) => update({ governorate: e.target.value, city: '' })} placeholder={tx('All governorates')} options={GOVERNORATES} />
        <Select aria-label={tx('City')} value={filters.city || ''} onChange={(e) => update({ city: e.target.value })} placeholder={filters.governorate ? tx('All cities') : tx('Choose a governorate first')} disabled={!filters.governorate} options={citiesOf(filters.governorate)} />
      </div>
      <div className="filter-group">
        <h4>{tx('Availability')}</h4>
        <Segmented label={tx('Availability')} value={filters.availability || ''} onChange={(v) => update({ availability: v })}
          options={[{ value: '', label: 'Any' }, { value: 'today', label: 'Today' }, { value: 'week', label: '7 days' }]} />
        <Switch label={tx('Offers video visits')} checked={!!filters.video} onChange={(c) => update({ video: c ? '1' : '' })} />
      </div>
      <div className="filter-group">
        <h4>{tx('Consultation fee (USD)')}</h4>
        <div className="range-row">
          <Input aria-label={tx('Minimum fee')} type="number" min={0} inputMode="numeric" placeholder={tx('Min')} value={minFee} onChange={(e) => setMinFee(e.target.value)} />
          <span className="muted">–</span>
          <Input aria-label={tx('Maximum fee')} type="number" min={0} inputMode="numeric" placeholder={tx('Max')} value={maxFee} onChange={(e) => setMaxFee(e.target.value)} />
        </div>
        <div className="chips">
          {[[0, 40], [40, 70], [70, 1000]].map(([a, b]) => (
            <button key={a} type="button" className="chip" aria-pressed={String(filters.minFee || '') === String(a || '') && String(filters.maxFee || '') === String(b === 1000 ? '' : b)}
              onClick={() => update({ minFee: a ? String(a) : '', maxFee: b === 1000 ? '' : String(b) })}>{b === 1000 ? `${currency(a)}+` : a === 0 ? tx('Under {0}', {
              0: currency(b)
            }) : `${currency(a)}–${b}`}</button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <h4>{tx('Insurance')}</h4>
        {canMyInsurance && <Switch label={tx('Only my insurance')} description={myInsuranceName} checked={!!filters.myInsurance} onChange={(c) => update({ myInsurance: c ? '1' : '' })} />}
        <ChipSelect label={tx('Accepted insurance')} options={insurers} value={filters.insurances || []} onChange={(v) => update({ insurances: v })} />
      </div>
      <div className="filter-group">
        <h4>{tx('Languages spoken')}</h4>
        <ChipSelect label={tx('Languages')} options={languages} value={filters.languages || []} onChange={(v) => update({ languages: v })} />
      </div>
      <div className="filter-group">
        <h4>{tx('Rating & experience')}</h4>
        <Select aria-label={tx('Minimum rating')} value={filters.minRating || ''} onChange={(e) => update({ minRating: e.target.value })} placeholder={tx('Any rating')} options={[{ value: '4.5', label: '4.5 stars and up' }, { value: '4.7', label: '4.7 stars and up' }, { value: '4.9', label: '4.9 stars and up' }]} />
        <Select aria-label={tx('Minimum experience')} value={filters.minExperience || ''} onChange={(e) => update({ minExperience: e.target.value })} placeholder={tx('Any experience')} options={[{ value: '5', label: '5+ years' }, { value: '10', label: '10+ years' }, { value: '15', label: '15+ years' }, { value: '20', label: '20+ years' }]} />
      </div>
    </div>
  );
}

export default function FindDoctors({ base = 'patient' }) {
  useDocumentTitle(tx('Find a doctor'));
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const catalog = useCatalog();
  const filters = useMemo(() => readFilters(params), [params]);
  const [q, setQ] = useState(filters.q || '');
  const dq = useDebounce(q, 300);
  const [drawer, setDrawer] = useState(false);
  const myIns = user?.role === 'patient' ? user.patient?.insuranceId : null;

  const update = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      const val = Array.isArray(v) ? v.join(',') : v;
      if (val === '' || val === undefined || val === null) next.delete(k); else next.set(k, val);
    }
    if (resetPage && !('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => { if ((dq || '') !== (filters.q || '')) update({ q: dq.trim() }); /* eslint-disable-next-line */ }, [dq]);
  useEffect(() => { setQ(filters.q || ''); }, [filters.q]);

  const { data, loading, error, reload } = useAsync(() => searchDoctors({ ...filters, myInsurance: !!filters.myInsurance, video: !!filters.video, pageSize: 12 }), [params.toString()]);

  const chips = [];
  if (filters.specialty) chips.push(['specialty', catalog.specialtyName(filters.specialty)]);
  if (filters.governorate) chips.push(['governorate', governorateName(filters.governorate)]);
  if (filters.city) chips.push(['city', filters.city]);
  if (filters.availability) chips.push(['availability', filters.availability === 'today' ? 'Available today' : 'Within 7 days']);
  if (filters.minFee || filters.maxFee) chips.push([['minFee', 'maxFee'], `${filters.minFee ? currency(filters.minFee) : '$0'} – ${filters.maxFee ? currency(filters.maxFee) : 'any'}`]);
  (filters.languages || []).forEach((l) => chips.push([`languages:${l}`, catalog.languageName(l)]));
  (filters.insurances || []).forEach((i) => chips.push([`insurances:${i}`, catalog.insurerName(i)]));
  if (filters.myInsurance) chips.push(['myInsurance', 'My insurance']);
  if (filters.video) chips.push(['video', 'Video visits']);
  if (filters.minRating) chips.push(['minRating', `${filters.minRating}+ stars`]);
  if (filters.minExperience) chips.push(['minExperience', `${filters.minExperience}+ years`]);

  const removeChip = (key) => {
    if (Array.isArray(key)) return update(Object.fromEntries(key.map((k) => [k, ''])));
    if (key.includes(':')) { const [k, id] = key.split(':'); return update({ [k]: (filters[k] || []).filter((x) => x !== id) }); }
    return update({ [key]: '', ...(key === 'governorate' ? { city: '' } : {}) });
  };
  const resetAll = () => { setQ(''); setParams(filters.sort ? { sort: filters.sort } : {}, { replace: true }); };
  const profilePath = (id) => (base === 'public' ? `/doctors/${id}` : `/patient/doctors/${id}`);
  const page = Number(filters.page) || 1;
  const panelProps = { filters, update, canMyInsurance: !!myIns, myInsuranceName: myIns ? catalog.insurerName(myIns) : '' };

  const body = (
    <>
      <div className="results-bar">
        <div className="row grow" style={{ '--gap': '10px', minWidth: 240 }}>
          <div className="grow" style={{ maxWidth: 460 }}>
            <Input icon={Search} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('Search by name, specialty, clinic or city')} aria-label={tx('Search doctors')} />
          </div>
          <Button variant="secondary" icon={SlidersHorizontal} className="filters-trigger" onClick={() => setDrawer(true)}>{tx('Filters')}{chips.length ? ` (${chips.length})` : ''}</Button>
        </div>
        <div className="row" style={{ '--gap': '8px' }}>
          <label htmlFor="sort" className="small muted nowrap">{tx('Sort by')}</label>
          <Select id="sort" value={filters.sort || 'recommended'} onChange={(e) => update({ sort: e.target.value === 'recommended' ? '' : e.target.value })} options={SORTS} style={{ width: 200 }} />
        </div>
      </div>
      {chips.length > 0 && (
        <div className="active-filters" aria-label={tx('Active filters')}>
          {chips.map(([k, label]) => (
            <span key={String(k)} className="chip chip-x">{label}<button onClick={() => removeChip(k)} aria-label={tx('Remove filter {0}', {
              0: label
            })}><X /></button></span>
          ))}
          <button className="link-btn small" onClick={resetAll}><RotateCcw size={14} />{tx('Reset all')}</button>
        </div>
      )}
      <p className="small muted" style={{ marginBottom: 14 }} aria-live="polite">
        {loading && !data ? tx('Searching…') : data ? tx(data.total === 1 ? '1 doctor found' : '{0} doctors found', { 0: data.total }) : ''}
        {filters.myInsurance && myIns ? tx(' · accepting {0}', {
          0: catalog.insurerName(myIns)
        }) : ''}
      </p>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={6} /> : data.items.length === 0 ? (
        <div className="panel"><EmptyState icon={SearchX} title={tx('No doctors match these filters')} action={<Button variant="secondary" icon={RotateCcw} onClick={resetAll}>{tx('Reset filters')}</Button>}>{tx(
          'Try a nearby governorate, widen the fee range or remove a language filter.'
        )}</EmptyState></div>
      ) : (
        <>
          <div className="doc-grid" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
            {data.items.map((d) => <DoctorCard key={d.id} doctor={d} to={profilePath(d.id)} myInsurance={myIns} />)}
          </div>
          {data.pages > 1 && (
            <nav className="pager" aria-label={tx('Pagination')}>
              <button disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} aria-label={tx('Previous page')}>‹</button>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
                <button key={n} aria-current={n === page ? 'page' : undefined} onClick={() => { update({ page: n === 1 ? '' : String(n) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{n}</button>
              ))}
              <button disabled={page >= data.pages} onClick={() => update({ page: String(page + 1) })} aria-label={tx('Next page')}>›</button>
            </nav>
          )}
        </>
      )}
    </>
  );

  const content = (
    <div className="search-layout">
      <aside className="panel panel-flush filters desktop" aria-label={tx('Filters')}>
        <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--mist)' }}>
          <strong>{tx('Filters')}</strong>
          {chips.length > 0 && <button className="link-btn small" onClick={resetAll}>{tx('Reset')}</button>}
        </div>
        <FilterPanel {...panelProps} />
      </aside>
      <section aria-label={tx('Results')}>{body}</section>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={tx('Filters')} footer={<><Button variant="secondary" onClick={resetAll}>{tx('Reset')}</Button><Button onClick={() => setDrawer(false)}>{tx('Show {0} doctors', { 0: data?.total ?? '' })}</Button></>}>
        <div style={{ margin: '-20px -22px' }}><FilterPanel {...panelProps} /></div>
      </Drawer>
    </div>
  );

  if (base === 'public') {
    return (
      <div className="container public-search" style={{ padding: '24px 24px 40px' }}>
        <div className="page-head">
          <div>
            <h1 className="display" style={{ fontSize: 'clamp(36px, 4.4vw, 52px)', fontWeight: 400 }}>{tx('Find a doctor')}</h1>
            <p>{tx('Verified doctors across Lebanon. Sign in when you’re ready to book.')}</p>
          </div>
          {!user && <div className="row small muted" style={{ '--gap': '8px' }}><ShieldCheck size={16} aria-hidden />{tx('Every doctor’s license is checked by our team')}</div>}
        </div>
        {content}
      </div>
    );
  }
  return (
    <>
      <div className="page-head"><div><h1>{tx('Find a doctor')}</h1><p>{tx(
        'Filter by what matters to you. Your search is saved in the link, so you can share or bookmark it.'
      )}</p></div></div>
      {content}
    </>
  );
}
