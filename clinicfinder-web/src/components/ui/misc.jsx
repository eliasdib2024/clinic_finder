import { tx, getLocale } from '../../lib/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion, animate } from 'framer-motion';
import { Check, X, BadgeCheck } from 'lucide-react';
import { cx, initials, hueFor } from '../../lib/format';
import { STATUS_LABEL, STATUS_TONE } from '../../lib/lifecycle';
import { passwordStrength, PASSWORD_RULES } from '../../lib/validators';
import { useDismiss } from '../../hooks';

export const Badge = ({ tone = 'slate', dot, icon: Icon, children, className }) => (
  <span className={cx('badge', `tone-${tone}`, dot && 'badge-dot', className)}>{Icon && <Icon aria-hidden />}{children}</span>
);

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]} dot>{tx(STATUS_LABEL[status] || status)}</Badge>;

export const VERIFY_TONE = { approved: 'teal', pending: 'amber', rejected: 'rose' };
export const VerificationBadge = ({ status }) => (
  <Badge tone={VERIFY_TONE[status]} icon={status === 'approved' ? BadgeCheck : undefined} dot={status !== 'approved'}>
    {status === 'approved' ? tx('Verified') : status === 'pending' ? tx('Pending review') : tx('Rejected')}
  </Badge>
);

/** `hueKey` keeps the colour stable while `name` changes (e.g. a live preview while typing). */
export function Avatar({ name = '', src, size = 40, square, verified, className, hueKey }) {
  const h = hueFor(hueKey ?? name);
  return (
    <span className={cx('avatar', square && 'sq', className)} style={{ '--s': `${size}px`, background: src ? 'var(--surface-2)' : `linear-gradient(140deg, hsl(${h} 55% 52%), hsl(${h + 24} 60% 34%))` }} aria-hidden={!src}>
      {src ? <img src={src} alt={name} /> : initials(name)}
      {verified && <span className="verified-dot" title={tx('Verified doctor')}><BadgeCheck aria-label={tx('Verified')} /></span>}
    </span>
  );
}

export const Skeleton = ({ w = '100%', h = 16, r, style, className }) => (
  <span className={cx('skeleton', className)} style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} aria-hidden />
);

export function SkeletonCards({ count = 6, h = 220 }) {
  return (
    <div className="doc-grid" aria-busy="true" aria-label={tx('Loading')}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="panel doc-card" style={{ minHeight: h }}>
          <div className="row"><Skeleton w={56} h={56} r={18} /><div className="grow stack" style={{ '--gap': '8px' }}><Skeleton w="70%" /><Skeleton w="45%" h={12} /></div></div>
          <Skeleton h={12} /><Skeleton w="80%" h={12} /><Skeleton w="60%" h={12} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="stack" style={{ '--gap': '14px', padding: '8px 0' }} aria-busy="true" aria-label={tx('Loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="row"><Skeleton w={44} h={44} r={12} /><div className="grow stack" style={{ '--gap': '8px' }}><Skeleton w="55%" /><Skeleton w="35%" h={12} /></div></div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon aria-hidden /></div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty" role="alert">
      <div className="empty-icon" style={{ background: 'var(--rose-50)', color: 'var(--rose)' }}><X aria-hidden /></div>
      <h3>{tx('Couldn’t load this')}</h3>
      <p>{tx(error?.message || 'Something went wrong.')}</p>
      {onRetry && <button className="btn btn-secondary" onClick={() => onRetry()}>{tx('Try again')}</button>}
    </div>
  );
}

/** Animated underline tabs. tabs: [{ id, label, count, icon }] */
export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  const group = useId();
  const refs = useRef([]);
  const onKey = (e, i) => {
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = tabs.length - 1;
    if (n !== null) { e.preventDefault(); onChange(tabs[n].id); refs.current[n]?.focus(); }
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => {
        const Icon = t.icon;
        const sel = value === t.id;
        return (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" aria-selected={sel} tabIndex={sel ? 0 : -1} className="tab" onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}>
            {Icon && <Icon size={16} aria-hidden />}{tx(t.label)}
            {t.count !== undefined && <span className="count">{t.count}</span>}
            {sel && <motion.span layoutId={`ink-${group}`} className="tab-ink" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          </button>
        );
      })}
    </div>
  );
}

/** Pill segmented control. options: [{ value, label, icon }] */
export function Segmented({ options, value, onChange, label }) {
  const group = useId();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        const sel = value === o.value;
        return (
          <button key={o.value} type="button" aria-pressed={sel} onClick={() => onChange(o.value)}>
            {sel && <motion.span layoutId={`seg-${group}`} className="seg-bg" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            {Icon && <Icon size={15} aria-hidden />}{tx(o.label)}
          </button>
        );
      })}
    </div>
  );
}

/** Multi-select chips. options: [{ id, name }] */
export function ChipSelect({ options, value = [], onChange, label }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className="chip" aria-pressed={value.includes(o.id)} onClick={() => toggle(o.id)}>
          {value.includes(o.id) && <Check aria-hidden />}{tx(o.name)}
        </button>
      ))}
    </div>
  );
}

