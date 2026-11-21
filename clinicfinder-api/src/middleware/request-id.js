import { randomUUID } from 'node:crypto';

// Every request gets an id (or keeps the one the caller sent). It appears in logs and error bodies,
// so a user's "requestId" in a bug report points straight to the matching log line.
export function requestId(req, res, next) {
  req.id = req.get('X-Request-Id') ?? randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
