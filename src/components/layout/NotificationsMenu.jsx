import { tx } from '../../lib/i18n';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, CheckCircle2, Info, AlertTriangle, BellOff } from 'lucide-react';
import { Menu } from '../ui';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../services/userService';
import { timeAgo } from '../../lib/dates';

const KIND = {
  success: { icon: CheckCircle2, bg: 'var(--emerald-50)', fg: '#047857' },
  warning: { icon: AlertTriangle, bg: 'var(--amber-50)', fg: 'var(--amber)' },
  info: { icon: Info, bg: 'var(--sky-50)', fg: 'var(--sky)' },
};

export function NotificationsMenu() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const load = useCallback(() => listNotifications().then(setItems).catch(() => {}), []);
  useEffect(() => { load(); }, [load, pathname]);
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  const unread = items.filter((n) => !n.read).length;

  const open = async (n, close) => {
    close();
    if (!n.read) { await markNotificationRead(n.id).catch(() => {}); setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x))); }
    if (n.link) navigate(n.link);
  };
  const readAll = async () => { await markAllNotificationsRead(); setItems((l) => l.map((x) => ({ ...x, read: true }))); };

  return (
    <Menu className="notif-panel" trigger={({ toggle, props }) => (
      <button className="icon-btn" onClick={() => { toggle(); load(); }} {...props} aria-label={(unread ? tx('Notifications, {0} unread', { 0: unread }) : tx('Notifications'))}>
        <Bell />{unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
    )}>
      {(close) => (
        <>
          <div className="notif-head">
            <strong>{tx('Notifications')}</strong>
            {unread > 0 && <button className="link-btn small" onClick={readAll}>{tx('Mark all as read')}</button>}
          </div>
          <div className="notif-list">
            {items.length === 0 && <div className="empty" style={{ padding: 28 }}><BellOff className="muted" /><p>{tx('You’re all caught up.')}</p></div>}
            {items.map((n) => {
              const k = KIND[n.kind] || KIND.info;
              const Icon = k.icon;
              return (
                <button key={n.id} role="menuitem" className={`notif ${n.read ? '' : 'unread'}`} onClick={() => open(n, close)}>
                  <span className="n-ic" style={{ background: k.bg, color: k.fg }}><Icon aria-hidden /></span>
                  <span className="grow">
                    <strong>{tx(n.title)}</strong>
                    <p>{tx(n.body, n.vars)}</p>
                    <time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time>
                  </span>
                  {!n.read && <span className="unread-dot" aria-label={tx('Unread')} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Menu>
  );
}
