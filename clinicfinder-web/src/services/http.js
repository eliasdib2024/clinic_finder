// Fetch wrapper for the real REST backend (clinicfinder-api).
// • Sends the sign-in token as "Authorization: Bearer <token>".
// • Turns the API's error format (RFC 9457 problem details) into an ApiError the forms already understand:
//     { detail, errors: [{ field, message }] }  →  ApiError(message, status, { field: message })
import { ApiError } from './db';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_TOKEN_KEY = 'clinicfinder_api_token';

export const isApiConfigured = () => Boolean(BASE);

// ---- sign-in token: localStorage when "keep me signed in", otherwise sessionStorage (cleared with the tab)
export function getApiToken() {
  try { return localStorage.getItem(API_TOKEN_KEY) || sessionStorage.getItem(API_TOKEN_KEY); } catch { return null; }
}
export function setApiToken(token, remember = true) {
  try {
    localStorage.removeItem(API_TOKEN_KEY);
    sessionStorage.removeItem(API_TOKEN_KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(API_TOKEN_KEY, token);
  } catch { /* storage unavailable */ }
}

/**
 * fieldMap renames API field names to the form's field names, e.g. { cityId: 'city' },
 * so each message appears under the right input.
 */
async function call(method, path, body, { signal, fieldMap = {} } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getApiToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const fields = Array.isArray(data?.errors) && data.errors.length
      ? Object.fromEntries(data.errors.map((e) => [fieldMap[e.field] ?? e.field, e.message]))
      : undefined;
    throw new ApiError(data?.detail || data?.message || res.statusText || 'Request failed', res.status, fields);
  }
  return data;
}

export const http = {
  get: (p, o) => call('GET', p, undefined, o),
  post: (p, b, o) => call('POST', p, b, o),
  put: (p, b, o) => call('PUT', p, b, o),
  patch: (p, b, o) => call('PATCH', p, b, o),
  delete: (p, o) => call('DELETE', p, undefined, o),
};
