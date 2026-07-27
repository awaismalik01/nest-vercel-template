import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Global HTTP exception filter.
 *
 * Catches every thrown exception (NestJS HttpException subclasses and
 * unexpected non-HTTP errors) and normalises the response into a single
 * consistent shape:
 *
 * ```json
 * {
 *   "statusCode": 404,
 *   "error": "Not Found",
 *   "message": "Role 'ADMIN' not found",
 *   "path": "/auth/user",
 *   "timestamp": "2026-07-22T10:00:00.000Z"
 * }
 * ```
 *
 * Unexpected errors (5xx) are logged at `error` level with the full stack.
 * Client errors (4xx) are logged at `warn` level.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolveException(exception);
    const error = this.httpStatusText(statusCode);

    const body: ErrorResponse = {
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${statusCode} ${error}: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} → ${statusCode} ${error}: ${JSON.stringify(message)}`,
      );
    }

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();

      // NestJS validation pipe returns { message: string[], error: string, statusCode: number }
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const msg = (res as Record<string, unknown>).message;
        return {
          statusCode,
          message: Array.isArray(msg) ? (msg as string[]) : String(msg),
        };
      }

      return {
        statusCode,
        message: typeof res === 'string' ? res : exception.message,
      };
    }

    // Unexpected non-HTTP error — always 500
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private httpStatusText(statusCode: number): string {
    const map: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      501: 'Not Implemented',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return map[statusCode] ?? 'Error';
  }
}
