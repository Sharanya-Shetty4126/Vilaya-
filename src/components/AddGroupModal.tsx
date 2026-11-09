import React, { useState } from 'react';
import { GroupEntity, VilayaSettings } from '../core/types';
import { getEndOfLocalDay } from '../core/time';
import { saveGroup } from '../core/storage';
import { MESSAGE_TYPES } from '../background/messages';
import { X, Sparkles, ChevronDown, ChevronUp, Clock, ShieldAlert } from 'lucide-react';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupAdded: () => void;
  settings: VilayaSettings;
}

type DurationPreset =
  | 'NEVER'
  | 'END_OF_TODAY'
  | 'END_OF_TOMORROW'
  | '24H'
  | '48H'
  | '3D'
  | '1W'
  | 'CUSTOM';

export const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupAdded,
  settings,
}) => {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [preset, setPreset] = useState<DurationPreset>('48H');
  const [customDateTime, setCustomDateTime] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);

  // Advanced collapsible section
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(settings.defaultReminderMinutes);
  const [graceHours, setGraceHours] = useState(settings.defaultGraceHours);

  if (!isOpen) return null;

  const handleDetectFromWhatsApp = () => {
    setIsDetecting(true);
    setDetectionNotice(null);

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        { type: MESSAGE_TYPES.GET_ACTIVE_CHAT_TITLE },
        (res: { title?: string | null; reason?: string } | undefined) => {
          setIsDetecting(false);
          if (res?.title) {
            setName(res.title);
            setDetectionNotice('Group name detected from active WhatsApp Web chat!');
          } else {
            setDetectionNotice(
              res?.reason || 'Could not detect active chat. Make sure WhatsApp Web is open.'
            );
          }
        }
      );
    } else {
      setIsDetecting(false);
      setDetectionNotice('Chrome extension API not available in this view.');
    }
  };

  const calculateExpiry = (): number | null => {
    const now = Date.now();
    switch (preset) {
      case 'NEVER':
        return null;
      case 'END_OF_TODAY':
        return getEndOfLocalDay(0);
      case 'END_OF_TOMORROW':
        return getEndOfLocalDay(1);
      case '24H':
        return now + 24 * 3600 * 1000;
      case '48H':
        return now + 48 * 3600 * 1000;
      case '3D':
        return now + 3 * 24 * 3600 * 1000;
      case '1W':
        return now + 7 * 24 * 3600 * 1000;
      case 'CUSTOM':
        if (!customDateTime) return now + 24 * 3600 * 1000;
        return new Date(customDateTime).getTime();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = Date.now();
    const expiresAt = calculateExpiry();
    const graceEndsAt =
      expiresAt !== null && graceHours > 0
        ? expiresAt + graceHours * 3600 * 1000
        : null;

    const newGroup: GroupEntity = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 100),
      purpose: purpose.trim() ? purpose.trim().slice(0, 50) : undefined,
      notes: notes.trim() ? notes.trim().slice(0, 500) : undefined,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      graceEndsAt,
      markedClosedAt: null,
      effectiveReminderMinutes: reminderMinutes,
      effectiveGraceHours: graceHours,
    };

    await saveGroup(newGroup);
    onGroupAdded();
    onClose();

    // Reset form
    setName('');
    setPurpose('');
    setNotes('');
    setPreset('48H');
    setDetectionNotice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="border-b border-ivory-100 px-5 py-4 flex items-center justify-between bg-forest-800 text-ivory-50 rounded-t-2xl">
          <div>
            <h2 className="font-serif font-semibold text-base">Register Temporary Group</h2>
            <p className="text-xs text-ivory-200 font-light">Set purpose & scheduled lifetime</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ivory-200 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Field 1: Group Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-forest-900">
                Group Name <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleDetectFromWhatsApp}
                disabled={isDetecting}
                className="flex items-center space-x-1 text-[11px] text-forest-700 hover:text-forest-900 font-medium transition-colors"
              >
                <Sparkles className="w-3 h-3 text-gold-500" />
                <span>{isDetecting ? 'Detecting...' : 'Detect from WhatsApp Web'}</span>
              </button>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Trip 2026, CS Final Project..."
              className="w-full px-3 py-2 text-xs border border-ivory-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-600/20 focus:border-forest-600 text-forest-900 placeholder:text-ivory-600"
            />
            {detectionNotice && (
              <p className="text-[11px] text-gold-600 flex items-center space-x-1">
                <span>{detectionNotice}</span>
              </p>
            )}
          </div>

          {/* Field 2: Lifetime / Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-forest-900">
              Scheduled Lifetime
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPreset('NEVER')}
                className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-all ${
                  preset === 'NEVER'
                    ? 'border-gold-500 bg-gold-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                <span className="block font-semibold">Never (Permanent)</span>
                <span className="text-[10px] text-ivory-600">No scheduled expiry (∞)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('END_OF_TODAY')}
                className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-all ${
                  preset === 'END_OF_TODAY'
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                <span className="block font-semibold">End of Today</span>
                <span className="text-[10px] text-ivory-600">Closes at 23:59:59 local</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('48H')}
                className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-all ${
                  preset === '48H'
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                <span className="block font-semibold">48 Hours (2 Days)</span>
                <span className="text-[10px] text-ivory-600">Exact 48h from now</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('1W')}
                className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-all ${
                  preset === '1W'
                    ? 'border-forest-600 bg-forest-50 text-forest-900'
                    : 'border-ivory-200 text-ivory-700 hover:bg-ivory-50'
                }`}
              >
                <span className="block font-semibold">1 Week</span>
                <span className="text-[10px] text-ivory-600">7 days from now</span>
              </button>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-ivory-600">Other options:</span>
              <div className="space-x-1.5">
                <button
                  type="button"
                  onClick={() => setPreset('24H')}
                  className={`px-2 py-1 rounded text-[11px] ${
                    preset === '24H' ? 'bg-forest-800 text-white' : 'text-forest-700 hover:bg-forest-50'
                  }`}
                >
                  24h
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('3D')}
                  className={`px-2 py-1 rounded text-[11px] ${
                    preset === '3D' ? 'bg-forest-800 text-white' : 'text-forest-700 hover:bg-forest-50'
                  }`}
                >
                  3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('CUSTOM')}
                  className={`px-2 py-1 rounded text-[11px] ${
                    preset === 'CUSTOM' ? 'bg-forest-800 text-white' : 'text-forest-700 hover:bg-forest-50'
                  }`}
                >
                  Custom Pick
                </button>
              </div>
            </div>

            {preset === 'CUSTOM' && (
              <div className="pt-2">
                <input
                  type="datetime-local"
                  required
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-ivory-200 rounded-lg focus:outline-none focus:border-forest-600"
                />
              </div>
            )}
          </div>

          {/* Field 3: Purpose / Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-forest-900">
              Purpose / Tag <span className="text-ivory-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              maxLength={50}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. College Fest, Trip, Hackathon, Assignment"
              className="w-full px-3 py-2 text-xs border border-ivory-200 rounded-lg focus:outline-none focus:border-forest-600 text-forest-900 placeholder:text-ivory-600"
            />
          </div>

          {/* Collapsible Advanced Section */}
          <div className="border-t border-ivory-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-xs font-medium text-ivory-600 hover:text-forest-800"
            >
              <span>Advanced Options (Reminder & Grace Period)</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="pt-3 space-y-3 animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-forest-900 flex items-center justify-between">
                    <span>Pre-Expiry Reminder Lead Time</span>
                    <span className="text-ivory-600">
                      {reminderMinutes >= 60
                        ? `${reminderMinutes / 60} hours before`
                        : `${reminderMinutes} mins before`}
                    </span>
                  </label>
                  <select
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 text-xs border border-ivory-200 rounded-lg text-forest-900"
                  >
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={120}>2 hours before (Default)</option>
                    <option value={360}>6 hours before</option>
                    <option value={1440}>24 hours (1 day) before</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-forest-900 flex items-center justify-between">
                    <span>Grace Period Safety Buffer</span>
                    <span className="text-ivory-600">
                      {graceHours === 0 ? 'No grace period' : `${graceHours} hours buffer`}
                    </span>
                  </label>
                  <select
                    value={graceHours}
                    onChange={(e) => setGraceHours(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 text-xs border border-ivory-200 rounded-lg text-forest-900"
                  >
                    <option value={0}>0 hours (Expires immediately)</option>
                    <option value={6}>6 hours buffer</option>
                    <option value={12}>12 hours buffer (Default)</option>
                    <option value={24}>24 hours buffer</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-ivory-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-ivory-700 hover:bg-ivory-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded-lg shadow-sm transition-all"
            >
              Register Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

