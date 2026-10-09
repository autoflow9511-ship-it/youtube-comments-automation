import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';

let appPromise: ReturnType<typeof createApp> | undefined;

async function createApp() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('app.frontendUrl') || 'https://youtube-comments-automation.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  app.setGlobalPrefix(config.get<string>('app.apiPrefix') || 'api/v1');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  await app.init();
  return app;
}

/**
 * Vercel Node function entry point.
 * Nest's regular main.ts calls app.listen(), which is suitable for a server
 * but does not expose an HTTP handler to Vercel's serverless routing layer.
 */
export default async function handler(req: Request, res: Response) {
  appPromise ??= createApp();
  const app = await appPromise;
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}
