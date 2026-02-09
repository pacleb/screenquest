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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    AuthModule,
    FamilyModule,
    UserModule,
    QuestModule,
    CompletionModule,
    TimeBankModule,
    UploadModule,
  ],
})
export class AppModule {}
