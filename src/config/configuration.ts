export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '', 10) || 3000,
  database: {
    connectionString: process.env.DATABASE_URL || '',
    dbPoolMax: process.env.DB_POOL_MAX || 10,
    dbIdleTimeout: process.env.DB_IDLE_TIMEOUT || 30000,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '', 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '', 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'hostell',
    defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL ?? '', 10) || 300,
  },
  throttler: {
    shortTtl: parseInt(process.env.THROTTLER_SHORT_TTL ?? '', 10) || 60,
    shortLimit: parseInt(process.env.THROTTLER_SHORT_LIMIT ?? '', 10) || 1,
    mediumTtl: parseInt(process.env.THROTTLER_MEDIUM_TTL ?? '', 10) || 600,
    mediumLimit: parseInt(process.env.THROTTLER_MEDIUM_LIMIT ?? '', 10) || 100,
    longTtl: parseInt(process.env.THROTTLER_LONG_TTL ?? '', 10) || 3600,
    longLimit: parseInt(process.env.THROTTLER_LONG_LIMIT ?? '', 10) || 1000,
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
