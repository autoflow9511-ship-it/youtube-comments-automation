/**
 * One-time admin provisioning. Run from a trusted operator environment, never
 * expose as an HTTP endpoint. Requires a MongoDB replica set for transactions.
 * Set MONGODB_URI and INITIAL_ADMIN_EMAIL outside source control.
 *
 * Refuses to run if ANY user already exists: migrate/reconcile existing users
 * manually instead of silently granting administrator access.
 */
import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  if (!uri || !email || !/^[^@\\s]+@gmail\\.com$/.test(email)) {
    throw new Error('MONGODB_URI and a valid INITIAL_ADMIN_EMAIL Gmail address are required');
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const users = db.collection('users');
        const config = db.collection('system_configs');
        // No bypass for an already populated site or previously bootstrapped DB.
        if (await users.countDocuments({}, { session }) !== 0 ||
            await config.findOne({ key: 'private_admin_bootstrapped' }, { session })) {
          throw new Error('Bootstrap refused: users or bootstrap marker already exist');
        }
        const now = new Date();
        await config.insertOne({
          key: 'private_admin_bootstrapped', value: true,
          adminEmail: email, createdAt: now, updatedAt: now,
        }, { session });
        await users.insertOne({
          id: randomUUID(), email, role: 'SUPER_ADMIN',
          isEmailVerified: true, twoFactorEnabled: false,
          subscriptionTier: 'FREE', passwordHash: null,
          createdAt: now, updatedAt: now,
        }, { session });
      }, { writeConcern: { w: 'majority' } });
      console.log('Admin provisioned. Enable mandatory MFA before production release.');
    } finally { await session.endSession(); }
  } finally { await client.close(); }
}
main().catch(err => { console.error('Admin bootstrap failed:', err.message); process.exitCode = 1; });
