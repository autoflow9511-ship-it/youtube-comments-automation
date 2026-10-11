import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger, HttpException as NestHttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpException as AppHttpException } from '../exceptions/http-exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: unknown = null;

    if (exception instanceof AppHttpException) {
      status = exception.statusCode;
      message = exception.message;
      errorCode = exception.errorCode || 'HTTP_ERROR';
      details = exception.details;
    } else if (exception instanceof NestHttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      message = typeof payload === 'string'
        ? payload
        : (Array.isArray((payload as any).message)
          ? (payload as any).message.join(', ')
          : (payload as any).message || exception.message);
      errorCode = status === HttpStatus.NOT_FOUND ? 'NOT_FOUND' : 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      this.logger.error(`${request.method} ${request.url} - ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`${request.method} ${request.url} - Unknown error`);
    }

    if (status >= 500) this.logger.error(`${request.method} ${request.url} - ${status}`);
    else if (status >= 400) this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);

    response.status(status).json({
      statusCode: status,
      error: errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }
}
