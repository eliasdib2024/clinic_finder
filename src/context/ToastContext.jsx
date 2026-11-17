import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X, Info, AlertTriangle } from 'lucide-react';
import { tx } from '../lib/i18n';

const ToastCtx = createContext(null);
const ICONS = { success: Check, error: X, info: Info, warning: AlertTriangle };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, title, opts = {}) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, type, title: tx(title), body: tx(opts.body), code: opts.code }]);
    setTimeout(() => dismiss(id), opts.duration ?? (type === 'error' ? 6000 : opts.code ? 15000 : 4200));
    return id;
  }, [dismiss]);
  const api = useMemo(() => ({
    success: (t, o) => push('success', t, o), error: (t, o) => push('error', t, o),
    info: (t, o) => push('info', t, o), warning: (t, o) => push('warning', t, o), dismiss,
  }), [push, dismiss]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" role="region" aria-label={tx('Notifications')} aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const Icon = ICONS[t.type];
              return (
                <motion.div key={t.id} layout className={`toast ${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}
                  initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
                  <span className="toast-icon"><Icon aria-hidden /></span>
                  <div className="grow">
                    <strong>{t.title}</strong>
                    {t.body && <div style={{ marginTop: 2 }}>{t.body}</div>}
                    {t.code && <div style={{ marginTop: 8 }}><code>{t.code}</code></div>}
                  </div>
                  <button className="toast-x" onClick={() => dismiss(t.id)} aria-label={tx('Dismiss')}><X size={16} /></button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
