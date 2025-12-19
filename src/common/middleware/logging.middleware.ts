import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    const requestIdHeader = req.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader || randomUUID();

    res.setHeader('X-Request-ID', requestId);

    // 🔥 Capture response body
    let responseBody: any;
    const originalSend = res.send;

    res.send = function (body: any): Response {
      responseBody = body;
      return originalSend.call(this, body) as Response;
    };

    // 📥 Log request
    this.logger.info(`Incoming Request: ${method} ${originalUrl}`, {
      context: 'HTTP',
      requestId,
      ip,
      userAgent,
      body: req.body,
      headers: req.headers,
    });

    // 📤 Log response after finished
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - startTime;

      this.logger.info(
        `Outgoing Response: ${method} ${originalUrl} ${statusCode} - ${responseTime}ms`,
        {
          context: 'HTTP',
          requestId,
          statusCode,
          contentLength,
          responseTime,
          response: JSON.parse(responseBody),
        },
      );
    });

    next();
  }
}
