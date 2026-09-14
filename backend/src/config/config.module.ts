import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  googleOAuthConfig,
  emailConfig,
  youtubeConfig,
  throttleConfig,
  encryptionConfig,
  featureFlagsConfig,
} from './configuration';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        googleOAuthConfig,
        emailConfig,
        youtubeConfig,
        throttleConfig,
        encryptionConfig,
        featureFlagsConfig,
      ],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
