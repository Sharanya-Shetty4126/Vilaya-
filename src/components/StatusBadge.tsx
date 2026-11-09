import React from 'react';
import { GroupStatus } from '../core/types';
import { Clock, Hourglass, CheckCircle2, AlertTriangle, Infinity as InfinityIcon } from 'lucide-react';

interface StatusBadgeProps {
  status: GroupStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'PERMANENT':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-600 border border-gold-300 ${className}`}
        >
          <InfinityIcon className="w-3 h-3 text-gold-500" />
          <span>Permanent</span>
        </span>
      );

    case 'ACTIVE':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-forest-100 text-forest-700 border border-forest-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-forest-500 animate-pulse" />
          <span>Active</span>
        </span>
      );

    case 'EXPIRING_SOON':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-600 border border-gold-400 ${className}`}
        >
          <Clock className="w-3 h-3 text-gold-500" />
          <span>Expiring Soon</span>
        </span>
      );

    case 'GRACE_PERIOD':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-500 border border-amber-500/30 ${className}`}
        >
          <Hourglass className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Grace Period</span>
        </span>
      );

    case 'EXPIRED':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>Expired</span>
        </span>
      );

    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ivory-100 text-ivory-600 border border-ivory-200 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-ivory-600" />
          <span>Closed (marked by you)</span>
        </span>
      );
  }
};

