import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationEngineService } from './services/automation-engine.service';
import { PrismaModule } from '../../database/prisma.module';
import { QueueModule } from '../../queue/queue.module';
import { YouTubeModule } from '../youtube/youtube.module';
import { EmailsModule } from '../emails/emails.module';
import { LandingPagesModule } from '../landing-pages/landing-pages.module';
import { CommonModule } from '../../common/common.module';
import { AutomationProcessor } from '../../queue/processors/automation-processor';

@Module({
  imports: [PrismaModule, QueueModule, YouTubeModule, EmailsModule, LandingPagesModule, CommonModule],
  controllers: [AutomationsController],
  providers: [AutomationEngineService, AutomationProcessor],
  exports: [AutomationEngineService],
})
export class AutomationsModule {}