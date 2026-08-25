import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma.module';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}