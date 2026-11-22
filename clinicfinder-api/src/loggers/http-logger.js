// http-logger.js – one log line per request: id, method, url, status, duration
import pinoHttp from 'pino-http';
import { logger } from './logger.js';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
