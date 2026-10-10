import path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import helmet from 'helmet';

// Vercel runs this function from a different working directory than the backend
// package, so register the repository's TypeScript aliases explicitly.
require('tsconfig-paths').register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: {
    '@/*': ['src/*'],
    '@modules/*': ['src/modules/*'],
    '@common/*': ['src/common/*'],
    '@config/*': ['src/config/*'],
    '@database/*': ['src/database/*'],
    '@guards/*': ['src/guards/*'],
    '@decorators/*': ['src/decorators/*'],
    '@interfaces/*': ['src/interfaces/*'],
    '@utils/*': ['src/utils/*'],
    '@queue/*': ['src/queue/*'],
    '@scheduler/*': ['src/scheduler/*'],
    '@youtube/*': ['src/modules/youtube/*'],
    '@modules/emails/*': ['src/modules/emails/*'],
    '@modules/landing-pages/*': ['src/modules/landing-pages/*'],
    '@modules/public-forms/*': ['src/modules/public-forms/*']
  }
});

// Require the app only after the aliases are registered.
const { AppModule } = require('../src/app.module') as typeof import('../src/app.module');

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

/** Vercel serverless entry point for the NestJS Express application. */
export default async function handler(req: Request, res: Response) {
  appPromise ??= createApp();
  const app = await appPromise;
  const expressApp = app.getHttpAdapter().getInstance();
  return expressApp(req, res);
}
