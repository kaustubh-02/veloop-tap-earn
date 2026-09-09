import React, { useCallback, useRef, useState } from 'react';
import RewardToast from './RewardToast';
import './TapCircle.css';

/**
 * TapCircle is the hero interaction (spec 44: "Central Tap Circle is the
 * hero interaction and must feel physically responsive on every accepted
 * tap"). It animates immediately on every physical tap — press/compression
 * + ripple/glow + haptic feedback — regardless of whether the server ends
 * up accepting or rejecting it (spec: "Never freeze the Tap Circle while
 * waiting for a network response; animate immediately and reconcile with
 * authoritative server state").
 *
 * Adds a real 3D coin-flip (CSS perspective/rotateY) on every accepted
 * press, a radial particle burst, and a pointer-following 3D tilt on
 * desktop (mouse position maps to a subtle rotateX/rotateY) for a more
 * premium, tactile feel.
 */
export default function TapCircle({ onTap, disabled, lastReward, rejection, comboCount, precisionTarget, onPrecisionHit }) {
  const [ripples, setRipples] = useState([]);
  const [particles, setParticles] = useState([]);
  const [pressed, setPressed] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const rippleIdRef = useRef(0);
  const particleIdRef = useRef(0);
  const stageRef = useRef(null);

  const triggerHaptics = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // fail silently on unsupported devices (spec 3)
      }
    }
  }, []);

  const spawnParticles = useCallback(() => {
    const batchId = particleIdRef.current++;
    const burst = Array.from({ length: 8 }, (_, i) => ({
      id: `${batchId}-${i}`,
      angle: (360 / 8) * i + Math.random() * 20,
      distance: 70 + Math.random() * 40,
      size: 4 + Math.random() * 5,
    }));
    setParticles((prev) => [...prev, ...burst]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !burst.find((b) => b.id === p.id)));
    }, 700);
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -14, y: px * 14 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const handlePress = useCallback(
    (event) => {
      // Immediate visual feedback, independent of server round-trip.
      setPressed(true);
      setFlipping(true);
      triggerHaptics();
      spawnParticles();

      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 650);

      let precisionHit = false;
      if (precisionTarget && event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const clientX = event.clientX ?? (event.touches && event.touches[0]?.clientX);
        const clientY = event.clientY ?? (event.touches && event.touches[0]?.clientY);
        if (clientX != null && clientY != null) {
          const dx = clientX - (rect.left + precisionTarget.x * rect.width);
          const dy = clientY - (rect.top + precisionTarget.y * rect.height);
          const dist = Math.sqrt(dx * dx + dy * dy);
          precisionHit = dist <= precisionTarget.radius;
        }
        if (precisionHit && onPrecisionHit) onPrecisionHit();
      }

      onTap({ precisionTapHit: precisionHit });

      setTimeout(() => setPressed(false), 120);
      setTimeout(() => setFlipping(false), 480);
    },
    [onTap, triggerHaptics, precisionTarget, onPrecisionHit, spawnParticles]
  );

  return (
    <div className="tap-circle-wrap">
      {comboCount > 1 && (
        <div className="tap-circle__combo" key={comboCount}>
          COMBO x{comboCount}
        </div>
      )}

      <div
        className="tap-circle-stage"
        ref={stageRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <RewardToast reward={lastReward} />

        <div className="tap-circle-3d" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
          <button
            type="button"
            className={`tap-circle ${pressed ? 'tap-circle--pressed' : ''} ${flipping ? 'tap-circle--flipping' : ''} ${disabled ? 'tap-circle--disabled' : ''}`}
            onPointerDown={handlePress}
            disabled={disabled}
            aria-label="Tap to earn VE"
          >
            <span className="tap-circle__glow" />
            <span className="tap-circle__rim" />
            <span className="tap-circle__coin">VE</span>
            <span className="tap-circle__shine" />

            {precisionTarget && (
              <span
                className="tap-circle__precision-target"
                style={{
                  left: `${precisionTarget.x * 100}%`,
                  top: `${precisionTarget.y * 100}%`,
                  width: precisionTarget.radius * 2,
                  height: precisionTarget.radius * 2,
                }}
              />
            )}

            {ripples.map((r) => (
              <span key={r.id} className="tap-circle__ripple" />
            ))}
          </button>
        </div>

        <div className="tap-circle__particles">
          {particles.map((p) => (
            <span
              key={p.id}
              className="tap-circle__particle"
              style={{
                '--angle': `${p.angle}deg`,
                '--distance': `${p.distance}px`,
                width: p.size,
                height: p.size,
              }}
            />
          ))}
        </div>

        {rejection && <div className="tap-circle__rejection">{rejection}</div>}
      </div>
    </div>
  );
}
