import React, { useState } from 'react';
import { GroupEntity } from '../core/types';
import { extendGroup } from '../core/storage';
import { formatDateTime } from '../core/time';
import { X, Clock, Sparkles } from 'lucide-react';

interface ExtendModalProps {
  group: GroupEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onExtended: () => void;
}

export const ExtendModal: React.FC<ExtendModalProps> = ({
  group,
  isOpen,
  onClose,
  onExtended,
}) => {
  const [extensionHours, setExtensionHours] = useState(24);
  const [customDays, setCustomDays] = useState(1);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');

  if (!isOpen || !group) return null;

  const now = Date.now();
  const deltaMs =
    mode === 'preset'
      ? extensionHours * 3600 * 1000
      : customDays * 24 * 3600 * 1000;

  const baseStart =
    group.expiresAt !== null && now < group.expiresAt
      ? group.expiresAt
      : now;
  const simulatedNewExpiry = baseStart + deltaMs;

  const handleConfirmExtend = async () => {
    await extendGroup(group.id, deltaMs, Date.now());
    onExtended();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-2xl max-w-sm w-full">
        {/* Header */}
        <div className="border-b border-ivory-100 px-5 py-4 flex items-center justify-between bg-forest-800 text-ivory-50 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gold-300" />
            <h2 className="font-serif font-semibold text-sm">Extend Group Lifetime</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ivory-200 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-ivory-900">
          <div>
            <span className="text-ivory-600 block text-[11px]">Extending group:</span>
            <span className="font-semibold text-forest-900 text-sm truncate block">
              {group.name}
            </span>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-forest-900 block">
              Select Extension Duration:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('preset');
                  setExtensionHours(24);
                }}
                className={`py-2 px-2.5 rounded-lg border font-medium transition-all ${
                  mode === 'preset' && extensionHours === 24
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                +1 Day (24h)
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('preset');
                  setExtensionHours(48);
                }}
                className={`py-2 px-2.5 rounded-lg border font-medium transition-all ${
                  mode === 'preset' && extensionHours === 48
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                +2 Days (48h)
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('preset');
                  setExtensionHours(72);
                }}
                className={`py-2 px-2.5 rounded-lg border font-medium transition-all ${
                  mode === 'preset' && extensionHours === 72
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                +3 Days (72h)
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('preset');
                  setExtensionHours(168);
                }}
                className={`py-2 px-2.5 rounded-lg border font-medium transition-all ${
                  mode === 'preset' && extensionHours === 168
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                +1 Week (7d)
              </button>
            </div>
          </div>

          {/* New Calculated Endpoint Preview */}
          <div className="p-3 bg-ivory-50 border border-ivory-200 rounded-xl space-y-1">
            <span className="text-[11px] text-ivory-600 block">New Scheduled Endpoint:</span>
            <span className="font-semibold text-forest-900 block text-xs">
              {formatDateTime(simulatedNewExpiry)}
            </span>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-ivory-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-ivory-700 hover:bg-ivory-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmExtend}
              className="px-4 py-1.5 text-xs font-medium bg-forest-800 hover:bg-forest-700 text-white rounded-lg shadow-sm transition-all"
            >
              Confirm Extension
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
