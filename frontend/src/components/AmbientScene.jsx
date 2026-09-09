import React, { useMemo } from 'react';
import './AmbientScene.css';

/**
 * AmbientScene — a fully code-drawn (no image assets) decorative backdrop
 * for the Tap & Earn stage: slow-floating coin glyphs, a soft portal glow,
 * and warm corner light pools, evoking a "magical arena" feel without
 * copying any specific game's character art or branding.
 */
export default function AmbientScene() {
  const coins = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        left: 8 + Math.random() * 84,
        delay: Math.random() * 6,
        duration: 7 + Math.random() * 5,
        size: 14 + Math.random() * 10,
      })),
    []
  );

  return (
    <div className="ambient-scene" aria-hidden="true">
      <div className="ambient-scene__portal" />
      <div className="ambient-scene__torch ambient-scene__torch--left" />
      <div className="ambient-scene__torch ambient-scene__torch--right" />
      {coins.map((c) => (
        <span
          key={c.id}
          className="ambient-scene__coin"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
