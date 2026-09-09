import React from 'react';
import CircleExpandCard from './CircleExpandCard';

/**
 * MetricCard — matches the ecommerce-analytics dashboard stat card.
 * Shows an icon top-right, a large value, and an optional change badge.
 */
export default function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  prefix = '',
  suffix = '',
}) {
  const changeClass = change == null
    ? 'neutral'
    : isPositive
      ? 'positive'
      : 'negative';

  return (
    <CircleExpandCard className="metric-card">
      <div className="metric-card-header">
        <span className="metric-card-label">{title}</span>
        {Icon && (
          <div className="metric-card-icon">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="metric-card-value">
        {prefix}{value}{suffix}
      </div>
      {change != null && (
        <span className={`metric-card-change ${changeClass}`}>
          {change}
        </span>
      )}
    </CircleExpandCard>
  );
}
