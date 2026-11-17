import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGS, tx, setCurrentLang } from '../lib/i18n';

const I18nCtx = createContext(null);
const KEY = 'clinicfinder_lang';

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(KEY) || 'en'; } catch { return 'en'; }
  });
  setCurrentLang(lang); // module-level state read by tx() and the date/number formatters
  useEffect(() => {
    const meta = LANGS.find((l) => l.id === lang) || LANGS[0];
    document.documentElement.lang = meta.id;
    document.documentElement.dir = meta.dir;
  }, [lang]);
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useCallback((key, vars) => tx(key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, dir: lang === 'ar' ? 'rtl' : 'ltr' }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

/** Remounts its children when the language changes so every string re-renders in the new language. */
export function LanguageScope({ children }) {
  const { lang } = useI18n();
  return <div key={lang} style={{ display: 'contents' }}>{children}</div>;
}
