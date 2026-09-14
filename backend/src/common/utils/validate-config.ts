import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export function validateConfig<T>(
  envKey: string,
  enumType: any,
  defaultValue: T,
): T {
  const value = process.env[envKey];
  if (!value) {
    return defaultValue;
  }

  const validated = plainToInstance(enumType, value);
  const errors = validateSync(validated as object, { whitelist: true, forbidNonWhitelisted: true });

  if (errors.length > 0) {
    throw new Error(`Invalid value for ${envKey}: ${errors.map(e => Object.values(e.constraints || {})).join(', ')}`);
  }

  return validated as T;
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

export function getRequiredInt(key: string): number {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for ${key}: ${value}`);
  }
  return parsed;
}

export function getOptionalInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for ${key}: ${value}`);
  }
  return parsed;
}

export function getRequiredBool(key: string): boolean {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.toLowerCase() === 'true';
}

export function getOptionalBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}