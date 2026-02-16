import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to skip email verification check on specific routes.
 * Use on endpoints that unverified users must still access
 * (e.g. resend verification, logout, profile).
 */
export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';
export const SkipEmailVerification = () =>
  SetMetadata(SKIP_EMAIL_VERIFICATION_KEY, true);

/**
 * Guard that ensures the authenticated user has verified their email.
 * Only applies to parent/guardian roles — children don't have emails.
 * Use @SkipEmailVerification() to exempt specific routes.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle missing user
    }

    // Children don't have email — skip check
    if (user.role === 'child') {
      return true;
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email address before continuing. Check your inbox for the verification link.',
      );
    }

    return true;
  }
}
