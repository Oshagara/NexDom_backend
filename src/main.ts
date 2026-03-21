import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ActivityInterceptor } from './admin/activity.interceptor';
import { ResponseInterceptor } from './common/response.interceptor';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/', // public URL prefix
  });
  app.enableCors({
     origin: (origin, callback) => callback(null, true),
    credentials: true, // if you use cookies/auth
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // NEXDOM: consistent API response format and error handling
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    app.get(ActivityInterceptor),
    new ResponseInterceptor(),
  );

  await app.listen(process.env.PORT ?? 2025);
}
bootstrap();
