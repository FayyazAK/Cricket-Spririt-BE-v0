# NestJS Template

Fast-start NestJS 11 template with opinionated defaults for APIs: versioned routing, consistent response envelopes, Redis-backed caching, distributed throttling, and batteries-included logging/testing.

## Highlights

- **Production-ready Nest 11 + TypeScript** with ESLint, Prettier, Jest (unit + e2e) and tsconfig-paths.
- **API conventions baked in**: `api/v1` prefix, URI versioning, Helmet, graceful shutdown hooks, and a global exception filter.
- **Response serialization**: `SerializeInterceptor` enforces `{ success, message, data }` envelopes and can trim payloads via DTOs or be skipped per route.
- **Resilient caching + rate limiting**: Redis-first CacheManager + `RedisService` helper with automatic in-memory fallback, plus multi-window throttling backed by Redis storage.
- **Config-first**: `ConfigModule` loads layered `.env` files, pipes values through `src/config/configuration.ts`, and exposes typed helpers to the rest of the app.
- **Logging that scales**: Winston + daily-rotate file transports, console-friendly formatting in dev, and env-controlled log levels.

## Project layout

```
.
├── src
│   ├── app/               # Sample controller/service + DTOs
│   ├── common/
│   │   ├── filters/       # Global AllExceptionsFilter
│   │   ├── interceptors/  # Serialize decorator/interceptor
│   │   ├── redis/         # Cache + queue service with fallback
│   │   └── throttler/     # Multi-window rate limiter config
│   ├── config/            # Centralized configuration factory
│   ├── utils/logger/      # Winston logger factory
│   └── main.ts            # App bootstrap (prefix, versioning, filters)
├── env.example            # Copy to .env.* and customize per environment
├── dist/                  # Build artifacts (generated)
├── test/                  # e2e tests + Jest config
└── ...
```

## Getting started

1. **Requirements**: Node.js 20+, npm 10+, and (optionally) Docker for Redis.
2. **Environment variables**:  
   `cp env.example .env` or create `.env.development`. Any of the following files will be picked up automatically (highest priority first):
   - `./src/config/env/.env.<NODE_ENV>`
   - `./src/config/env/.env.local`
   - `./.env.<NODE_ENV>`
   - `./.env`
3. **Install dependencies**: `npm install`
4. **Run in watch mode**: `npm run start:dev`
5. **Visit the sample endpoints**:
   - `GET http://localhost:3000/api/v1/` → Hello World envelope
   - `GET http://localhost:3000/api/v1/health`
   - `GET http://localhost:3000/api/v1/demo/sample-user`

> _Note_: Redis is optional. If the app cannot reach the configured Redis host it will log a warning and fall back to the in-memory cache and throttler.

## Environment variables

Use `env.example` as the source of truth. Copy it to `.env`, `.env.development`, or any file in `src/config/env/` and adjust values per environment. Only variables that power the current template are included; add new ones when you implement matching features (DB, auth, third-party integrations, etc.).

| Group | Variables | Notes |
| --- | --- | --- |
| Core | `NODE_ENV`, `PORT`, `LOG_LEVEL` | `NODE_ENV` drives config resolution & logging style. |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`, `REDIS_KEY_PREFIX`, `REDIS_DEFAULT_TTL` | Leave `REDIS_HOST` blank to force in-memory cache mode. |
| Rate limiting | `THROTTLER_*` | Controls the short/medium/long buckets (TTL in seconds + max requests). |

## npm scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start in the current `NODE_ENV` once. |
| `npm run start:dev` | Watch mode with live reload. |
| `npm run start:prod` | Run the compiled app (`dist/main.js`). |
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run lint` | ESLint across `src`, `apps`, `libs`, `test`. |
| `npm run format` | Prettier on `src` and `test`. |
| `npm run test` | Jest unit tests. |
| `npm run test:e2e` | e2e tests (Supertest + Jest). |
| `npm run test:cov` | Unit tests with coverage. |

## Architecture notes

- **Global response handling**  
  `SerializeInterceptor` (via the `@Serialize()` decorator or global usage) guarantees responses look like:
  ```json
  { "success": true, "message": "", "data": { ... } }
  ```
  Pass a DTO (`@Serialize(UserDto)`) to trim payload fields via `class-transformer`, or omit the DTO to return the payload untouched. Use `@SkipSerialize()` for routes that already produce raw streams/buffers.

- **AllExceptionsFilter**  
  Every error funnels through `AllExceptionsFilter`, so even unhandled errors become `{ success: false, data: {} }` payloads. Customize messages in `src/common/filters/exceptions.filter.ts`.

- **Configuration & secrets**  
  `ConfigModule` parses env files, merges them, and exposes typed sections (`configService.get('redis')`, etc.). This makes swapping providers (DB, email, SMS) straightforward.

- **Caching & queues**  
  `RedisModule` registers `CacheModule` globally. If Redis is reachable, it powers the cache and throttler; otherwise a memory store keeps the app running. `RedisService` wraps common helpers like `get`, `set`, and queue-like operations (`enqueue`, `dequeue`).

- **Rate limiting**  
  `ThrottlerConfigModule` wires three named buckets (short/medium/long) and stores counters in Redis when available. Adjust the `THROTTLER_*` env vars to tune limits.

- **Security & ops**  
  `main.ts` enables Helmet, URI versioning (`/api/v1/...`), a global prefix, and graceful shutdown hooks for SIGINT/SIGTERM/unhandled rejections.

- **Logging**  
  `src/utils/logger/logger.service.ts` exposes a Winston logger with daily-rotating files (`logs/`), console-friendly dev output, and env-based log levels. Import `WinstonLogger` in modules that need advanced logging.

## Redis setup (optional)

```bash
docker run --rm -p 6379:6379 --name hostell-redis redis:7-alpine
```

Update `REDIS_HOST=localhost` (and password if needed). When Redis is down the template automatically falls back to memory, so development remains smooth.

## Testing & quality

- Write unit tests next to source files (`*.spec.ts`), then run `npm run test`.
- e2e tests live under `test/` and hit the compiled app (`npm run test:e2e`).
- `npm run lint` plus `npm run format` keep the codebase consistent.

## Deployment

```bash
npm run build
NODE_ENV=production npm run start:prod
```

Use process managers like PM2 or containers for long-running processes. Remember to provide the correct `.env.production` file (or real environment variables) on the target host.

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
