import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpException } from '../exceptions/http-exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx=host.switchToHttp(); const response=ctx.getResponse<Response>(); const request=ctx.getRequest<Request>();
    let status=HttpStatus.INTERNAL_SERVER_ERROR, message='Internal server error', errorCode='INTERNAL_ERROR', details:any=null;
    if(exception instanceof HttpException){status=exception.statusCode;message=exception.message;errorCode=exception.errorCode||'HTTP_ERROR';details=exception.details;}
    else if(exception instanceof Error){message=exception.message;this.logger.error(`${request.method} ${request.url} - ${exception.message}`,exception.stack);}
    else this.logger.error(`${request.method} ${request.url} - Unknown error`,exception);
    const body={statusCode:status,error:errorCode,message,details,timestamp:new Date().toISOString(),path:request.url,method:request.method};
    if(status>=500)this.logger.error(`${request.method} ${request.url} - ${status} - ${message}`);
    else if(status>=400)this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);
    response.status(status).json(body);
  }
}