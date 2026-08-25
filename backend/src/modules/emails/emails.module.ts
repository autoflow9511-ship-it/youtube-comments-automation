import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './services/emails.service';
import { PrismaModule } from '../../database/prisma.module';
import { QueueModule } from '../../queue/queue.module';
import { CommonModule } from '../../common/common.module';
import { LandingPagesModule } from '../landing-pages/landing-pages.module';

@Module({
  imports: [PrismaModule, QueueModule, CommonModule, LandingPagesModule],
  controllers: [EmailsController],
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}