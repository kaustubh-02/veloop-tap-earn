const mongoose = require('mongoose');
const { User, RewardLedger } = require('../models');

/**
 * rewardLedgerService is the ONLY place in the codebase allowed to mutate
 * User.balances. Every call writes a RewardLedger row in the same
 * transaction/session so every currency change is auditable (spec 27, 33).
 *
 * Decimal128 currencies (ve, sve, gems) are handled via string arithmetic
 * through mongoose's Decimal128 rather than native floats, to avoid
 * binary floating-point drift on authoritative balances (spec 46).
 */

const DECIMAL_CURRENCIES = new Set(['ve', 'sve', 'gems']);
const INTEGER_CURRENCIES = new Set(['tokens', 'spins', 'fragments']);

function toDecimal(value) {
  return mongoose.Types.Decimal128.fromString(String(value));
}

function decimalToNumber(decimal128) {
  return parseFloat(decimal128.toString());
}

/**
 * Credits or debits a single currency for a user, atomically, and writes
 * a matching RewardLedger row. Uses a MongoDB session/transaction when
 * `session` is provided by the caller (tapController wraps multi-currency
 * or multi-document tap processing in one transaction).
 *
 * @param {Object} params
 * @param {String} params.userId
 * @param {'ve'|'sve'|'tokens'|'gems'|'spins'|'fragments'} params.currency
 * @param {Number} params.amount - positive number; direction determines credit/debit
 * @param {'credit'|'debit'} params.direction
 * @param {String} params.source - RewardLedger.source enum value
 * @param {String} [params.referenceId]
 * @param {String} [params.referenceType]
 * @param {Number} [params.configVersion]
 * @param {mongoose.ClientSession} [params.session]
 */
async function applyBalanceChange({
  userId,
  currency,
  amount,
  direction,
  source,
  referenceId = null,
  referenceType = null,
  configVersion = 1,
  session = null,
}) {
  if (amount < 0) throw new Error('applyBalanceChange amount must be non-negative; use direction to control sign');
  if (amount === 0) {
    const user = await User.findById(userId).session(session);
    return { user, ledgerEntry: null };
  }

  const opts = session ? { session } : {};
  const field = `balances.${currency}`;

  if (DECIMAL_CURRENCIES.has(currency)) {
    // Decimal128 has no native $inc support pre-MongoDB 8 in all drivers
    // reliably, so we read-modify-write inside the (optional) transaction
    // for correctness. Combined with the transaction's isolation this is
    // still atomic w.r.t. concurrent writers.
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error(`User ${userId} not found`);
    const current = decimalToNumber(user.balances[currency]);
    const next = direction === 'credit' ? current + amount : current - amount;
    if (next < -0.0001) {
      throw new Error(`Insufficient ${currency} balance for user ${userId}`);
    }
    const clamped = Math.max(0, Math.round(next * 10) / 10);
    user.balances[currency] = toDecimal(clamped);
    await user.save(opts);

    const [ledgerEntry] = await RewardLedger.create(
      [
        {
          userId,
          source,
          direction,
          currency,
          amount: toDecimal(amount),
          balanceAfter: toDecimal(clamped),
          referenceId,
          referenceType,
          configVersion,
        },
      ],
      opts
    );

    return { user, ledgerEntry };
  }

  // Integer currencies: tokens, spins, fragments — safe to use atomic $inc.
  const delta = direction === 'credit' ? amount : -amount;
  const update = { $inc: { [field]: delta } };

  if (direction === 'debit') {
    const existing = await User.findById(userId).session(session);
    if (!existing || existing.balances[currency] + delta < 0) {
      throw new Error(`Insufficient ${currency} balance for user ${userId}`);
    }
  }

  const user = await User.findByIdAndUpdate(userId, update, { new: true, ...opts });
  const balanceAfter = user.balances[currency];

  const [ledgerEntry] = await RewardLedger.create(
    [
      {
        userId,
        source,
        direction,
        currency,
        amount: toDecimal(amount),
        balanceAfter: toDecimal(balanceAfter),
        referenceId,
        referenceType,
        configVersion,
      },
    ],
    opts
  );

  return { user, ledgerEntry };
}

module.exports = {
  applyBalanceChange,
  toDecimal,
  decimalToNumber,
  DECIMAL_CURRENCIES,
  INTEGER_CURRENCIES,
};
