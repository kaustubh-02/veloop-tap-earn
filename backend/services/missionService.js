const { Mission, UserMission, DailyChallenge, UserDailyChallenge } = require('../models');
const rewardLedgerService = require('./rewardLedgerService');

/**
 * Increments progress on any active 'taps_completed' missions and the
 * active daily challenge for a user. Called from within the tap
 * transaction so progress is always consistent with accepted taps.
 */
async function incrementTapProgress({ userId, effectiveTaps, session }) {
  const opts = session ? { session } : {};
  const now = new Date();

  const activeMissions = await Mission.find({
    type: 'taps_completed',
    status: 'active',
    activeFrom: { $lte: now },
    activeTo: { $gte: now },
  }).session(session || null);

  for (const mission of activeMissions) {
    // eslint-disable-next-line no-await-in-loop
    const userMission = await UserMission.findOneAndUpdate(
      { userId, missionId: mission._id },
      { $setOnInsert: { progress: 0, completed: false, claimed: false } },
      { upsert: true, new: true, ...opts }
    );
    if (!userMission.completed) {
      const newProgress = Math.min(mission.target, userMission.progress + effectiveTaps);
      userMission.progress = newProgress;
      if (newProgress >= mission.target) {
        userMission.completed = true;
        userMission.completedAt = now;
      }
      // eslint-disable-next-line no-await-in-loop
      await userMission.save(opts);
    }
  }

  const todayKey = dateKeyUtc(now);
  const daily = await DailyChallenge.findOne({ dateKey: todayKey }).session(session || null);
  if (daily) {
    const userDaily = await UserDailyChallenge.findOneAndUpdate(
      { userId, dailyChallengeId: daily._id },
      { $setOnInsert: { progress: 0, completed: false, claimed: false } },
      { upsert: true, new: true, ...opts }
    );
    if (!userDaily.completed) {
      const newProgress = Math.min(daily.target, userDaily.progress + effectiveTaps);
      userDaily.progress = newProgress;
      if (newProgress >= daily.target) {
        userDaily.completed = true;
      }
      await userDaily.save(opts);
    }
  }
}

/**
 * Increments progress for non-tap-count mission types (combo_reached,
 * precision_tap, boost_used, multi_session). Called from the relevant
 * controller action rather than the tap hot path.
 */
async function incrementEventProgress({ userId, type, amount = 1 }) {
  const now = new Date();
  const activeMissions = await Mission.find({
    type,
    status: 'active',
    activeFrom: { $lte: now },
    activeTo: { $gte: now },
  });

  for (const mission of activeMissions) {
    // eslint-disable-next-line no-await-in-loop
    const userMission = await UserMission.findOneAndUpdate(
      { userId, missionId: mission._id },
      { $setOnInsert: { progress: 0, completed: false, claimed: false } },
      { upsert: true, new: true }
    );
    if (!userMission.completed) {
      const newProgress =
        type === 'combo_reached' ? Math.max(userMission.progress, amount) : Math.min(mission.target, userMission.progress + amount);
      userMission.progress = newProgress;
      if (newProgress >= mission.target) {
        userMission.completed = true;
        userMission.completedAt = now;
      }
      // eslint-disable-next-line no-await-in-loop
      await userMission.save();
    }
  }
}

/**
 * Claims a completed mission. Idempotent: a second claim attempt on an
 * already-claimed mission is rejected, never double-pays.
 */
async function claimMission({ userId, missionId }) {
  const userMission = await UserMission.findOne({ userId, missionId });
  if (!userMission) throw new Error('mission_not_started');
  if (!userMission.completed) throw new Error('mission_not_completed');
  if (userMission.claimed) throw new Error('mission_already_claimed');

  const mission = await Mission.findById(missionId);
  if (!mission) throw new Error('mission_not_found');

  userMission.claimed = true;
  userMission.claimedAt = new Date();
  await userMission.save();

  const amount = Number(mission.reward.amount.toString());
  const isInt = mission.reward.currency === 'tokens' || mission.reward.currency === 'spins';
  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: mission.reward.currency,
    amount: isInt ? Math.round(amount) : amount,
    direction: 'credit',
    source: 'mission_claim',
    referenceId: String(missionId),
    referenceType: 'Mission',
  });

  return userMission;
}

/**
 * Claims today's daily challenge. Idempotent via the `claimed` flag.
 */
async function claimDailyChallenge({ userId }) {
  const todayKey = dateKeyUtc(new Date());
  const daily = await DailyChallenge.findOne({ dateKey: todayKey });
  if (!daily) throw new Error('daily_challenge_not_found');

  const userDaily = await UserDailyChallenge.findOne({ userId, dailyChallengeId: daily._id });
  if (!userDaily || !userDaily.completed) throw new Error('daily_challenge_not_completed');
  if (userDaily.claimed) throw new Error('daily_challenge_already_claimed');

  userDaily.claimed = true;
  userDaily.claimedAt = new Date();
  await userDaily.save();

  const amount = Number(daily.reward.amount.toString());
  const isInt = daily.reward.currency === 'tokens' || daily.reward.currency === 'spins';
  await rewardLedgerService.applyBalanceChange({
    userId,
    currency: daily.reward.currency,
    amount: isInt ? Math.round(amount) : amount,
    direction: 'credit',
    source: 'daily_challenge_claim',
    referenceId: String(daily._id),
    referenceType: 'DailyChallenge',
  });

  return userDaily;
}

function dateKeyUtc(date) {
  return date.toISOString().slice(0, 10); // 'YYYY-MM-DD' in UTC
}

module.exports = {
  incrementTapProgress,
  incrementEventProgress,
  claimMission,
  claimDailyChallenge,
  dateKeyUtc,
};
