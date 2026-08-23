/**
 * Development/demo seed script.
 * Usage: npm run seed
 *
 * Creates (idempotently where sensible):
 *  - Initial EconomyConfig (version 1) from config/tapEconomy.defaults.js
 *  - One admin user
 *  - N demo users with TapState initialized
 *  - One active TapSeason
 *  - A few sample Missions
 *  - Today's DailyChallenge
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, TapState, EconomyConfig, Mission, DailyChallenge } = require('../models');
const defaultConfig = require('../config/tapEconomy.defaults');
const seasonService = require('../services/seasonService');

async function seedEconomyConfig() {
  const existing = await EconomyConfig.findOne({ isActive: true });
  if (existing) {
    console.log(`[seed] EconomyConfig already active at version ${existing.version}, skipping.`);
    return existing;
  }
  const doc = await EconomyConfig.create({
    version: 1,
    isActive: true,
    config: defaultConfig,
    createdBy: null,
    reason: 'initial seed',
  });
  console.log('[seed] Created initial EconomyConfig v1');
  return doc;
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@veloop.dev';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin ${email} already exists, skipping.`);
    return existing;
  }
  const passwordHash = await User.hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin@12345');
  const admin = await User.create({
    email,
    passwordHash,
    displayName: 'VELoop Admin',
    role: 'admin',
    level: 99,
  });
  await TapState.create({ userId: admin._id, energy: 500, maxEnergy: 500 });
  console.log(`[seed] Created admin user: ${email}`);
  return admin;
}

async function seedDemoUsers() {
  const count = Number(process.env.SEED_DEMO_USERS) || 10;
  const users = [];
  for (let i = 1; i <= count; i += 1) {
    const email = `demo${i}@veloop.dev`;
    // eslint-disable-next-line no-await-in-loop
    let user = await User.findOne({ email });
    if (!user) {
      // eslint-disable-next-line no-await-in-loop
      const passwordHash = await User.hashPassword('Demo@12345');
      // eslint-disable-next-line no-await-in-loop
      user = await User.create({
        email,
        passwordHash,
        displayName: `Tapper${i}`,
        level: Math.ceil(Math.random() * 20),
      });
      // eslint-disable-next-line no-await-in-loop
      await TapState.create({
        userId: user._id,
        energy: 500,
        maxEnergy: 500,
        physicalTapCountLifetime: Math.floor(Math.random() * 500),
        effectiveTapCountLifetime: Math.floor(Math.random() * 500),
      });
      console.log(`[seed] Created demo user: ${email}`);
    }
    users.push(user);
  }
  return users;
}

async function seedSeason() {
  const { TapSeason } = require('../models');
  const existing = await TapSeason.findOne({ status: 'active' });
  if (existing) {
    console.log(`[seed] Active season already exists: ${existing.seasonId}, skipping.`);
    return existing;
  }
  const season = await seasonService.createSeason({ name: 'VELoop Season One', durationDays: 30 });
  console.log(`[seed] Created active season: ${season.seasonId}`);
  return season;
}

async function seedMissions(season) {
  const now = new Date();
  const activeTo = season ? season.endAt : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const missionDefs = [
    { missionKey: 'daily_100_taps', title: 'Complete 100 accepted taps', type: 'taps_completed', target: 100, reward: { currency: 'tokens', amount: 50 }, cadence: 'daily' },
    { missionKey: 'daily_500_taps', title: 'Complete 500 accepted taps', type: 'taps_completed', target: 500, reward: { currency: 'tokens', amount: 200 }, cadence: 'daily' },
    { missionKey: 'combo_25', title: 'Reach a x25 combo', type: 'combo_reached', target: 25, reward: { currency: 'tokens', amount: 75 }, cadence: 'seasonal' },
    { missionKey: 'precision_tap_1', title: 'Complete a precision tap', type: 'precision_tap', target: 1, reward: { currency: 'tokens', amount: 40 }, cadence: 'daily' },
    { missionKey: 'boost_used_1', title: 'Use a boost window', type: 'boost_used', target: 1, reward: { currency: 'tokens', amount: 60 }, cadence: 'daily' },
    { missionKey: 'multi_session_2', title: 'Return and tap in 2 sessions today', type: 'multi_session', target: 2, reward: { currency: 'tokens', amount: 80 }, cadence: 'daily' },
  ];

  for (const def of missionDefs) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Mission.findOne({ missionKey: def.missionKey });
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await Mission.create({
        ...def,
        seasonId: season ? season._id : null,
        activeFrom: now,
        activeTo,
        status: 'active',
      });
      console.log(`[seed] Created mission: ${def.missionKey}`);
    }
  }
}

async function seedDailyChallenge() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const existing = await DailyChallenge.findOne({ dateKey });
  if (existing) {
    console.log(`[seed] Daily challenge for ${dateKey} already exists, skipping.`);
    return existing;
  }
  const daily = await DailyChallenge.create({
    dateKey,
    title: 'Daily Tap Challenge',
    target: 200,
    reward: { currency: 'tokens', amount: 100 },
  });
  console.log(`[seed] Created daily challenge for ${dateKey}`);
  return daily;
}

async function run() {
  await connectDB();
  await seedEconomyConfig();
  await seedAdmin();
  await seedDemoUsers();
  const season = await seedSeason();
  await seedMissions(season);
  await seedDailyChallenge();
  console.log('[seed] Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
