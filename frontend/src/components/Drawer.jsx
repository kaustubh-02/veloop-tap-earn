import React, { useEffect } from 'react';
import './Drawer.css';

/**
 * Generic bottom-sheet drawer used for all advanced systems (Upgrades,
 * Energy Bank, Shield, Missions, Daily Challenge, Lucky Spin) so the main
 * screen stays uncluttered (spec 2, 44: "Use bottom sheets, drawers and
 * focused modals for advanced systems").
 */
export default function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-sheet__handle" />
        <div className="drawer-sheet__header">
          <h3 className="drawer-sheet__title">{title}</h3>
          <button type="button" className="drawer-sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="drawer-sheet__body">{children}</div>
      </div>
    </div>
  );
}
