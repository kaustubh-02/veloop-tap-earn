import React from 'react';

/**
 * VeloopAvatar — the VELoop coin-mascot image, used consistently across
 * BalanceCard, LeaderboardRow, MyRankStickyRow, Profile, and the auth
 * pages. Backed by an AI-generated illustration (background removed to
 * true alpha transparency) rather than a code-drawn SVG, for a richer,
 * more premium look than a flat gradient/initial circle.
 */
export default function VeloopAvatar({ size = 44, glow = true }) {
  return (
    <img
      src="/images/coin-mascot.png"
      alt="VELoop"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: glow ? 'drop-shadow(0 0 8px rgba(242, 181, 68, 0.4))' : 'none',
        display: 'block',
      }}
    />
  );
}
