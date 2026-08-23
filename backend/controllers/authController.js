const jwt = require('jsonwebtoken');
const { User, TapState } = require('../models');
const economyConfigService = require('../services/economyConfigService');

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
}

async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: 'bad_request', message: 'email, password and displayName are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'bad_request', message: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'conflict', message: 'Email already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ email, passwordHash, displayName });

    const { config } = await economyConfigService.getConfig();
    await TapState.create({
      userId: user._id,
      energy: config.energy.baseCapacity,
      maxEnergy: config.energy.baseCapacity,
      rechargeRate: config.energy.rechargeAmount,
      rechargeIntervalMinutes: config.energy.rechargeIntervalMinutes,
      lastEnergyAt: new Date(),
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'bad_request', message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({ user, accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'bad_request', message: 'refreshToken is required' });
    }
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'User not found' });
    }
    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired refresh token' });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, refresh, me };
