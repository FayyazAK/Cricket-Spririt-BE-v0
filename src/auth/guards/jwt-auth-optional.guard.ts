import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthOptionalGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Call the parent canActivate but don't throw if it fails
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Don't throw error if no user, just return null
    return user || null;
  }
}
