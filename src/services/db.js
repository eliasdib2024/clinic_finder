import { tx } from '../lib/i18n';
// Mock data store backed by localStorage (key: clinicfinder_db_v1).
// Simulates network latency and returns failures through ApiError so the UI
// exercises the same loading / error paths it will use with the real API.
import { buildSeed } from './seed';

export const DB_KEY = 'clinicfinder_db_v1';
export const TOKEN_KEY = 'clinicfinder_token';

export class ApiError extends Error {
  constructor(message, status = 400, fields = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const envLatency = Number(import.meta.env?.VITE_MOCK_LATENCY);
const config = { latency: Number.isFinite(envLatency) ? envLatency : 280 };
export const configureMock = (opts) => Object.assign(config, opts);

let cache = null;
const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

export function getDb() {
  if (cache) return cache;
  const raw = storage()?.getItem(DB_KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw);
      if (cache?.version === 3) return cache; // older shapes are re-seeded (v3: Rx diagnosis & follow-up, patient location)
    } catch { /* fall through to reseed */ }
  }
  cache = buildSeed();
  persist();
  return cache;
}

export function persist() {
  try { storage()?.setItem(DB_KEY, JSON.stringify(cache)); } catch { /* quota exceeded — keep in memory */ }
}

export function resetDb() {
  cache = buildSeed();
  persist();
  return cache;
}

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run a handler against the store as if it were a network request.
 * Mutations are persisted; results are deep-cloned so callers can't mutate the store.
 */
export async function request(handler, { latency } = {}) {
  const ms = latency ?? config.latency;
  if (ms > 0) await sleep(ms * (0.7 + Math.random() * 0.6));
  const db = getDb();
  const snapshot = JSON.stringify(db);
  try {
    const result = handler(db);
    persist();
    return clone(result);
  } catch (err) {
    cache = JSON.parse(snapshot); // roll back partial writes
    if (err instanceof ApiError) throw err;
    console.error(err);
    throw new ApiError(tx('Something went wrong. Please try again.'), 500);
  }
}

// ---- session helpers (stand-in for a bearer token checked by the server) ----
export const getToken = () => storage()?.getItem(TOKEN_KEY) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null);

export function setToken(token, remember) {
  storage()?.removeItem(TOKEN_KEY);
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  if (remember) storage()?.setItem(TOKEN_KEY, token);
  else if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(TOKEN_KEY, token);
  else storage()?.setItem(TOKEN_KEY, token);
}

export function currentUser(db) {
  const token = getToken();
  const session = token && db.sessions[token];
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.status !== 'active') return null;
  return user;
}

/** Throw 401/403 unless the caller is signed in with one of `roles`. */
export function requireUser(db, roles) {
  const user = currentUser(db);
  if (!user) throw new ApiError(tx('Your session has expired. Please sign in again.'), 401);
  if (roles && !roles.includes(user.role)) throw new ApiError(tx('You do not have permission to do that.'), 403);
  return user;
}

export { hashPassword } from '../lib/hash';

export const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Notifications and activity are stored in English with their variables and translated when displayed.
export function notify(db, userId, { title, body, vars, link, kind = 'info' }) {
  db.notifications.unshift({ id: newId('ntf'), userId, title, body, vars: vars || null, link, kind, read: false, createdAt: new Date().toISOString() });
  if (db.notifications.length > 400) db.notifications.length = 400;
}

export function logActivity(db, text, kind = 'info', vars = null) {
  db.activity.unshift({ id: newId('act'), text, vars, kind, at: new Date().toISOString() });
  if (db.activity.length > 200) db.activity.length = 200;
}
