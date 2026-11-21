// logger.js – one pino instance for the whole app
import pino from 'pino';
import { config } from '../config/env.js';

export const logger = pino({
  level: config.logLevel,
  // Never write secrets to the logs, even by accident
  redact: { paths: ['req.headers.authorization', '*.password', '*.passwordHash', '*.token'], censor: '[hidden]' },
  // Pretty, coloured lines in development; plain JSON lines in production (read by CloudWatch)
  transport: config.isProduction ? undefined : { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'SYS:HH:MM:ss' } },
});
