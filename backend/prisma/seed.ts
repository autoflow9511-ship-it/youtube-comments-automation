import { PrismaClient, UserRole, SubscriptionTier, ChannelStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.SUPER_ADMIN,
      subscriptionTier: SubscriptionTier.ENTERPRISE,
      isEmailVerified: true,
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      subscriptionTier: SubscriptionTier.FREE,
      isEmailVerified: true,
    },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@example.com' },
    update: {},
    create: {
      email: 'pro@example.com',
      passwordHash,
      firstName: 'Pro',
      lastName: 'User',
      role: UserRole.USER,
      subscriptionTier: SubscriptionTier.PRO,
      isEmailVerified: true,
    },
  });

  const starterUser = await prisma.user.upsert({
    where: { email: 'starter@example.com' },
    update: {},
    create: {
      email: 'starter@example.com',
      passwordHash,
      firstName: 'Starter',
      lastName: 'User',
      role: UserRole.USER,
      subscriptionTier: SubscriptionTier.STARTER,
      isEmailVerified: true,
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'max_channels_per_user' },
    update: { value: 10 },
    create: { key: 'max_channels_per_user', value: 10, description: 'Maximum channels per user', isPublic: true },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'max_automations_per_channel' },
    update: { value: 20 },
    create: { key: 'max_automations_per_channel', value: 20, description: 'Maximum automations per channel', isPublic: true },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'comment_fetch_interval_minutes' },
    update: { value: 5 },
    create: { key: 'comment_fetch_interval_minutes', value: 5, description: 'Comment fetch interval in minutes', isPublic: true },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'email_daily_limit' },
    update: { value: 1000 },
    create: { key: 'email_daily_limit', value: 1000, description: 'Daily email sending limit per user', isPublic: true },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'webhook_retry_max_attempts' },
    update: { value: 3 },
    create: { key: 'webhook_retry_max_attempts', value: 3, description: 'Max webhook retry attempts', isPublic: true },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Admin: ${adminUser.email} (password: password123)`);
  console.log(`👤 Test User: ${testUser.email} (password: password123)`);
  console.log(`👤 Pro User: ${proUser.email} (password: password123)`);
  console.log(`👤 Starter User: ${starterUser.email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });