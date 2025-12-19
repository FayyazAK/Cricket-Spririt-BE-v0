import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private pool: Pool;
  constructor(config: ConfigService) {
    const pool = new Pool({
      connectionString: config.get('database.connectionString'),
      max: config.get('DB_POOL_MAX', 10),
      idleTimeoutMillis: config.get('database.dbIdleTimeout'),
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });

    this.pool = pool;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
