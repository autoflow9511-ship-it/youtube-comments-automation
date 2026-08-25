import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SMTPProvider } from './smtp.provider';
import { GmailProvider } from './gmail.provider';
import { EmailProviderService } from './email-provider.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SMTPProvider, GmailProvider, EmailProviderService],
  exports: [SMTPProvider, GmailProvider, EmailProviderService],
})
export class EmailProviderModule {}