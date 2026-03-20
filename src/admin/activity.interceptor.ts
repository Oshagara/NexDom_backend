import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = context.switchToHttp().getRequest();
    const user = req?.user;
    const method: string = req?.method || '';
    const url: string = (req?.originalUrl || req?.url || '').split('?')[0];
    const ip: string = req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '';
    const userAgent: string = req?.headers?.['user-agent'] || '';

    const resource = this.extractResource(url);
    const redactedBody = this.redactSensitive(req?.body);

    return next.handle().pipe(
      tap(async () => {
        if (!user) return; // only log authenticated users globally
        try {
          await this.activityService.logActivity({
            userId: String(user.sub || user.userId || ''),
            role: user.role || 'user',
            email: user.email,
            name: user.name,
            action: method.toLowerCase(),
            resource,
            metadata: { path: url, body: redactedBody },
            ip,
            userAgent,
          } as any);
        } catch {}
      }),
      catchError((err) => {
        (async () => {
          if (!user) return;
          try {
            await this.activityService.logActivity({
              userId: String(user.sub || user.id || user._id || user.userId || ''),
              role: user.role || 'user',
              email: user.email,
              name: user.name,
              action: method.toLowerCase(),
              resource,
              metadata: { path: url, body: redactedBody, error: err?.message || 'Error' },
              ip,
              userAgent,
            } as any);
          } catch {}
        })();
        return throwError(() => err);
      }),
    );
  }

  private extractResource(url: string): string {
    if (!url) return 'unknown';
    const parts = url.split('/').filter(Boolean);
    // prefer second segment if first is private, else first
    if (parts[0] === 'private' && parts.length > 1) return parts[1];
    return parts[0] || 'unknown';
  }

  private redactSensitive(body: any) {
    if (!body || typeof body !== 'object') return body;
    const cloned: any = Array.isArray(body) ? [...body] : { ...body };
    const sensitiveKeys = ['password', 'newPassword', 'currentPassword', 'token', 'twofaCode', 'twoFactorCode', 'code'];
    for (const key of Object.keys(cloned)) {
      if (sensitiveKeys.includes(key)) {
        cloned[key] = '[REDACTED]';
      } else if (cloned[key] && typeof cloned[key] === 'object') {
        cloned[key] = this.redactSensitive(cloned[key]);
      }
    }
    return cloned;
  }
}

