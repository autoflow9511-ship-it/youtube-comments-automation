import { HttpStatus } from '@nestjs/common';

export class HttpException extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly errorCode?: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'HttpException';
  }

  static badRequest(message: string, details?: any, errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.BAD_REQUEST, errorCode, details);
  }

  static unauthorized(message: string = 'Unauthorized', errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.UNAUTHORIZED, errorCode);
  }

  static forbidden(message: string = 'Forbidden', errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.FORBIDDEN, errorCode);
  }

  static notFound(message: string = 'Resource not found', errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.NOT_FOUND, errorCode);
  }

  static conflict(message: string, errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.CONFLICT, errorCode);
  }

  static tooManyRequests(message: string = 'Too many requests', errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS, errorCode);
  }

  static internal(message: string = 'Internal server error', errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR, errorCode);
  }

  static serviceUnavailable(message: string = 'Service unavailable', errorCode?: string): HttpException {
    return new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE, errorCode);
  }
}

export class ValidationException extends HttpException {
  constructor(errors: any[]) {
    super('Validation failed', HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationException';
  }
}

export class AuthenticationException extends HttpException {
  constructor(message: string = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationException';
  }
}

export class AuthorizationException extends HttpException {
  constructor(message: string = 'Insufficient permissions') {
    super(message, HttpStatus.FORBIDDEN, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationException';
  }
}

export class NotFoundException extends HttpException {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`, HttpStatus.NOT_FOUND, 'NOT_FOUND');
    this.name = 'NotFoundException';
  }
}

export class ConflictException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
    this.name = 'ConflictException';
  }
}

export class ExternalServiceException extends HttpException {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, HttpStatus.BAD_GATEWAY, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceException';
  }
}