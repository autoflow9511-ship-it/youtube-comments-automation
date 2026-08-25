import { Models } from '../models';

export interface Migration {
  version: string;
  name: string;
  up: (models: Models) => Promise<void>;
  down: (models: Models) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: '001',
    name: 'create_indexes',
    up: async (models: Models) => {
      console.log('Running migration: create_indexes');
      
      // Users indexes
      await models.User.collection.createIndex({ email: 1 }, { unique: true });
      await models.User.collection.createIndex({ subscriptionTier: 1 });
      await models.User.collection.createIndex({ createdAt: -1 });
      
      // Channels indexes
      await models.Channel.collection.createIndex({ userId: 1, status: 1 });
      await models.Channel.collection.createIndex({ youtubeChannelId: 1 }, { unique: true });
      
      // Automations indexes
      await models.Automation.collection.createIndex({ userId: 1, status: 1 });
      await models.Automation.collection.createIndex({ channelId: 1, status: 1 });
      
      // Comments indexes
      await models.Comment.collection.createIndex({ channelId: 1, publishedAt: -1 });
      await models.Comment.collection.createIndex({ youtubeCommentId: 1 }, { unique: true });
      await models.Comment.collection.createIndex({ channelId: 1, processedAt: 1 });
      
      // Email captures indexes
      await models.EmailCapture.collection.createIndex({ userId: 1, email: 1 }, { unique: true });
      await models.EmailCapture.collection.createIndex({ userId: 1, createdAt: -1 });
      
      // Landing pages indexes
      await models.LandingPage.collection.createIndex({ slug: 1 }, { unique: true });
      await models.LandingPage.collection.createIndex({ userId: 1, status: 1 });
      
      // Webhook events indexes
      await models.WebhookEvent.collection.createIndex({ channelId: 1, receivedAt: -1 });
      await models.WebhookEvent.collection.createIndex({ processed: 1, receivedAt: 1 });
      
      console.log('Indexes created successfully');
    },
    down: async (models: Models) => {
      console.log('Dropping indexes...');
      // Note: Dropping indexes in production should be done carefully
    },
  },
  {
    version: '002',
    name: 'add_ttl_indexes',
    up: async (models: Models) => {
      console.log('Running migration: add_ttl_indexes');
      
      // TTL index for webhook events (auto-delete after 30 days)
      await models.WebhookEvent.collection.createIndex(
        { receivedAt: 1 }, 
        { expireAfterSeconds: 30 * 24 * 60 * 60, name: 'ttl_webhook_events' }
      );
      
      // TTL index for analytics events (auto-delete after 90 days)
      await models.AnalyticsEvent.collection.createIndex(
        { createdAt: 1 }, 
        { expireAfterSeconds: 90 * 24 * 60 * 60, name: 'ttl_analytics_events' }
      );
      
      // TTL index for notifications (auto-delete after 180 days)
      await models.Notification.collection.createIndex(
        { createdAt: 1 }, 
        { expireAfterSeconds: 180 * 24 * 60 * 60, name: 'ttl_notifications' }
      );
      
      console.log('TTL indexes created successfully');
    },
    down: async (models: Models) => {
      try {
        await models.WebhookEvent.collection.dropIndex('ttl_webhook_events');
        await models.AnalyticsEvent.collection.dropIndex('ttl_analytics_events');
        await models.Notification.collection.dropIndex('ttl_notifications');
      } catch (error) {
        console.warn('Error dropping TTL indexes:', error);
      }
    },
  },
  {
    version: '003',
    name: 'add_compound_indexes_for_queries',
    up: async (models: Models) => {
      console.log('Running migration: add_compound_indexes_for_queries');
      
      // Common query patterns
      await models.Comment.collection.createIndex({ channelId: 1, videoId: 1, publishedAt: -1 });
      await models.EmailCapture.collection.createIndex({ channelId: 1, createdAt: -1 });
      await models.EmailCapture.collection.createIndex({ automationId: 1, createdAt: -1 });
      await models.EmailLog.collection.createIndex({ status: 1, sentAt: -1 });
      await models.LandingPageSubmission.collection.createIndex({ landingPageId: 1, createdAt: -1 });
      await models.AutomationExecution.collection.createIndex({ automationId: 1, startedAt: -1 });
      await models.ActionExecution.collection.createIndex({ executionId: 1, createdAt: 1 });
      
      console.log('Compound indexes created successfully');
    },
    down: async (models: Models) => {
      console.log('Dropping compound indexes...');
    },
  },
  {
    version: '004',
    name: 'add_text_search_indexes',
    up: async (models: Models) => {
      console.log('Running migration: add_text_search_indexes');
      
      // Text search on comments
      await models.Comment.collection.createIndex(
        { text: 'text', authorName: 'text' },
        { name: 'comment_text_search', default_language: 'english' }
      );
      
      // Text search on users
      await models.User.collection.createIndex(
        { email: 'text', firstName: 'text', lastName: 'text' },
        { name: 'user_text_search', default_language: 'english' }
      );
      
      // Text search on landing pages
      await models.LandingPage.collection.createIndex(
        { name: 'text', title: 'text', description: 'text' },
        { name: 'landing_page_text_search', default_language: 'english' }
      );
      
      console.log('Text search indexes created successfully');
    },
    down: async (models: Models) => {
      try {
        await models.Comment.collection.dropIndex('comment_text_search');
        await models.User.collection.dropIndex('user_text_search');
        await models.LandingPage.collection.dropIndex('landing_page_text_search');
      } catch (error) {
        console.warn('Error dropping text indexes:', error);
      }
    },
  },
];

export async function runMigrations(models: Models, targetVersion?: string): Promise<void> {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube_automation');
  
  try {
    await client.connect();
    const db = client.db();
    const migrationsCollection = db.collection('migrations');
    
    // Create migrations collection if not exists
    await migrationsCollection.createIndex({ version: 1 }, { unique: true });
    
    // Get applied migrations
    const applied = await migrationsCollection.find({}).toArray();
    const appliedVersions = new Set(applied.map(m => m.version));
    
    // Filter migrations to run
    const toRun = migrations.filter(m => !appliedVersions.has(m.version));
    
    if (targetVersion) {
      const targetIndex = migrations.findIndex(m => m.version === targetVersion);
      if (targetIndex >= 0) {
        toRun.splice(targetIndex + 1);
      }
    }
    
    for (const migration of toRun) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      await migration.up(models);
      
      await migrationsCollection.insertOne({
        version: migration.version,
        name: migration.name,
        appliedAt: new Date(),
      });
      
      console.log(`Migration ${migration.version} applied successfully`);
    }
    
    console.log('All migrations completed');
  } finally {
    await client.close();
  }
}

export async function rollbackMigration(models: Models, version: string): Promise<void> {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube_automation');
  
  try {
    await client.connect();
    const db = client.db();
    const migrationsCollection = db.collection('migrations');
    
    const migration = migrations.find(m => m.version === version);
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }
    
    const applied = await migrationsCollection.findOne({ version });
    if (!applied) {
      throw new Error(`Migration ${version} not applied`);
    }
    
    console.log(`Rolling back migration ${version}: ${migration.name}`);
    await migration.down(models);
    
    await migrationsCollection.deleteOne({ version });
    console.log(`Migration ${version} rolled back successfully`);
  } finally {
    await client.close();
  }
}