require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const tapRoutes = require('./routes/tapRoutes');
const leagueRoutes = require('./routes/leagueRoutes');
const upgradeRoutes = require('./routes/upgradeRoutes');
const boostEnergyRoutes = require('./routes/boostEnergyRoutes');
const missionRoutes = require('./routes/missionRoutes');
const luckyRoutes = require('./routes/luckyRoutes');
const adRoutes = require('./routes/adRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(mongoSanitize());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global safety-net rate limiter. Tap-specific abuse detection lives in
// antiAbuseService and is far more precise than this blunt instrument.
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'veloop-tap-earn-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/tap', tapRoutes);
app.use('/api/tap', leagueRoutes); // adds /api/tap/league, /api/tap/season
app.use('/api/tap/upgrade', upgradeRoutes);
app.use('/api/tap', boostEnergyRoutes); // adds /api/tap/boost/activate, /energy-bank/purchase, /shield/purchase
app.use('/api/tap', missionRoutes); // adds /api/tap/missions, /api/tap/daily-challenge
app.use('/api/tap', luckyRoutes); // adds /api/tap/lucky, /api/tap/lucky/spin
app.use('/api/ads', adRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] VELoop Tap & Earn backend listening on port ${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
