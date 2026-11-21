import { notFound } from '../errors/http-error.js';

// Any route that no router handled → 404 in the same problem-details format as every other error
export function notFoundHandler(req, res, next) {
  next(notFound(`Route ${req.method} ${req.originalUrl}`));
}
