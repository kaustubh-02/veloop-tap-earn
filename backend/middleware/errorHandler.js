/**
 * Centralized error handler. Tap-specific errors (AppTapError) carry a
 * `code` used for subtle frontend messaging ('Too Fast', 'Energy Empty',
 * etc. per spec 3 and 44). Everything else falls back to a generic 500
 * without leaking internals.
 */

const TAP_ERROR_STATUS = {
  too_fast: 429,
  energy_empty: 409,
  suspicious_pattern: 429,
  cooldown_active: 429,
  tap_state_missing: 404,
};

function errorHandler(err, req, res, _next) {
  if (err && err.code && TAP_ERROR_STATUS[err.code]) {
    return res.status(TAP_ERROR_STATUS[err.code]).json({ error: err.code, message: err.message });
  }

  if (err && err.message && /already claimed|not completed|not found|insufficient|not started/i.test(err.message)) {
    return res.status(400).json({ error: 'bad_request', message: err.message });
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err);
  return res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
}

module.exports = errorHandler;
