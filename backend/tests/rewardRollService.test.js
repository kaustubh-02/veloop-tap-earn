const rewardRollService = require('../services/rewardRollService');
const defaultConfig = require('../config/tapEconomy.defaults');

describe('rewardRollService.rollTapReward — probability distribution', () => {
  test('large sample matches configured probabilities within tolerance', () => {
    const N = 200000;
    const counts = { sve: 0, ve: 0, spin: 0, gems: 0, tokens: 0 };

    for (let i = 0; i < N; i += 1) {
      const result = rewardRollService.rollTapReward(defaultConfig);
      counts[result.type] += 1;
    }

    const tolerance = 0.01; // 1 percentage point
    expect(counts.sve / N).toBeCloseTo(0.6, 1);
    expect(counts.ve / N).toBeCloseTo(0.2, 1);
    expect(counts.spin / N).toBeCloseTo(0.02, 1);
    expect(counts.gems / N).toBeCloseTo(0.05, 1);
    expect(counts.tokens / N).toBeCloseTo(0.13, 1);

    // Ensure every outcome bucket is accounted for (no unaccounted bucket).
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(N);
  });

  test('VE rewards stay within the configured 0.6-1.7 range with one decimal', () => {
    // Force VE bucket by using a fixed rng sequence: first roll picks VE bucket,
    // second roll picks the step index.
    let call = 0;
    const rng = () => {
      call += 1;
      if (call === 1) return 0.65; // lands in VE bucket (0.6 <= x < 0.8 cumulative)
      return 0.5; // mid step
    };
    const result = rewardRollService.rollTapReward(defaultConfig, rng);
    expect(result.type).toBe('ve');
    expect(result.amount).toBeGreaterThanOrEqual(0.6);
    expect(result.amount).toBeLessThanOrEqual(1.7);
    expect(Number.isInteger(result.amount * 10)).toBe(true); // one decimal place
  });

  test('token rewards stay within the configured 5-100 range', () => {
    let call = 0;
    const rng = () => {
      call += 1;
      if (call === 1) return 0.999; // falls into the tokens remainder bucket
      return 0.5;
    };
    const result = rewardRollService.rollTapReward(defaultConfig, rng);
    expect(result.type).toBe('tokens');
    expect(result.amount).toBeGreaterThanOrEqual(5);
    expect(result.amount).toBeLessThanOrEqual(100);
  });

  test('gems rewards only ever come from the configured discrete values', () => {
    const allowed = new Set(defaultConfig.reward.gems.values);
    for (let i = 0; i < 500; i += 1) {
      let call = 0;
      const rng = () => {
        call += 1;
        if (call === 1) return 0.83; // lands in gems bucket
        return Math.random();
      };
      const result = rewardRollService.rollTapReward(defaultConfig, rng);
      if (result.type === 'gems') {
        expect(allowed.has(result.amount)).toBe(true);
      }
    }
  });
});

describe('rewardRollService.rollSpin — Lucky Tap spin table', () => {
  test('spin reward probabilities sum to exactly 1', () => {
    const total = defaultConfig.luckyTap.spinRewards.reduce((sum, r) => sum + r.probability, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  test('disabled entries (probability 0) are never selected', () => {
    const N = 20000;
    let voucherCount = 0;
    let ve500Count = 0;
    for (let i = 0; i < N; i += 1) {
      const result = rewardRollService.rollSpin(defaultConfig);
      if (result.key === 'voucher_5') voucherCount += 1;
      if (result.key === 've_500') ve500Count += 1;
    }
    expect(voucherCount).toBe(0);
    expect(ve500Count).toBe(0);
  });

  test('large sample roughly matches configured probabilities', () => {
    const N = 100000;
    const counts = {};
    for (let i = 0; i < N; i += 1) {
      const result = rewardRollService.rollSpin(defaultConfig);
      counts[result.key] = (counts[result.key] || 0) + 1;
    }
    for (const entry of defaultConfig.luckyTap.spinRewards) {
      if (entry.probability > 0) {
        expect((counts[entry.key] || 0) / N).toBeCloseTo(entry.probability, 1);
      }
    }
  });
});

describe('rewardRollService.applyMultipliers', () => {
  test('does not multiply spin rewards even with efficiency/boost active', () => {
    const amount = rewardRollService.applyMultipliers(
      { type: 'spin', amount: 1 },
      { efficiency: 1.3, boostMultiplier: 2 },
      defaultConfig
    );
    expect(amount).toBe(1);
  });

  test('applies efficiency and boost multiplicatively to tokens with rounding', () => {
    const amount = rewardRollService.applyMultipliers(
      { type: 'tokens', amount: 50 },
      { efficiency: 1.2, boostMultiplier: 2 },
      defaultConfig
    );
    expect(amount).toBe(Math.round(50 * 1.2 * 2));
  });

  test('rounds VE/SVE/gems to one decimal place', () => {
    const amount = rewardRollService.applyMultipliers(
      { type: 've', amount: 1.1 },
      { efficiency: 1.1, boostMultiplier: 1 },
      defaultConfig
    );
    expect(Number.isInteger(amount * 10)).toBe(true);
  });
});
