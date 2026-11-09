import React, { useState } from 'react';
import { GroupEntity } from '../core/types';
import { getGroupStatus } from '../core/status';
import { StatusBadge } from './StatusBadge';
import { CountdownTimer } from './CountdownTimer';
import { formatDateTime } from '../core/time';
import { generateIcsCalendar } from '../core/ics';
import {
  Copy,
  Check,
  Calendar,
  Clock,
  Archive,
  RotateCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface GroupCardProps {
  group: GroupEntity;
  onInitiateClosure: (group: GroupEntity) => void;
  onExtend: (group: GroupEntity) => void;
  onReopen: (group: GroupEntity) => void;
  onDelete: (group: GroupEntity) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onInitiateClosure,
  onExtend,
  onReopen,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const now = Date.now();
  const status = getGroupStatus(group, now);

  const handleCopyName = async () => {
    try {
      await navigator.clipboard.writeText(group.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadIcs = () => {
    if (group.expiresAt === null) return;
    try {
      const icsData = generateIcsCalendar(group, Date.now());
      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vilaya_${group.name.replace(/\s+/g, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate .ics file', err);
    }
  };

  const isClosed = status === 'CLOSED';
  const isPermanent = status === 'PERMANENT';
  const isGrace = status === 'GRACE_PERIOD';
  const effectiveTarget = isGrace ? group.graceEndsAt : group.expiresAt;

  return (
    <div
      className={`rounded-xl border transition-all p-3.5 space-y-3 bg-white shadow-luxury hover:shadow-luxury-hover ${
        isGrace
          ? 'border-amber-300 ring-1 ring-amber-300/50'
          : status === 'EXPIRED'
          ? 'border-red-300 bg-red-50/20'
          : isClosed
          ? 'border-ivory-200 opacity-75'
          : 'border-ivory-200'
      }`}
    >
      {/* Top Header: Name, Tag & Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <h3 className="font-semibold text-sm text-forest-900 truncate" title={group.name}>
              {group.name}
            </h3>
            <button
              onClick={handleCopyName}
              title={copied ? 'Copied to clipboard!' : 'Copy group name to search on WhatsApp Web'}
              className="p-1 text-ivory-600 hover:text-forest-700 hover:bg-forest-50 rounded transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-forest-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {group.purpose && (
            <span className="inline-block mt-0.5 text-[11px] text-ivory-600 font-medium truncate max-w-full">
              {group.purpose}
            </span>
          )}
        </div>

        <StatusBadge status={status} />
      </div>

      {/* Countdown or Expiry Info */}
      {!isClosed && !isPermanent && (
        <CountdownTimer
          targetMs={effectiveTarget}
          createdAt={group.createdAt}
          isGracePeriod={isGrace}
        />
      )}

      {/* Notes / Details */}
      {group.notes && (
        <p className="text-xs text-ivory-700 bg-ivory-100/60 p-2 rounded-lg line-clamp-2">
          {group.notes}
        </p>
      )}

      {/* Timeline Footnote */}
      <div className="text-[10px] text-ivory-600 flex items-center justify-between border-t border-ivory-100 pt-2">
        <span>
          {isPermanent
            ? 'Permanent Group'
            : isClosed
            ? `Closed on ${formatDateTime(group.markedClosedAt)}`
            : `Endpoint: ${formatDateTime(group.expiresAt)}`}
        </span>

        {group.expiresAt !== null && !isClosed && (
          <button
            onClick={handleDownloadIcs}
            title="Download .ics reminder for phone calendar"
            className="flex items-center space-x-1 text-forest-700 hover:text-gold-600 font-medium transition-colors"
          >
            <Calendar className="w-3 h-3" />
            <span>Phone Sync</span>
          </button>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end space-x-1.5 pt-1">
        {isClosed ? (
          <>
            <button
              onClick={() => onReopen(group)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs text-forest-700 hover:bg-forest-50 border border-forest-500/30 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reopen</span>
            </button>
            <button
              onClick={() => onDelete(group)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete group from VILAYA"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {!isPermanent && (
              <button
                onClick={() => onExtend(group)}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-forest-800 hover:bg-forest-50 border border-ivory-200 hover:border-forest-600/40 rounded-lg transition-colors"
              >
                <Clock className="w-3 h-3 text-gold-500" />
                <span>Extend</span>
              </button>
            )}

            <button
              onClick={() => onInitiateClosure(group)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-forest-800 hover:bg-forest-700 text-ivory-50 font-medium rounded-lg shadow-sm transition-colors"
            >
              <Archive className="w-3 h-3 text-gold-300" />
              <span>Assisted Closure</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
