import { HttpError } from '../errors/http-error.js';
import { logger } from '../loggers/logger.js';

const TITLES = {
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict',
  413: 'Content Too Large', 422: 'Unprocessable Content', 429: 'Too Many Requests', 500: 'Internal Server Error',
};

// Database errors that are the caller's fault get a proper 4xx instead of a 500
function fromPrisma(err) {
  if (err?.code === 'P2002') {
    const fields = [].concat(err.meta?.target ?? err.meta?.driverAdapterError?.cause?.constraint?.fields ?? []);
    return new HttpError(409, 'This value is already in use.', fields.map((f) => ({ field: String(f), message: 'Already in use.' })));
  }
  if (err?.code === 'P2025') return new HttpError(404, 'Record not found');
  if (err?.code === 'P2003') return new HttpError(409, 'This record is still referenced by other data.');
  return null;
}

// RFC 9457 "problem details": one JSON shape for every error, Content-Type application/problem+json
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err?.type === 'entity.parse.failed') err = new HttpError(400, 'The request body is not valid JSON.');
  if (err?.type === 'entity.too.large') err = new HttpError(413, 'The request body is too large.');
  const known = err instanceof HttpError ? err : fromPrisma(err);
  const status = known?.status ?? 500;

  if (status >= 500) logger.error({ err, requestId: req.id }, 'unhandled error');

  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: TITLES[status] ?? 'Error',
    status,
    detail: status >= 500 ? 'Something went wrong on our side.' : known.message,
    instance: req.originalUrl,
    ...(known?.errors && { errors: known.errors }),
    requestId: req.id,
  });
}
