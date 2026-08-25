import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { mongodbConfig } from './mongodb.config';
import { MongoDBModelsModule } from './mongodb-models.module';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(mongodbConfig),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
        dbName: configService.get<string>('mongodb.databaseName'),
        autoIndex: configService.get<boolean>('mongodb.autoIndex'),
        maxPoolSize: configService.get<number>('mongodb.maxPoolSize'),
        minPoolSize: configService.get<number>('mongodb.minPoolSize'),
        socketTimeoutMS: configService.get<number>('mongodb.socketTimeoutMS'),
        serverSelectionTimeoutMS: configService.get<number>('mongodb.serverSelectionTimeoutMS'),
      }),
      inject: [ConfigService],
    }),
    MongoDBModelsModule,
  ],
  exports: [MongooseModule, MongoDBModelsModule],
})
export class MongoDBModule {}