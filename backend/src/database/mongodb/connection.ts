import { Connection, connect, ConnectOptions, Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createModels, Models } from './models';

let mongoConnection: Connection;
let models: Models;

export async function initializeMongoConnection(configService: ConfigService): Promise<Connection> {
  if (mongoConnection) {
    return mongoConnection;
  }

  const mongoUri = configService.get<string>('mongodb.uri') || 'mongodb://localhost:27017/youtube_automation';
  const options: ConnectOptions = {
    maxPoolSize: configService.get<number>('mongodb.maxPoolSize') || 10,
    minPoolSize: configService.get<number>('mongodb.minPoolSize') || 2,
    socketTimeoutMS: configService.get<number>('mongodb.socketTimeoutMS') || 45000,
    serverSelectionTimeoutMS: configService.get<number>('mongodb.serverSelectionTimeoutMS') || 10000,
    family: 4,
    autoIndex: configService.get<string>('app.nodeEnv') !== 'production',
  };

  try {
    const connection = await connect(mongoUri, options);
    mongoConnection = connection.connection;
    models = createModels(mongoConnection);
    
    mongoConnection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoConnection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
    mongoConnection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    console.log('MongoDB connected successfully');
    return mongoConnection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getMongoConnection(): Connection {
  if (!mongoConnection) {
    throw new Error('MongoDB connection not initialized. Call initializeMongoConnection first.');
  }
  return mongoConnection;
}

export function getModels(): Models {
  if (!models) {
    throw new Error('Models not initialized. Call initializeMongoConnection first.');
  }
  return models;
}

export async function closeMongoConnection(): Promise<void> {
  if (mongoConnection) {
    await mongoConnection.close();
    mongoConnection = undefined as any;
    models = undefined as any;
  }
}

export async function runMongoMigration(migrationFn: (models: Models) => Promise<void>): Promise<void> {
  const connection = getMongoConnection();
  const m = getModels();
  
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      await migrationFn(m);
    });
  } finally {
    await session.endSession();
  }
}

export function getModel<T>(modelName: keyof Models): Model<T> {
  return getModels()[modelName];
}