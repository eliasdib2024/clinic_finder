import { tx } from '../../lib/i18n';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { useFocusTrap, useScrollLock } from '../../hooks';
import { cx } from '../../lib/format';
import { Button } from './Button';
import { Field, Textarea } from './Field';

function ModalInner({ onClose, title, description, size, children, footer, footerBordered, labelId, dismissable = true, className }) {
  const ref = useRef(null);
  useFocusTrap(ref, true, dismissable ? onClose : undefined);
  useScrollLock(true);
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1, pointerEvents: 'auto' }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: 0.18 }}
      onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onClose(); }}>
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1}
        className={cx('modal', size && `modal-${size}`, className)}
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
        {(title || dismissable) && (
          <div className="modal-head">
            <div>
              {title && <h2 id={labelId}>{title}</h2>}
              {description && <p>{description}</p>}
            </div>
            {dismissable && <button className="icon-btn" onClick={onClose} aria-label={tx('Close dialog')}><X /></button>}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className={cx('modal-foot', footerBordered && 'bordered')}>{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

let modalSeq = 0;
export function Modal({ open, ...props }) {
  const [labelId] = useState(() => `mdl-${++modalSeq}`);
  return createPortal(<AnimatePresence>{open && <ModalInner key="m" labelId={labelId} {...props} />}</AnimatePresence>, document.body);
}

function DrawerInner({ onClose, title, children, footer, side = 'right', width, labelId }) {
  const ref = useRef(null);
  useFocusTrap(ref, true, onClose);
  useScrollLock(true);
  const rtl = document.documentElement.dir === 'rtl';
  const fromRight = (side === 'right') !== rtl;
  return (
    <motion.div className="overlay drawer-overlay" style={side === 'left' ? { justifyContent: 'flex-start' } : undefined}
      // A closing overlay must never catch taps, even for the length of its fade-out.
      initial={{ opacity: 0 }} animate={{ opacity: 1, pointerEvents: 'auto' }} exit={{ opacity: 0, pointerEvents: 'none' }} transition={{ duration: 0.2 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1} className="drawer" style={width ? { width } : undefined}
        initial={{ x: fromRight ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: fromRight ? '100%' : '-100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
        <div className="drawer-head">
          <h2 id={labelId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={tx('Close panel')}><X /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </motion.aside>
    </motion.div>
  );
}

export function Drawer({ open, ...props }) {
  const [labelId] = useState(() => `drw-${++modalSeq}`);
  return createPortal(<AnimatePresence>{open && <DrawerInner key="d" labelId={labelId} {...props} />}</AnimatePresence>, document.body);
}

/**
 * Confirmation for destructive / important actions.
 * withReason: shows a required textarea; onConfirm(reason) may return a promise.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'danger', withReason, reasonLabel = 'Reason', reasonPlaceholder, minReason = 3, children }) {
  confirmLabel = tx(confirmLabel); reasonLabel = tx(reasonLabel);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const close = () => { if (!busy) { setReason(''); setErr(''); onClose(); } };
  const confirm = async () => {
    if (withReason && reason.trim().length < minReason) { setErr(tx('Please enter at least {n} characters.', { n: minReason })); return; }
    setBusy(true);
    try { await onConfirm(reason.trim()); setReason(''); setErr(''); onClose(); }
    catch (e) { setErr(tx(e?.fields?.reason || e?.fields?.note || e.message || 'Something went wrong.')); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={close} title={title}
      footer={<><Button variant="secondary" onClick={close} disabled={busy}>{tx('Keep as is')}</Button><Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={confirm} loading={busy}>{confirmLabel}</Button></>}>
      <div className="stack" style={{ '--gap': '14px' }}>
        {tone === 'danger' && !withReason && description && (
          <div className="banner danger"><AlertTriangle aria-hidden /><div>{description}</div></div>
        )}
        {(tone !== 'danger' || withReason) && description && <p className="muted">{description}</p>}
        {children}
        {withReason && (
          <Field label={reasonLabel} error={err} required>
            <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} placeholder={reasonPlaceholder} rows={3} data-autofocus maxLength={500} />
          </Field>
        )}
        {!withReason && err && <p className="field-error" role="alert">{err}</p>}
      </div>
    </Modal>
  );
}
