import './common/sentry/instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Use pino logger for all NestJS logging (structured JSON in prod, pretty in dev)
  app.useLogger(app.get(Logger));

  app.use(helmet());

  // Build CORS allowed origins
  const allowedOrigins: string[] = [];
  if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);
  if (process.env.CMS_URL) allowedOrigins.push(process.env.CMS_URL);
  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean));
  }
  // Always allow mobile (no Origin header) and localhost for dev
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3001', 'http://localhost:8081');
  }
  console.log('[CORS DEBUG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[CORS DEBUG] Allowed origins:', allowedOrigins);

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' && allowedOrigins.length > 0
      ? (origin, callback) => {
          // Allow requests with no origin (mobile apps, curl, etc.)
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          console.warn('[CORS DEBUG] Blocked origin:', origin);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      : true, // Allow all origins in development or if no origins configured
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ScreenQuest API')
      .setDescription('API for the ScreenQuest screen time management app')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`ScreenQuest API running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();
}
bootstrap();
