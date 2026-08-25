import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@config/config.module';
import { PrismaModule } from '@database/prisma.module';
import { CommonModule } from '@common/common.module';
import { QueueModule } from '@queue/queue.module';
import { SchedulerModule } from '@scheduler/scheduler.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { ChannelsModule } from '@modules/channels/channels.module';
import { AutomationsModule } from '@modules/automations/automations.module';
import { CommentsModule } from '@modules/comments/comments.module';
import { EmailsModule } from '@modules/emails/emails.module';
import { LandingPagesModule } from '@modules/landing-pages/landing-pages.module';
import { YouTubeModule } from '@modules/youtube/youtube.module';
import { WebhooksModule } from '@modules/webhooks/webhooks.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { AdminModule } from '@modules/admin/admin.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { ValidationPipe } from '@common/pipes/validation.pipe';
import { AuthGuard } from '@guards/auth.guard';
import { RolesGuard } from '@guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CommonModule,
    QueueModule,
    SchedulerModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigModule],
      useFactory: (configModule: any) => ({
        ttl: configModule.get('throttle.ttl') || 60,
        limit: configModule.get('throttle.limit') || 100,
      }),
    }),
    AuthModule,
    UsersModule,
    ChannelsModule,
    YouTubeModule,
    AutomationsModule,
    CommentsModule,
    EmailsModule,
    LandingPagesModule,
    WebhooksModule,
    AnalyticsModule,
    AdminModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}