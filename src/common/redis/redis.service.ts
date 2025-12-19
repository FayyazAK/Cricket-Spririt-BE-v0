import {
  Injectable,
  Inject,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientOptions } from 'redis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { RedisConfig } from './redis.types';

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client?: RedisClient;
  private ready = false;
  private readonly config: RedisConfig;
  private readonly memoryCache = new InMemoryCache();
  private readonly memoryQueue = new InMemoryQueue();

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.config = this.configService.get<RedisConfig>('redis') ?? {};
  }

  async onModuleInit() {
    if (!this.config.host) {
      this.logger.warn(
        'Redis host not configured. Falling back to in-memory storage only.',
        { context: RedisService.name },
      );
      return;
    }

    const options: RedisClientOptions = {
      socket: {
        host: this.config.host,
        port: this.config.port ?? 6379,
      },
      password: this.config.password,
      database: this.config.db ?? 0,
    };

    const client = createClient(options);

    client.on('ready', () => {
      this.ready = true;
      this.logger.info('Redis connection established.', {
        context: RedisService.name,
      });
    });

    client.on('error', (error: Error) => {
      this.ready = false;
      this.logger.error(`Redis error: ${error.message}`, {
        stack: error.stack,
        context: RedisService.name,
      });
    });

    client.on('end', () => {
      this.ready = false;
      this.logger.warn('Redis connection closed. Using in-memory fallback.', {
        context: RedisService.name,
      });
    });

    try {
      await client.connect();
      this.client = client;
    } catch (error) {
      this.logger.warn(
        `Unable to connect to Redis (${(error as Error).message}). Using in-memory fallback.`,
        { context: RedisService.name },
      );
      await client.quit().catch(() => undefined);
      this.client = undefined;
    }
  }

  async onModuleDestroy() {
    await this.shutdownClient();
    this.memoryCache.clear();
    this.memoryQueue.clear();
  }

  get isReady(): boolean {
    return Boolean(this.client && this.ready);
  }

  getClient(): RedisClient | undefined {
    return this.isReady ? this.client : undefined;
  }

  async get(key: string): Promise<string | null> {
    const namespacedKey = this.formatKey(key);
    if (this.isReady && this.client) {
      return this.client.get(namespacedKey);
    }
    return this.memoryCache.get(namespacedKey);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const namespacedKey = this.formatKey(key);
    const effectiveTtl = ttl ?? this.defaultTtl;

    if (this.isReady && this.client) {
      if (effectiveTtl && effectiveTtl > 0) {
        await this.client.setEx(namespacedKey, effectiveTtl, value);
      } else {
        await this.client.set(namespacedKey, value);
      }
      return;
    }

    this.memoryCache.set(namespacedKey, value, effectiveTtl);
  }

  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    const formatted = keys.map((entry) => this.formatKey(entry));

    const client = this.client;

    if (this.isReady && client) {
      await Promise.all(formatted.map((entry) => client.del(entry)));
      return;
    }

    formatted.forEach((entry) => this.memoryCache.delete(entry));
  }

  async enqueue(queue: string, payload: string): Promise<void> {
    const key = this.formatKey(queue);

    if (this.isReady && this.client) {
      await this.client.rPush(key, payload);
      return;
    }

    this.memoryQueue.enqueue(key, payload);
  }

  async dequeue(queue: string): Promise<string | null> {
    const key = this.formatKey(queue);

    if (this.isReady && this.client) {
      return this.client.lPop(key);
    }

    return this.memoryQueue.dequeue(key);
  }

  async getQueueSize(queue: string): Promise<number> {
    const key = this.formatKey(queue);

    if (this.isReady && this.client) {
      return this.client.lLen(key);
    }

    return this.memoryQueue.size(key);
  }

  private get defaultTtl(): number | undefined {
    return this.config.defaultTtl && this.config.defaultTtl > 0
      ? this.config.defaultTtl
      : undefined;
  }

  private formatKey(key: string): string {
    const prefix = this.config.keyPrefix?.trim();
    if (!prefix) {
      return key;
    }

    return key.startsWith(`${prefix}:`) ? key : `${prefix}:${key}`;
  }

  private async shutdownClient() {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch (error) {
      this.logger.error(
        `Error while shutting down Redis client: ${(error as Error).message}`,
        { context: RedisService.name },
      );
    } finally {
      this.client.removeAllListeners();
      this.client = undefined;
      this.ready = false;
    }
  }
}

type CacheEntry = {
  value: string;
  expiresAt?: number;
  timeout?: NodeJS.Timeout;
};

class InMemoryCache {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: string, ttl?: number) {
    this.delete(key);
    const entry: CacheEntry = { value };

    if (ttl && ttl > 0) {
      entry.expiresAt = Date.now() + ttl * 1000;
      entry.timeout = setTimeout(() => this.delete(key), ttl * 1000);
      entry.timeout.unref?.();
    }

    this.store.set(key, entry);
  }

  delete(key: string) {
    const entry = this.store.get(key);
    if (entry?.timeout) {
      clearTimeout(entry.timeout);
    }
    this.store.delete(key);
  }

  clear() {
    this.store.forEach((entry) => {
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
    });
    this.store.clear();
  }
}

class InMemoryQueue {
  private readonly queues = new Map<string, string[]>();

  enqueue(key: string, payload: string) {
    const queue = this.queues.get(key) ?? [];
    queue.push(payload);
    this.queues.set(key, queue);
  }

  dequeue(key: string): string | null {
    const queue = this.queues.get(key);
    if (!queue?.length) {
      return null;
    }

    const value = queue.shift() ?? null;
    if (!queue.length) {
      this.queues.delete(key);
    }

    return value;
  }

  size(key: string): number {
    return this.queues.get(key)?.length ?? 0;
  }

  clear() {
    this.queues.clear();
  }
}
