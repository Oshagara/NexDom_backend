import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extracts the authenticated JWT payload from `req.user`.
// Controllers can use this instead of manually reading `@Req()`.
export const GetUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});

