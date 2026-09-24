import { registerAs } from '@nestjs/config';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { validateConfig } from '../common/utils/validate-config';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
  apiPrefix: string;
  frontendUrl: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

export interface YouTubeConfig {
  apiKey: string;
  pubsubHubCallback: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface EncryptionConfig {
  key: string;
}

export interface FeatureFlags {
  enableWebhooks: boolean;
  enableEmailSequences: boolean;
  enableLandingPages: boolean;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  nodeEnv: validateConfig('NODE_ENV', Environment, Environment.Development),
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'https://youtube-comments-automation.vercel.app',
}));

export const databaseConfig = registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL || '',
}));

export const redisConfig = registerAs('redis', (): RedisConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));

export const jwtConfig = registerAs('jwt', (): JwtConfig => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || '',
  refreshSecret: process.env.JWT_REFRESH_SECRET || '',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'youtube-automation-saas',
  audience: process.env.JWT_AUDIENCE || 'youtube-automation-users',
}));

export const googleOAuthConfig = registerAs('googleOAuth', (): GoogleOAuthConfig => ({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  scopes: (process.env.GOOGLE_OAUTH_SCOPES || '').split(','),
}));

export const emailConfig = registerAs('email', (): EmailConfig => ({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || '',
  fromName: process.env.SMTP_FROM_NAME || 'YouTube Automation',
}));

export const youtubeConfig = registerAs('youtube', (): YouTubeConfig => ({
  apiKey: process.env.YOUTUBE_API_KEY || '',
  pubsubHubCallback: process.env.YOUTUBE_PUBSUB_HUB_CALLBACK || '',
}));

export const throttleConfig = registerAs('throttle', (): ThrottleConfig => ({
  ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
}));

export const encryptionConfig = registerAs('encryption', (): EncryptionConfig => ({
  key: process.env.ENCRYPTION_KEY || '',
}));

export const featureFlagsConfig = registerAs('features', (): FeatureFlags => ({
  enableWebhooks: process.env.ENABLE_WEBHOOKS !== 'false',
  enableEmailSequences: process.env.ENABLE_EMAIL_SEQUENCES !== 'false',
  enableLandingPages: process.env.ENABLE_LANDING_PAGES !== 'false',
}));