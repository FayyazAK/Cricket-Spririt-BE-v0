import { NestFactory } from '@nestjs/core';
import {
  INestApplication,
  VersioningType,
  ValidationPipe,
} from '@nestjs/common';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from 'nest-winston';
import { Logger } from 'winston';
import helmet, { type HelmetOptions } from 'helmet';
import type { RequestHandler } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

type HelmetMiddlewareFactory = (
  options?: Readonly<HelmetOptions>,
) => RequestHandler;

const createHelmetMiddleware: HelmetMiddlewareFactory = helmet;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.use(createHelmetMiddleware());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties not in DTO
      forbidNonWhitelisted: false, // do not throw, just clean input
      transform: true, // transforms payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // converts strings → numbers automatically
      },
    }),
  );
  setupGracefulShutdown(app);
  const config = app.get(ConfigService);
  const port = Number(config.get('port')) || 3000;
  await app.listen(port);

  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  logger.info(`Server is running ${config.get('nodeEnv')}`, {
    context: 'Bootstrap',
  });
  logger.info(`Server is running on http://localhost:${port}`, {
    context: 'Bootstrap',
  });
  logger.info(`API endpoints: http://localhost:${port}/api/v1`, {
    context: 'Bootstrap',
  });
  logger.info(`Health check: http://localhost:${port}/api/v1/health`, {
    context: 'Bootstrap',
  });
}

function setupGracefulShutdown(app: INestApplication) {
  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  const exitHandler = async (code: number, reason?: unknown) => {
    if (reason) {
      logger.info('Graceful shutdown triggered:', {
        reason,
        context: 'Shutdown',
      });
    }

    try {
      await app.close();
    } catch (error) {
      logger.error('Error while shutting down Nest app:', {
        error,
        context: 'Shutdown',
      });
      code = 1;
    } finally {
      process.exit(code);
    }
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.once(signal, () => {
      void exitHandler(0, `Signal ${signal} received`);
    });
  });

  process.on('uncaughtException', (error) => {
    void exitHandler(1, error);
  });
  process.on('unhandledRejection', (reason) => {
    void exitHandler(1, reason);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap the Nest application:', error);
  process.exit(1);
});
