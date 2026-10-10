import path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import helmet from 'helmet';

// Resolve the backend's TypeScript path aliases at runtime. Vercel bundles the
// function into /var/task and may not include tsconfig.json, so tsconfig-paths'
// automatic config discovery is not reliable in this serverless environment.
const backendRoot = path.resolve(__dirname, '..');
const Module = require('module') as typeof import('module');
const originalResolveFilename = Module._resolveFilename;
const aliasPrefixes: Record<string, string> = {
  '@modules/': path.join(backendRoot, 'src/modules/'),
  '@common/': path.join(backendRoot, 'src/common/'),
  '@config/': path.join(backendRoot, 'src/config/'),
  '@database/': path.join(backendRoot, 'src/database/'),
  '@guards/': path.join(backendRoot, 'src/guards/'),
  '@decorators/': path.join(backendRoot, 'src/decorators/'),
  '@interfaces/': path.join(backendRoot, 'src/interfaces/'),
  '@utils/': path.join(backendRoot, 'src/utils/'),
  '@queue/': path.join(backendRoot, 'src/queue/'),
  '@scheduler/': path.join(backendRoot, 'src/scheduler/'),
  '@youtube/': path.join(backendRoot, 'src/modules/youtube/'),
  '@/': path.join(backendRoot, 'src/'),
};
Module._resolveFilename = function(request: string, parent: NodeModule | null | undefined, isMain: boolean, options?: unknown) {
  for (const [prefix, target] of Object.entries(aliasPrefixes)) {
    if (request.startsWith(prefix)) {
      request = path.join(target, request.slice(prefix.length));
      break;
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

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