/** Six-digit code input with paste support and arrow-key navigation. */
export function CodeInput({ value, onChange, length = 6, invalid, autoFocus }) {
  const refs = useRef([]);
  const chars = value.padEnd(length, ' ').slice(0, length).split('');
  const set = (i, ch) => {
    const arr = value.padEnd(length, ' ').split('');
    arr[i] = ch;
    onChange(arr.join('').replace(/\s+$/, '').replace(/\s/g, ''));
  };
  const onInput = (i, e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) return;
    if (digits.length > 1) { const next = (value.slice(0, i) + digits).slice(0, length); onChange(next); refs.current[Math.min(next.length, length - 1)]?.focus(); return; }
    set(i, digits);
    refs.current[i + 1]?.focus();
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (chars[i].trim()) set(i, ' ');
      else if (i > 0) { set(i - 1, ' '); refs.current[i - 1]?.focus(); }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onPaste = (e) => {
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (d) { e.preventDefault(); onChange(d); refs.current[Math.min(d.length, length - 1)]?.focus(); }
  };
  return (
    <div className="code-inputs" onPaste={onPaste} role="group" aria-label={tx('6-digit verification code')}>
      {chars.map((c, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={length}
          value={c.trim()} onChange={(e) => onInput(i, e)} onKeyDown={(e) => onKey(i, e)} onFocus={(e) => e.target.select()}
          aria-label={tx('Digit {0}', {
            0: i + 1
          })} aria-invalid={invalid ? 'true' : undefined} autoFocus={autoFocus && i === 0} />
      ))}
    </div>
  );
}

const STRENGTH_COLORS = ['var(--rose)', 'var(--rose)', '#e0a43a', 'var(--teal-500)', 'var(--emerald)'];
export function PasswordStrength({ password }) {
  const { score, label, passed } = passwordStrength(password);
  if (!password) return null;
  return (
    <div className="strength" aria-live="polite">
      <div className="row between small"><span className="muted">{tx('Password strength')}</span><strong style={{ color: STRENGTH_COLORS[score] }}>{tx(label)}</strong></div>
      <div className="strength-bars">{[1, 2, 3, 4].map((n) => <span key={n} style={{ background: score >= n ? STRENGTH_COLORS[score] : undefined }} />)}</div>
      <ul className="strength-rules">
        {PASSWORD_RULES.map((r) => <li key={r.id} className={passed.includes(r.id) ? 'ok' : ''}>{passed.includes(r.id) ? <Check aria-hidden /> : <X aria-hidden />}{tx(r.label)}</li>)}
      </ul>
    </div>
  );
}

/** Counts up to `value` once mounted. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(getLocale()), duration = 0.9 }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) { setN(value); return undefined; }
    const c = animate(from.current, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setN });
    from.current = value;
    return () => c.stop();
  }, [value, reduce, duration]);
  return <span className="tnum">{format(n)}</span>;
}

/** Dropdown menu with keyboard dismissal. */
export function Menu({ trigger, children, align = 'end', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o), props: { 'aria-haspopup': 'menu', 'aria-expanded': open } })}
      {open && (
        <motion.div role="menu" className={cx('menu', className)} style={align === 'start' ? { insetInlineStart: 0, insetInlineEnd: 'auto' } : undefined}
          initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.16 }}
          onClick={(e) => { if (e.target.closest('[data-close]')) setOpen(false); }}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </motion.div>
      )}
    </div>
  );
}

/** The ECG trace — ClinicFinder's signature motif. progress (0–1) draws it as a progress bar instead of looping. */
export function PulseLine({ width = 600, height = 60, progress, className, strokeWidth = 2 }) {
  const reduce = useReducedMotion();
  const mid = height / 2;
  const seg = width / 5;
  const beat = (x) => `L${x} ${mid} L${x + seg * 0.12} ${mid - height * 0.12} L${x + seg * 0.2} ${mid} L${x + seg * 0.28} ${mid} L${x + seg * 0.34} ${mid + height * 0.18} L${x + seg * 0.42} ${height * 0.06} L${x + seg * 0.5} ${height * 0.94} L${x + seg * 0.58} ${mid} L${x + seg * 0.72} ${mid - height * 0.14} L${x + seg * 0.82} ${mid}`;
  const d = `M0 ${mid} ${[0, 1, 2, 3, 4].map((i) => beat(i * seg + seg * 0.1)).join(' ')} L${width} ${mid}`;
  const controlled = typeof progress === 'number';
  return (
    <svg className={cx('pulse-line', className)} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden>
      <path className="base" d={d} style={controlled ? undefined : { opacity: 0.6 }} />
      {controlled ? (
        <motion.path d={d} fill="none" stroke="var(--teal-500)" strokeWidth={strokeWidth + 0.5} strokeLinecap="round" strokeLinejoin="round"
          initial={false} animate={{ pathLength: Math.max(0.001, progress) }} transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }} />
      ) : (
        <path className="trace" d={d} pathLength="1" style={{ strokeWidth }} />
      )}
    </svg>
  );
}
