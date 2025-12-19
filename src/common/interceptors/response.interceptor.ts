import {
  UseInterceptors,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
  Injectable,
  mixin,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

interface ClassConstructor<T = any> {
  new (...args: any[]): T;
}

interface StructuredResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

export const SKIP_SERIALIZE_KEY = 'skip_serialize';

export const SkipSerialize = () => SetMetadata(SKIP_SERIALIZE_KEY, true);

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(
    private readonly dto: ClassConstructor | undefined,
    private readonly reflector: Reflector,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private isStructuredResponse(value: unknown): value is StructuredResponse {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      'success' in candidate || 'message' in candidate || 'data' in candidate
    );
  }

  intercept(context: ExecutionContext, handler: CallHandler): Observable<any> {
    const skipSerialize = this.reflector.getAllAndOverride<boolean>(
      SKIP_SERIALIZE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipSerialize) {
      return handler.handle();
    }

    return handler.handle().pipe(
      map((data: unknown) => {
        // Check if data is already in structured format
        if (this.isStructuredResponse(data)) {
          // Serialize only the 'data' property within the structure
          const serializedData = this.serializeData(data.data);
          return {
            success: data?.success ?? true,
            message: data?.message ?? '',
            data: serializedData,
          };
        }

        // Fallback: If not structured (which shouldn't happen per requirement, but good safety),
        // treat the whole object as data and wrap it.
        const serializedData = this.serializeData(data);
        return {
          success: true,
          message: '',
          data: serializedData,
        };
      }),
    );
  }

  private serializeData(payload: unknown): unknown {
    if (!this.dto) {
      return payload ?? {};
    }

    const transformed = plainToInstance(this.dto, payload ?? {}, {
      excludeExtraneousValues: true,
    });

    return transformed ?? {};
  }
}

export function Serialize(dto?: ClassConstructor) {
  @Injectable()
  class SerializeInterceptorMixin extends SerializeInterceptor {
    constructor(
      @Inject(Reflector) reflector: Reflector,
      @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    ) {
      // pass dto (may be undefined)
      super(dto, reflector, logger);
    }
  }

  return UseInterceptors(mixin(SerializeInterceptorMixin));
}
