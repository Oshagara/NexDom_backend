import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Wraps all success responses in the NEXDOM API format:
 * - Single: { success: true, data: {...}, message }
 * - Paginated: { success: true, data: [...], meta: { total, page, limit, totalPages } }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Skip transform for responses that are already in NEXDOM format
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // 204 No Content or void/undefined
        if (data === undefined || data === null) {
          return {
            success: true,
            message: 'Operation successful',
          };
        }

        // Paginated format: { data: T[], total, page, limit }
        if (
          data &&
          typeof data === 'object' &&
          Array.isArray((data as Record<string, unknown>).data) &&
          typeof (data as Record<string, unknown>).total === 'number'
        ) {
          const payload = data as {
            data: unknown[];
            total: number;
            page: number;
            limit: number;
          };
          const page = payload.page ?? 1;
          const limit = payload.limit ?? 20;
          const totalPages = Math.ceil(payload.total / limit) || 1;

          return {
            success: true,
            data: payload.data,
            meta: {
              total: payload.total,
              page,
              limit,
              totalPages,
            },
          };
        }

        // Single item or arbitrary object
        return {
          success: true,
          data,
          message: 'Operation successful',
        };
      }),
    );
  }
}
