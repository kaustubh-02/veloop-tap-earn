import React from 'react';
import './SkeletonBlock.css';

export default function SkeletonBlock({ height = 60, radius = 16, style = {} }) {
  return <div className="skeleton-block" style={{ height, borderRadius: radius, ...style }} />;
}
