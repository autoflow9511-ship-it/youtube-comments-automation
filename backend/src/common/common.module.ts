import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';
import { DateUtils } from './utils/date.utils';
import { StringUtils } from './utils/string.utils';

@Global()
@Module({
  providers: [EncryptionService, DateUtils, StringUtils],
  exports: [EncryptionService, DateUtils, StringUtils],
})
export class CommonModule {}