import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCatalog } from '../services/catalogService';
import { DEFAULT_INSURERS, DEFAULT_LANGUAGES, DEFAULT_SPECIALTIES } from '../lib/constants';
import { tx } from '../lib/i18n';

const CatalogCtx = createContext(null);

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({ specialties: DEFAULT_SPECIALTIES, insurers: DEFAULT_INSURERS, languages: DEFAULT_LANGUAGES, clinics: [] });
  const [loaded, setLoaded] = useState(false);
  const reload = useCallback(async () => { const c = await getCatalog(); setCatalog(c); setLoaded(true); return c; }, []);
  useEffect(() => { reload().catch(() => setLoaded(true)); }, [reload]);
  const value = useMemo(() => {
    const by = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
    return {
      ...catalog, loaded, reload,
      specialtyById: by(catalog.specialties), insurerById: by(catalog.insurers), languageById: by(catalog.languages),
      // Display names in the active language (stored values stay as ids).
      specialtyName: (id) => tx(catalog.specialties.find((s) => s.id === id)?.name || id),
      insurerName: (id) => tx(catalog.insurers.find((s) => s.id === id)?.name || id),
      languageName: (id) => tx(catalog.languages.find((s) => s.id === id)?.name || id),
    };
  }, [catalog, loaded, reload]);
  return <CatalogCtx.Provider value={value}>{children}</CatalogCtx.Provider>;
}

export const useCatalog = () => useContext(CatalogCtx);
