import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { updateSettings } from '../services/userService';
import { useI18n } from './I18nContext';

const AuthCtx = createContext(null);

export const homeFor = (role) => ({ patient: '/patient', doctor: '/doctor', admin: '/admin' }[role] || '/login');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const { lang, setLang } = useI18n();
  const langRef = useRef(lang);
  langRef.current = lang;

  /**
   * Keep the account's language and the device's language in step.
   * The language chosen on this device wins (and is saved to the account); a device that has never
   * chosen one adopts the account's saved language.
   */
  const syncLanguage = useCallback(async (u) => {
    if (!u) return u;
    let chosen = null;
    try { chosen = localStorage.getItem('clinicfinder_lang'); } catch { /* storage unavailable */ }
    if (!chosen && u.settings?.language) { setLang(u.settings.language); return u; }
    const current = chosen || langRef.current;
    if (u.settings?.language !== current) {
      try { return await updateSettings({ language: current }); } catch { return u; }
    }
    return u;
  }, [setLang]);

  useEffect(() => {
    authService.me().then(syncLanguage).then((u) => setUser(u)).catch(() => setUser(null)).finally(() => setReady(true));
  }, [syncLanguage]);

  // Keep tabs in sync: signing out in one tab signs out the others.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'clinicfinder_token') authService.me().then(setUser).catch(() => setUser(null));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (creds) => {
    const { user: u } = await authService.login(creds);
    const synced = await syncLanguage(u);
    setUser(synced);
    return synced;
  }, [syncLanguage]);
  const signup = useCallback(async (data) => {
    const { user: u } = await authService.signup(data);
    const synced = await syncLanguage(u);
    setUser(synced);
    return synced;
  }, [syncLanguage]);
  const logout = useCallback(async () => { await authService.logout(); setUser(null); }, []);
  const refresh = useCallback(async () => { const u = await authService.me(); setUser(u); return u; }, []);

  const value = useMemo(() => ({ user, ready, login, signup, logout, refresh, setUser }), [user, ready, login, signup, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
