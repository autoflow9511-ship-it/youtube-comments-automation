#!/usr/bin/env ts-node

import { Command } from 'commander';
import { ConfigService } from '@nestjs/config';
import { initializeMongoConnection, getModels, closeMongoConnection } from '../database/mongodb/connection';
import { runMigrations, rollbackMigration } from '../database/mongodb/migrations/migrations';

const program = new Command();

program
  .name('mongo-migrate')
  .description('MongoDB migration runner for YouTube Automation SaaS')
  .version('1.0.0');

program
  .command('up [version]')
  .description('Run migrations up to specified version (or all if not specified)')
  .action(async (version?: string) => {
    const configService = new ConfigService();
    
    try {
      await initializeMongoConnection(configService);
      const models = getModels();
      
      if (version) {
        console.log(`Running migrations up to version ${version}`);
      } else {
        console.log('Running all pending migrations');
      }
      
      await runMigrations(models, version);
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await closeMongoConnection();
    }
  });

program
  .command('down <version>')
  .description('Rollback a specific migration version')
  .action(async (version: string) => {
    const configService = new ConfigService();
    
    try {
      await initializeMongoConnection(configService);
      const models = getModels();
      
      console.log(`Rolling back migration ${version}`);
      await rollbackMigration(models, version);
      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      process.exit(1);
    } finally {
      await closeMongoConnection();
    }
  });

program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const configService = new ConfigService();
    
    try {
      await initializeMongoConnection(configService);
      const models = getModels();
      
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube_automation');
      
      await client.connect();
      const db = client.db();
      const migrationsCollection = db.collection('migrations');
      
      const applied = await migrationsCollection.find({}).sort({ version: 1 }).toArray();
      
      console.log('\nMigration Status:');
      console.log('=================');
      
      if (applied.length === 0) {
        console.log('No migrations applied yet');
      } else {
        applied.forEach((m: any) => {
          console.log(`✓ ${m.version}: ${m.name} (applied: ${m.appliedAt})`);
        });
      }
      
      const { migrations } = await import('../database/mongodb/migrations/migrations');
      const pending = migrations.filter(m => !applied.some((a: any) => a.version === m.version));
      
      if (pending.length > 0) {
        console.log('\nPending migrations:');
        pending.forEach(m => {
          console.log(`○ ${m.version}: ${m.name}`);
        });
      }
      
      await client.close();
    } catch (error) {
      console.error('Failed to get status:', error);
      process.exit(1);
    } finally {
      await closeMongoConnection();
    }
  });

program
  .command('create <name>')
  .description('Create a new migration file')
  .action(async (name: string) => {
    const fs = require('fs');
    const path = require('path');
    
    const migrationsDir = path.join(__dirname, '../database/mongodb/migrations');
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const version = String(migrations.length + 1).padStart(3, '0');
    const fileName = `${version}_${name.toLowerCase().replace(/\s+/g, '_')}.ts`;
    const filePath = path.join(migrationsDir, fileName);
    
    const template = `import { Models } from '../../models';

export const migration = {
  version: '${version}',
  name: '${name}',
  up: async (models: Models) => {
    console.log('Running migration: ${name}');
    // Add migration logic here
  },
  down: async (models: Models) => {
    console.log('Rolling back migration: ${name}');
    // Add rollback logic here
  },
};
`;
    
    fs.writeFileSync(filePath, template);
    console.log(`Created migration: ${filePath}`);
  });

program.parse(process.argv);