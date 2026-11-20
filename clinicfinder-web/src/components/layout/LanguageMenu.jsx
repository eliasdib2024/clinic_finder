import { Globe, Check } from 'lucide-react';
import { Menu } from '../ui';
import { LANGS, tx } from '../../lib/i18n';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { updateSettings } from '../../services/userService';

export function LanguageMenu() {
  const { lang, setLang } = useI18n();
  const { user, setUser } = useAuth();
  const choose = async (id) => {
    setLang(id);
    if (user) { try { setUser(await updateSettings({ language: id })); } catch { /* keep local choice */ } }
  };
  const current = LANGS.find((l) => l.id === lang);
  return (
    <Menu trigger={({ toggle, props }) => (
      <button className="icon-btn" onClick={toggle} {...props} aria-label={tx('Language: {0}', {
        0: current?.label
      })} title={tx('Language')}><Globe /></button>
    )}>
      {(close) => LANGS.map((l) => (
        <button key={l.id} role="menuitemradio" aria-checked={lang === l.id} className="menu-item" onClick={() => { choose(l.id); close(); }}>
          <span className="grow" lang={l.id}>{l.label}</span>{lang === l.id && <Check />}
        </button>
      ))}
    </Menu>
  );
}
