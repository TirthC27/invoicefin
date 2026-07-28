/**
 * Shared helpers for the Exporter portal.
 *
 * STATUS_COLOR — maps Invoice status → accent colour
 * formatCountdown — converts milliseconds remaining → "12d 04:23:11" / "04:23:11"
 * useCountdown   — React hook: live countdown updating every second, cleans up on unmount
 * useTick        — shared 1-second ticker (use once at layout level, pass tick to children)
 */
import { useState, useEffect, useRef } from 'react';

export const STATUS_COLOR = {
  Draft:     '#6B7280',
  Verified:  '#3B82F6',
  Funding:   '#8B5CF6',
  Funded:    '#EC4899',
  Active:    '#22C55E',
  Completed: '#14B8A6',
};

/**
 * Format milliseconds remaining into a human-readable countdown string.
 * > 24 h  → "12d 04:23:11"
 * ≤ 24 h  → "04:23:11"
 * ≤ 0     → "00:00:00"
 */
export function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return '00:00:00';
  const totalSec = Math.floor(msRemaining / 1000);
  const days  = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins  = Math.floor((totalSec % 3600) / 60);
  const secs  = totalSec % 60;
  const hh    = String(hours).padStart(2, '0');
  const mm    = String(mins).padStart(2, '0');
  const ss    = String(secs).padStart(2, '0');
  if (days > 0) return `${days}d ${hh}:${mm}:${ss}`;
  return `${hh}:${mm}:${ss}`;
}

/**
 * useCountdown(dueDateStr)
 * Returns { display, expired, msRemaining } that updates every second.
 * dueDateStr — ISO date string "YYYY-MM-DD" (treated as end-of-day in UTC).
 * onExpire callback is called once when countdown hits 0.
 */
export function useCountdown(dueDateStr, onExpire) {
  const target    = dueDateStr ? new Date(dueDateStr + 'T23:59:59Z').getTime() : 0;
  const [ms, setMs] = useState(() => Math.max(0, target - Date.now()));
  const firedRef  = useRef(false);

  useEffect(() => {
    if (!dueDateStr) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, target - Date.now());
      setMs(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [dueDateStr, target, onExpire]);

  return {
    display:     formatCountdown(ms),
    expired:     ms === 0,
    msRemaining: ms,
  };
}

/**
 * useTick()
 * Returns a tick counter that increments every second.
 * Use at the layout level and pass the tick down so child components
 * can derive their countdown from Date.now() on every tick without
 * spinning up dozens of separate intervals.
 */
export function useTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

/** Format a number with thousands separator + optional currency prefix */
export function fmtAmount(amount, currency = '') {
  const n = Number(amount);
  const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return currency ? `${currency} ${formatted}` : formatted;
}

/** Returns a relative time string like "2 hours ago" */
export function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const sec  = Math.floor(diff / 1000);
  if (sec < 60)   return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60)   return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
