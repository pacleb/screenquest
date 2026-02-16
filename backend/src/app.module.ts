import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailVerifiedGuard } from './auth/guards/email-verified.guard';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { FamilyModule } from './family/family.module';
import { UserModule } from './user/user.module';
import { QuestModule } from './quest/quest.module';
import { CompletionModule } from './completion/completion.module';
import { TimeBankModule } from './time-bank/time-bank.module';
import { UploadModule } from './upload/upload.module';
import { PlaySessionModule } from './play-session/play-session.module';
import { ViolationModule } from './violation/violation.module';
import { NotificationModule } from './notification/notification.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { GamificationModule } from './gamification/gamification.module';
import { PrivacyModule } from './privacy/privacy.module';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AppLoggingModule } from './common/logging/logging.module';
import { AnalyticsModule } from './common/analytics/analytics.module';
import { MetricsModule } from './common/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AppLoggingModule,
    AnalyticsModule,
    MetricsModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    MailModule,
    HealthModule,
    AuthModule,
    FamilyModule,
    UserModule,
    QuestModule,
    CompletionModule,
    TimeBankModule,
    UploadModule,
    PlaySessionModule,
    ViolationModule,
    NotificationModule,
    SubscriptionModule,
    GamificationModule,
    PrivacyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: EmailVerifiedGuard,
    },
  ],
})
export class AppModule {}
