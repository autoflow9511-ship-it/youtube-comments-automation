import { Module } from '@nestjs/common';
import { LandingPagesController } from './landing-pages.controller';
import { LandingPagesService } from './services/landing-pages.service';
import { PrismaModule } from '../../database/prisma.module';
import { QueueModule } from '../../queue/queue.module';
import { CommonModule } from '../../common/common.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [PrismaModule, QueueModule, CommonModule, EmailsModule],
  controllers: [LandingPagesController],
  providers: [LandingPagesService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}