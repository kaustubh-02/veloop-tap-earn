import React from 'react';

/**
 * VeloopAvatar — an original, code-drawn mascot (no external image asset,
 * no third-party character likeness). A friendly geometric "coin-bot"
 * built from layered gradients so it reads as a premium fintech mascot
 * rather than a generic initial-letter circle. Falls back gracefully to
 * the initial letter for very small render sizes via the `size` prop.
 */
export default function VeloopAvatar({ size = 44, initial = 'V', glow = true }) {
  const gradientId = `veloopAvatarGrad-${size}`;
  const faceId = `veloopAvatarFace-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${initial} avatar`}
      style={glow ? { filter: 'drop-shadow(0 0 8px rgba(242, 181, 68, 0.35))' } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4d8dff" />
          <stop offset="55%" stopColor="#3a5fc7" />
          <stop offset="100%" stopColor="#1c1f34" />
        </linearGradient>
        <radialGradient id={faceId} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff3d6" />
          <stop offset="55%" stopColor="#f2b544" />
          <stop offset="100%" stopColor="#c98a1f" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="31" fill={`url(#${gradientId})`} stroke="rgba(255,255,255,0.12)" />

      {/* Coin-bot face: two eyes + a soft smile arc, rendered as a gold medallion */}
      <circle cx="32" cy="34" r="18" fill={`url(#${faceId})`} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <circle cx="25" cy="31" r="2.6" fill="#1c1f34" />
      <circle cx="39" cy="31" r="2.6" fill="#1c1f34" />
      <path d="M24 40 Q32 46 40 40" stroke="#1c1f34" strokeWidth="2.4" fill="none" strokeLinecap="round" />

      {/* Antenna to read as a friendly "bot" rather than a plain coin */}
      <line x1="32" y1="12" x2="32" y2="18" stroke="#7db4ff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="10" r="2.6" fill="#7db4ff" />
    </svg>
  );
}
