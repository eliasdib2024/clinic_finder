import { useCallback, useEffect, useRef, useState } from 'react';

/** Run an async function and track { data, error, loading }. `deps` re-run it. */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: immediate });
  const alive = useRef(true);
  const seq = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = useCallback(async (...args) => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn(...args);
      if (alive.current && id === seq.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (alive.current && id === seq.current) setState((s) => ({ ...s, error, loading: false }));
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { if (immediate) run().catch(() => {}); }, [run, immediate]);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: run, setData };
}

export function useDebounce(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function useDocumentTitle(title) {
  useEffect(() => { document.title = title ? `${title} · ClinicFinder` : 'ClinicFinder — Healthcare in Lebanon, simplified'; }, [title]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Trap focus inside `ref` while active, close on Escape, restore focus on unmount. */
export function useFocusTrap(ref, active, onEscape) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    const t = setTimeout(() => {
      if (!node) return;
      const auto = node.querySelector('[data-autofocus]') || node.querySelector(FOCUSABLE);
      (auto || node).focus({ preventScroll: true });
    }, 30);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); escRef.current?.(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      if (previous && previous.focus) previous.focus({ preventScroll: true });
    };
  }, [active, ref]);
}

/** Close a popover when clicking outside or pressing Escape. */
export function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref, open, onClose]);
}

/** Lock body scroll while an overlay is open. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/** Warn before leaving the page with unsaved changes (tab close / refresh). */
export function useBeforeUnload(when) {
  useEffect(() => {
    if (!when) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [when]);
}

export function useMediaQuery(q) {
  const [m, setM] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, [q]);
  return m;
}

/**
 * In-app navigation guard for unsaved changes (works with <BrowserRouter>).
 * Intercepts clicks on internal links while `when` is true and asks for confirmation.
 * Returns { pending, confirm, cancel } to drive a dialog.
 */
export function useUnsavedGuard(when, navigate) {
  const [pending, setPending] = useState(null);
  useBeforeUnload(when);
  useEffect(() => {
    if (!when) return undefined;
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = (url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname + url.search);
      if (to === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(to);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [when]);
  return {
    pending,
    confirm: () => { const to = pending; setPending(null); navigate(to); },
    cancel: () => setPending(null),
  };
}
