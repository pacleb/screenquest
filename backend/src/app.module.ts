import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { MailModule } from './mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
  ],
})
export class AppModule {}
