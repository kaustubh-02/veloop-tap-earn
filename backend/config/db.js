const mongoose = require('mongoose');

/**
 * Connects to MongoDB using MONGO_URI from environment.
 * Exits process on failure since the app cannot function without persistence.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veloop_tap_earn';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });
    // eslint-disable-next-line no-console
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] MongoDB connection failed:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('[db] MongoDB disconnected');
  });
}

module.exports = connectDB;
