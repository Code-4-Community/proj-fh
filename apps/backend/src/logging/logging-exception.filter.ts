import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { TypeORMError } from 'typeorm';


export type Layer =
  | 'pipe'
  | 'auth'
  | 'controller'
  | 'service'
  | 'repo'
  | 'unknown';


/** checked against each stack frame, top to bottom, first match wins. */
const FRAME_RULES: [RegExp, Layer][] = [
  [/Pipe\b/, 'pipe'],
  [/Guard\b|JwtStrategy|passport/i, 'auth'],
  [/Controller\b/, 'controller'],
  [/Service\b/, 'service'],
];

export function detectLayer(error: unknown): Layer {
  if (error instanceof TypeORMError) return 'repo';
  if (!(error instanceof Error) || !error.stack) return 'unknown';

  const frames = error.stack.split('\n').slice(1);
  for (const frame of frames) {
    for (const [pattern, layer] of FRAME_RULES) {
      if (pattern.test(frame)) return layer;
    }
  }
  return 'unknown';
}

type LoggableRequest = {
  method?: string;
  originalUrl?: string;
  url?: string;
  log?: {
    warn: (obj: object, msg?: string) => void;
    error: (obj: object, msg?: string) => void;
  };
};

@Catch()
export class LoggingExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    try {
      const req = host.switchToHttp().getRequest<LoggableRequest>();
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const err = exception instanceof Error ? exception : undefined;

      const entry = {
        layer: detectLayer(exception),
        method: req.method,
        path: (req.originalUrl ?? req.url ?? '').split('?')[0],
        statusCode: status,
        errorName: err?.name,
        errorMessage: err?.message,
        stack: status >= 500 ? err?.stack : undefined,
      };

      if (status >= 500) req.log?.error(entry, 'request failed');
      else req.log?.warn(entry, 'request rejected');
    } catch {
      // Logging must never break the response.
    }

    super.catch(exception, host);
  }
}