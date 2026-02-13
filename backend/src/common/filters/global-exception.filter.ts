import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: any;
  requestId: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || 'unknown';

    let statusCode: number;
    let message: string;
    let error: string;
    let details: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = HttpStatus[statusCode] || 'Error';
      } else {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error || HttpStatus[statusCode] || 'Error';

        // Validation errors from class-validator come as message array
        if (Array.isArray(resp.message)) {
          details = resp.message;
          message = 'Validation failed';
        }

        // Pass through custom fields (e.g. activeQuests, limit)
        if (resp.activeQuests !== undefined || resp.limit !== undefined) {
          details = { activeQuests: resp.activeQuests, limit: resp.limit };
        }
      }
    } else {
      // Unhandled error — never expose internals
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error(
        `Unhandled exception [${requestId}]: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      Sentry.captureException(exception, {
        tags: { requestId },
      });
    }

    const body: ErrorResponse = {
      statusCode,
      error,
      message,
      ...(details && { details }),
      requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}
