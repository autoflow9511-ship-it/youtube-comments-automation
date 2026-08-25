import { registerAs } from '@nestjs/config';
import { getRequiredEnv, getOptionalEnv, getOptionalInt } from '@common/utils/validate-config';

export const mongodbConfig = registerAs('mongodb', () => ({
  uri: getRequiredEnv('MONGODB_URI'),
  databaseName: getOptionalEnv('MONGODB_DATABASE', 'youtube_automation'),
  autoIndex: true,
  maxPoolSize: getOptionalInt('MONGODB_MAX_POOL_SIZE', 10),
  minPoolSize: getOptionalInt('MONGODB_MIN_POOL_SIZE', 2),
  socketTimeoutMS: getOptionalInt('MONGODB_SOCKET_TIMEOUT_MS', 45000),
  serverSelectionTimeoutMS: getOptionalInt('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 10000),
}));