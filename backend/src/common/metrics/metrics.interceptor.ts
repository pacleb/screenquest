import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/**
 * Interceptor that records request duration and status for metrics.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          // Normalize path to remove UUIDs for grouping
          const normalizedPath = this.normalizePath(req.route?.path || req.url);
          this.metrics.recordRequest(req.method, normalizedPath, res.statusCode, duration);
        },
        error: (err: any) => {
          const duration = Date.now() - start;
          const statusCode = err?.status || err?.statusCode || 500;
          const normalizedPath = this.normalizePath(req.route?.path || req.url);
          this.metrics.recordRequest(req.method, normalizedPath, statusCode, duration);
        },
      }),
    );
  }

  /**
   * Normalize paths by replacing UUIDs and numeric IDs with :id
   * e.g., /api/families/abc-123/quests/456 → /api/families/:id/quests/:id
   */
  private normalizePath(path: string): string {
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+(?=\/|$)/g, '/:id')
      .split('?')[0]; // Remove query params
  }
}
