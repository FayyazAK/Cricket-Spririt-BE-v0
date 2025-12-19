import { Controller, Get, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AppService } from './app.service';
import { Serialize } from './common/interceptors/response.interceptor';

@Controller()
@Serialize()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get()
  getHello(): object {
    this.logger.info('GET / - getHello called', {
      context: AppController.name,
    });
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): object {
    this.logger.info('GET /health - health check', {
      context: AppController.name,
    });
    return {
      message: 'OK',
    };
  }

  @Get('demo/sample-user')
  getSampleUser(): object {
    this.logger.info('GET /demo/sample-user - returning sample user', {
      context: AppController.name,
    });
    return this.appService.getSampleUser();
  }
}
