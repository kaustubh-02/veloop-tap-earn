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
 */
export default function TapCircle({ onTap, disabled, lastReward, rejection, comboCount, precisionTarget, onPrecisionHit }) {
  const [ripples, setRipples] = useState([]);
  const [pressed, setPressed] = useState(false);
  const rippleIdRef = useRef(0);

  const triggerHaptics = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        // fail silently on unsupported devices (spec 3)
      }
    }
  }, []);

  const handlePress = useCallback(
    (event) => {
      // Immediate visual feedback, independent of server round-trip.
      setPressed(true);
      triggerHaptics();

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
    },
    [onTap, triggerHaptics, precisionTarget, onPrecisionHit]
  );

  return (
    <div className="tap-circle-wrap">
      {comboCount > 1 && (
        <div className="tap-circle__combo" key={comboCount}>
          COMBO x{comboCount}
        </div>
      )}

      <div className="tap-circle-stage">
        <RewardToast reward={lastReward} />

        <button
          type="button"
          className={`tap-circle ${pressed ? 'tap-circle--pressed' : ''} ${disabled ? 'tap-circle--disabled' : ''}`}
          onPointerDown={handlePress}
          disabled={disabled}
          aria-label="Tap to earn VE"
        >
          <span className="tap-circle__glow" />
          <span className="tap-circle__coin">VE</span>

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

        {rejection && <div className="tap-circle__rejection">{rejection}</div>}
      </div>
    </div>
  );
}
