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
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '', 10) || 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@cricketspirit.com',
  },
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE ?? '', 10) || 1048576, // 1MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'jpg',
      'jpeg',
      'png',
      'webp',
    ],
    dir: process.env.UPLOAD_DIR || './uploads',
  },
  invitations: {
    teamExpiryDays: parseInt(process.env.TEAM_INVITATION_EXPIRY_DAYS ?? '', 10) || 2,
    tournamentExpiryDays:
      parseInt(process.env.TOURNAMENT_INVITATION_EXPIRY_DAYS ?? '', 10) || 7,
    matchExpiryDays:
      parseInt(process.env.MATCH_INVITATION_EXPIRY_DAYS ?? '', 10) || 3,
    autoAccept: process.env.AUTO_ACCEPT_INVITATIONS === 'true',
  },
  match: {
    minOvers: parseInt(process.env.MATCH_MIN_OVERS ?? '', 10) || 2,
    maxOvers: parseInt(process.env.MATCH_MAX_OVERS ?? '', 10) || 50,
  },
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
});
