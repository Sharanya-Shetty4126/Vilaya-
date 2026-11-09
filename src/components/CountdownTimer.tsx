import React, { useState, useEffect } from 'react';
import { formatCountdown, getRemainingParts } from '../core/time';

interface CountdownTimerProps {
  targetMs: number | null;
  createdAt: number;
  isGracePeriod?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetMs,
  createdAt,
  isGracePeriod = false,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (targetMs === null) return;

    // Tick every second
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    // Refresh immediately on tab focus or visibility change to eliminate sleep drift
    const handleVisibility = () => {
      if (!document.hidden) {
        setNow(Date.now());
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [targetMs]);

  if (targetMs === null) {
    return (
      <div className="text-xs text-gold-600 font-medium flex items-center space-x-1">
        <span>No expiry</span>
      </div>
    );
  }

  const { isPast } = getRemainingParts(targetMs, now);
  const formatted = formatCountdown(targetMs, now);

  // Calculate elapsed progress percentage
  const totalLifespan = Math.max(1, targetMs - createdAt);
  const elapsed = Math.max(0, Math.min(totalLifespan, now - createdAt));
  const progressPercent = Math.min(100, Math.round((elapsed / totalLifespan) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] text-ivory-600">
          {isGracePeriod ? 'Grace Period Ending:' : 'Remaining:'}
        </span>
        <span
          className={`font-mono font-semibold ${
            isPast
              ? 'text-red-600'
              : isGracePeriod
              ? 'text-amber-500'
              : 'text-forest-800'
          }`}
        >
          {isPast ? 'Elapsed' : formatted}
        </span>
      </div>

      <div className="w-full bg-ivory-200 h-1 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isPast
              ? 'bg-red-500'
              : isGracePeriod
              ? 'bg-amber-500'
              : progressPercent > 80
              ? 'bg-gold-500'
              : 'bg-forest-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

