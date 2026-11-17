import { tx } from '../../lib/i18n';
import { useId, useMemo, useRef, useState } from 'react';
import { MEDICATIONS } from '../../lib/constants';
import { useDismiss } from '../../hooks';

/** Autocomplete over common medications; free text is allowed. */
export function MedicationCombo({ value, onChange, invalid, id }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const listId = useId();
  useDismiss(ref, open, () => setOpen(false));
  const matches = useMemo(() => {
    const s = value.trim().toLowerCase();
    return (s ? MEDICATIONS.filter((m) => m.name.toLowerCase().includes(s)) : MEDICATIONS).slice(0, 8);
  }, [value]);
  const pick = (m) => { onChange(m.name); setOpen(false); };
  const onKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); pick(matches[active]); }
    if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div className="combo" ref={ref}>
      <input id={id} className="input" value={value} placeholder={tx('Start typing, e.g. Amox…')} autoComplete="off"
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-invalid={invalid ? 'true' : undefined}
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
      {open && matches.length > 0 && (
        <ul className="combo-list" id={listId} role="listbox">
          {matches.map((m, i) => (
            <li key={m.name} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); pick(m); }} onMouseEnter={() => setActive(i)}>
              <span>{m.name}</span><small>{m.group}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
