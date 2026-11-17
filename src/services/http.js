// Fetch wrapper for the real REST backend (Bearer token). Not used by the mock services.
// Usage when the backend exists:
//   import { http } from './http';
//   export const login = (body) => http.post('/auth/login', body);
import { ApiError, getToken } from './db';

const BASE = import.meta.env.VITE_API_URL || '';

async function call(method, path, body, { signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal });
  } catch {
    throw new ApiError('Network error — check your connection.', 0);
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || res.statusText || 'Request failed', res.status, data?.errors);
  return data;
}

export const http = {
  get: (p, o) => call('GET', p, undefined, o),
  post: (p, b, o) => call('POST', p, b, o),
  put: (p, b, o) => call('PUT', p, b, o),
  patch: (p, b, o) => call('PATCH', p, b, o),
  delete: (p, o) => call('DELETE', p, undefined, o),
};

export const isApiConfigured = () => Boolean(BASE);
