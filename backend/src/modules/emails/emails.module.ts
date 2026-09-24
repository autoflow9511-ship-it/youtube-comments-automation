import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './services/emails.service';
import { PrismaModule } from '../../database/prisma.module';
import { QueueModule } from '../../queue/queue.module';
import { CommonModule } from '../../common/common.module';
import { EmailProcessor } from '../../queue/processors/email-processor';

@Module({
  imports: [PrismaModule, QueueModule, CommonModule],
  controllers: [EmailsController],
  providers: [EmailsService, EmailProcessor],
  exports: [EmailsService],
})
export class EmailsModule {}