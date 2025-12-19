import {
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Catch,
  Logger,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

type HttpExceptionBody = string | Record<string, unknown>;

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp ? exception.getStatus() : 500;
    const rawBody = isHttp
      ? exception.getResponse()
      : { message: 'Internal Server Error' };
    const body: HttpExceptionBody =
      typeof rawBody === 'string'
        ? rawBody
        : (this.ensureRecord(rawBody) ?? { message: 'Internal Server Error' });

    const message = this.extractMessage(body);

    if (statusCode >= 500) {
      this.logger.error(
        `Http Status: ${statusCode} Error Message: ${message}`,
        {
          stack: exception instanceof Error ? exception.stack : undefined,
          context: AllExceptionsFilter.name,
        },
      );
    } else {
      this.logger.warn(`Http Status: ${statusCode} Error Message: ${message}`, {
        context: AllExceptionsFilter.name,
      });
    }

    return res.status(statusCode).json({
      success: false,
      message,
      data: {},
    });
  }

  private extractMessage(body: HttpExceptionBody): string {
    if (typeof body === 'string') {
      return body;
    }

    if ('message' in body) {
      const { message } = body;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return message.join(', ');
      }
    }

    return 'Internal Server Error';
  }

  private ensureRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return undefined;
  }
}
