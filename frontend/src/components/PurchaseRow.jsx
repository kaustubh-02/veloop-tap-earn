import React from 'react';
import './PurchaseRow.css';

export default function PurchaseRow({ title, benefit, cost, duration, onBuy, buying, disabled, disabledReason }) {
  return (
    <div className="purchase-row">
      <div className="purchase-row__info">
        <div className="purchase-row__title">{title}</div>
        <div className="purchase-row__benefit">{benefit}</div>
        {duration && <div className="purchase-row__duration">Duration: {duration}</div>}
      </div>
      <button type="button" className="purchase-row__cta" onClick={onBuy} disabled={disabled || buying}>
        {buying ? '...' : disabled ? disabledReason || 'Unavailable' : cost}
      </button>
    </div>
  );
}
