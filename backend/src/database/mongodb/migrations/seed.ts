import { getModels } from '../models';
import * as bcrypt from 'bcrypt';
import { UserRole, SubscriptionTier, ChannelStatus, AutomationStatus, TriggerType, ActionType, LandingPageStatus, EmailProvider, EmailStatus, WebhookEventType } from '../schemas/enums';

export async function seedDatabase() {
  const models = getModels();
  console.log('🌱 Seeding MongoDB database...');

  // Clear existing data (optional - comment out for production)
  // await clearDatabase(models);

  const passwordHash = await bcrypt.hash('password123', 12);

  // Create users
  const adminUser = await models.User.findOneAndUpdate(
    { email: 'admin@example.com' },
    {
      $setOnInsert: {
        email: 'admin@example.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.SUPER_ADMIN,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
        isEmailVerified: true,
      },
    },
    { upsert: true, new: true }
  );

  const testUser = await models.User.findOneAndUpdate(
    { email: 'test@example.com' },
    {
      $setOnInsert: {
        email: 'test@example.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        subscriptionTier: SubscriptionTier.FREE,
        isEmailVerified: true,
      },
    },
    { upsert: true, new: true }
  );

  const proUser = await models.User.findOneAndUpdate(
    { email: 'pro@example.com' },
    {
      $setOnInsert: {
        email: 'pro@example.com',
        passwordHash,
        firstName: 'Pro',
        lastName: 'User',
        role: UserRole.USER,
        subscriptionTier: SubscriptionTier.PRO,
        isEmailVerified: true,
      },
    },
    { upsert: true, new: true }
  );

  // Create system configs
  const systemConfigs = [
    { key: 'max_channels_per_user', value: 10, description: 'Maximum channels per user', isPublic: true },
    { key: 'max_automations_per_channel', value: 20, description: 'Maximum automations per channel', isPublic: true },
    { key: 'comment_fetch_interval_minutes', value: 5, description: 'Comment fetch interval in minutes', isPublic: true },
    { key: 'email_daily_limit', value: 1000, description: 'Daily email sending limit per user', isPublic: true },
    { key: 'webhook_retry_max_attempts', value: 3, description: 'Max webhook retry attempts', isPublic: true },
    { key: 'automation_execution_timeout_seconds', value: 300, description: 'Automation execution timeout', isPublic: false },
    { key: 'youtube_api_quota_daily', value: 10000, description: 'Daily YouTube API quota', isPublic: false },
  ];

  for (const config of systemConfigs) {
    await models.SystemConfig.findOneAndUpdate(
      { key: config.key },
      { $setOnInsert: config },
      { upsert: true }
    );
  }

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Admin: ${adminUser.email} (password: password123)`);
  console.log(`👤 Test User: ${testUser.email} (password: password123)`);
  console.log(`👤 Pro User: ${proUser.email} (password: password123)`);
}

async function clearDatabase(models: any) {
  console.log('🧹 Clearing database...');
  await Promise.all([
    models.User.deleteMany({}),
    models.Channel.deleteMany({}),
    models.Automation.deleteMany({}),
    models.AutomationAction.deleteMany({}),
    models.Comment.deleteMany({}),
    models.CommentReply.deleteMany({}),
    models.EmailCapture.deleteMany({}),
    models.EmailSequence.deleteMany({}),
    models.EmailSequenceStep.deleteMany({}),
    models.EmailEnrollment.deleteMany({}),
    models.EmailLog.deleteMany({}),
    models.LandingPage.deleteMany({}),
    models.LandingPageSubmission.deleteMany({}),
    models.WebhookEvent.deleteMany({}),
    models.AnalyticsEvent.deleteMany({}),
    models.Notification.deleteMany({}),
    models.AuditLog.deleteMany({}),
    models.ApiKey.deleteMany({}),
    models.SystemConfig.deleteMany({}),
    models.AutomationExecution.deleteMany({}),
    models.ActionExecution.deleteMany({}),
  ]);
  console.log('✅ Database cleared');
}

export async function seedTestData() {
  const models = getModels();
  console.log('🌱 Seeding test data...');

  // Get or create test user
  const user = await models.User.findOne({ email: 'test@example.com' });
  if (!user) {
    console.log('Test user not found. Run seedDatabase first.');
    return;
  }

  // Create test channel
  const channel = await models.Channel.findOneAndUpdate(
    { youtubeChannelId: 'UC_test_channel_123' },
    {
      $setOnInsert: {
        userId: user._id,
        youtubeChannelId: 'UC_test_channel_123',
        title: 'Test Channel',
        description: 'A test YouTube channel',
        customUrl: '@testchannel',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        subscriberCount: 10000,
        videoCount: 50,
        viewCount: 500000,
        status: ChannelStatus.CONNECTED,
        accessToken: 'encrypted_access_token',
        refreshToken: 'encrypted_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 3600000),
        scope: ['https://www.googleapis.com/auth/youtube.readonly'],
        settings: {},
      },
    },
    { upsert: true, new: true }
  );

  // Create test automation
  const automation = await models.Automation.findOneAndUpdate(
    { userId: user._id, name: 'Welcome New Subscribers' },
    {
      $setOnInsert: {
        userId: user._id,
        channelId: channel._id,
        name: 'Welcome New Subscribers',
        description: 'Reply to comments with welcome message',
        status: AutomationStatus.ACTIVE,
        triggerType: TriggerType.COMMENT_KEYWORD,
        triggerConfig: { keywords: ['subscribe', 'subscribed', 'new here'] },
        executionCount: 0,
        settings: {},
      },
    },
    { upsert: true, new: true }
  );

  // Create automation actions
  await models.AutomationAction.findOneAndUpdate(
    { automationId: automation._id, order: 0 },
    {
      $setOnInsert: {
        automationId: automation._id,
        type: ActionType.REPLY_COMMENT,
        config: { message: 'Welcome to the channel! Thanks for subscribing! 🎉' },
        order: 0,
        conditions: {},
      },
    },
    { upsert: true }
  );

  await models.AutomationAction.findOneAndUpdate(
    { automationId: automation._id, order: 1 },
    {
      $setOnInsert: {
        automationId: automation._id,
        type: ActionType.ADD_TAG,
        config: { tags: ['new_subscriber', 'welcomed'] },
        order: 1,
        conditions: {},
      },
    },
    { upsert: true }
  );

  // Create test landing page
  await models.LandingPage.findOneAndUpdate(
    { userId: user._id, slug: 'welcome-guide' },
    {
      $setOnInsert: {
        userId: user._id,
        channelId: channel._id,
        name: 'Welcome Guide',
        slug: 'welcome-guide',
        title: 'Get Our Free Welcome Guide',
        description: 'Subscribe to get our exclusive welcome guide',
        htmlContent: '<h1>Welcome!</h1><form>...</form>',
        cssContent: '.container { max-width: 600px; }',
        jsContent: '',
        formFields: [
          { name: 'email', label: 'Email Address', type: 'email', required: true },
          { name: 'firstName', label: 'First Name', type: 'text', required: false },
        ],
        settings: {},
        status: LandingPageStatus.PUBLISHED,
        publishUrl: 'http://localhost:5173/lp/welcome-guide',
        publishedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Create email sequence
  const sequence = await models.EmailSequence.findOneAndUpdate(
    { userId: user._id, name: 'Welcome Sequence' },
    {
      $setOnInsert: {
        userId: user._id,
        name: 'Welcome Sequence',
        description: 'Automated welcome emails for new subscribers',
        isActive: true,
        triggerType: 'landing_page_submit',
        triggerConfig: { landingPageId: 'welcome-guide' },
      },
    },
    { upsert: true, new: true }
  );

  // Create sequence steps
  await models.EmailSequenceStep.findOneAndUpdate(
    { sequenceId: sequence._id, order: 0 },
    {
      $setOnInsert: {
        sequenceId: sequence._id,
        order: 0,
        delayHours: 0,
        delayDays: 0,
        subject: 'Welcome to our community! 🎉',
        htmlContent: '<p>Hi {{firstName}},</p><p>Thanks for joining!</p>',
        textContent: 'Hi {{firstName}},\n\nThanks for joining!',
        conditions: {},
      },
    },
    { upsert: true }
  );

  await models.EmailSequenceStep.findOneAndUpdate(
    { sequenceId: sequence._id, order: 1 },
    {
      $setOnInsert: {
        sequenceId: sequence._id,
        order: 1,
        delayHours: 24,
        delayDays: 0,
        subject: 'Your free guide is ready! 📚',
        htmlContent: '<p>Hi {{firstName}},</p><p>Here is your guide: {{guideLink}}</p>',
        textContent: 'Hi {{firstName}},\n\nHere is your guide: {{guideLink}}',
        conditions: {},
      },
    },
    { upsert: true }
  );

  console.log('✅ Test data seeded successfully!');
  console.log(`📺 Channel: ${channel.title}`);
  console.log(`⚡ Automation: ${automation.name}`);
  console.log(`📄 Landing Page: ${channel.title} - Welcome Guide`);
  console.log(`📧 Email Sequence: Welcome Sequence (2 steps)`);
}