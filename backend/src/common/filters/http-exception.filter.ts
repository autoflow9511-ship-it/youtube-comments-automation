import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpException } from '../exceptions/http-exception';
import { Prisma } from '@prisma/client';

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
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.statusCode;
      message = exception.message;
      errorCode = exception.errorCode || 'HTTP_ERROR';
      details = exception.details;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, message, errorCode } = this.handlePrismaError(exception));
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      errorCode = 'VALIDATION_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`${request.method} ${request.url} - ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`${request.method} ${request.url} - Unknown error`, exception);
    }

    const errorResponse = {
      statusCode: status,
      error: errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
  ): { status: number; message: string; errorCode: string } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          errorCode: 'DUPLICATE_ENTRY',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          errorCode: 'NOT_FOUND',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
          errorCode: 'FOREIGN_KEY_ERROR',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation',
          errorCode: 'INVALID_RELATION',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          errorCode: 'DATABASE_ERROR',
        };
    }
  }
}