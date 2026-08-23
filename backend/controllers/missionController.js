const { Mission, UserMission, DailyChallenge, UserDailyChallenge } = require('../models');
const missionService = require('../services/missionService');

async function getMissions(req, res, next) {
  try {
    const now = new Date();
    const missions = await Mission.find({ status: 'active', activeFrom: { $lte: now }, activeTo: { $gte: now } }).lean();
    const userMissions = await UserMission.find({ userId: req.userId, missionId: { $in: missions.map((m) => m._id) } }).lean();

    const merged = missions.map((mission) => {
      const progress = userMissions.find((um) => String(um.missionId) === String(mission._id));
      return {
        ...mission,
        progress: progress ? progress.progress : 0,
        completed: progress ? progress.completed : false,
        claimed: progress ? progress.claimed : false,
      };
    });

    return res.json({ missions: merged });
  } catch (err) {
    return next(err);
  }
}

async function claimMission(req, res, next) {
  try {
    const { id } = req.params;
    const userMission = await missionService.claimMission({ userId: req.userId, missionId: id });
    return res.json({ status: 'ok', userMission });
  } catch (err) {
    return next(err);
  }
}

async function getDailyChallenge(req, res, next) {
  try {
    const dateKey = missionService.dateKeyUtc(new Date());
    const daily = await DailyChallenge.findOne({ dateKey }).lean();
    if (!daily) return res.json({ dailyChallenge: null });

    const userDaily = await UserDailyChallenge.findOne({ userId: req.userId, dailyChallengeId: daily._id }).lean();

    return res.json({
      dailyChallenge: {
        ...daily,
        progress: userDaily ? userDaily.progress : 0,
        completed: userDaily ? userDaily.completed : false,
        claimed: userDaily ? userDaily.claimed : false,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function claimDailyChallenge(req, res, next) {
  try {
    const userDaily = await missionService.claimDailyChallenge({ userId: req.userId });
    return res.json({ status: 'ok', userDaily });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getMissions, claimMission, getDailyChallenge, claimDailyChallenge };
