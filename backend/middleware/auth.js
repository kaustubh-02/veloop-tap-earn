const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * requireAuth verifies the Bearer JWT and attaches req.user (lean user
 * doc, minus passwordHash). Used on every protected route.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', message: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * requireAdmin must run AFTER requireAuth. Gates the admin API surface.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden', message: 'Admin role required' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
