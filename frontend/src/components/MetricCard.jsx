import React from 'react';

/**
 * MetricCard — matches the ecommerce-analytics dashboard stat card.
 * Shows an icon top-right, a large value, and an optional change badge.
 *
 * @param {string} title
 * @param {string|number} value
 * @param {string} change - e.g. "+2.4%", "-0.6%", or null
 * @param {boolean} isPositive - controls badge color
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} prefix - e.g. "MATIC " or "$"
 * @param {string} suffix - e.g. " MATIC"
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
    <div className="metric-card">
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
    </div>
  );
}
