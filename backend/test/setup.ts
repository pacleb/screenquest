import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { RequestIdInterceptor } from '../src/common/interceptors/request-id.interceptor';

export async function createApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: join(__dirname, '.env.test'),
      }),
      AppModule,
    ],
  })
    .compile();

  const app = moduleRef.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

export async function cleanDatabase(app: INestApplication) {
  const prisma = app.get(PrismaService);

  // Delete in order that respects foreign key constraints
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "quest_completions",
      "quest_assignments",
      "play_sessions",
      "violations",
      "violation_counters",
      "time_banks",
      "refresh_tokens",
      "push_tokens",
      "in_app_notifications",
      "notification_preferences",
      "child_progress",
      "child_achievements",
      "child_equipped_items",
      "avatar_pack_purchases",
      "avatar_items",
      "achievements",
      "quests",
      "quest_library",
      "quest_categories",
      "family_invites",
      "users",
      "families"
    CASCADE
  `);
}

export async function closeApp(app: INestApplication) {
  await app.close();
}

export function getAgent(app: INestApplication) {
  return request(app.getHttpServer());
}

export async function registerAndLogin(
  app: INestApplication,
  data: { email: string; password: string; name: string },
) {
  const agent = getAgent(app);
  const prisma = app.get(PrismaService);

  const res = await agent
    .post('/api/auth/register')
    .send(data)
    .expect(201);

  // Mark user as email-verified so EmailVerifiedGuard doesn't block
  await prisma.user.update({
    where: { id: res.body.user.id },
    data: { emailVerified: true },
  });

  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    user: res.body.user,
  };
}
