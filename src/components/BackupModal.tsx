import React, { useState } from 'react';
import { VilayaStorage, VilayaSettings } from '../core/types';
import { createExportEnvelope } from '../core/export';
import { updateSettings } from '../core/storage';
import { X, Download, ShieldCheck, Settings, Check } from 'lucide-react';

interface BackupModalProps {
  storage: VilayaStorage;
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  storage,
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const [reminderMinutes, setReminderMinutes] = useState(
    storage.settings.defaultReminderMinutes
  );
  const [graceHours, setGraceHours] = useState(
    storage.settings.defaultGraceHours
  );
  const [notifyExpired, setNotifyExpired] = useState(
    storage.settings.notifyOnExpired
  );
  const [notifyReminder, setNotifyReminder] = useState(
    storage.settings.notifyOnReminder
  );
  const [savedSettings, setSavedSettings] = useState(false);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const envelope = createExportEnvelope(storage, Date.now());
    const dataStr = JSON.stringify(envelope, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `vilaya_backup_${today}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      defaultReminderMinutes: reminderMinutes,
      defaultGraceHours: graceHours,
      notifyOnExpired: notifyExpired,
      notifyOnReminder: notifyReminder,
    });
    setSavedSettings(true);
    onSettingsUpdated();
    setTimeout(() => setSavedSettings(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-ivory-100 px-5 py-4 flex items-center justify-between bg-forest-800 text-ivory-50 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-gold-300" />
            <h2 className="font-serif font-semibold text-base">Settings & Backup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ivory-200 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs text-ivory-900">
          {/* Section 1: JSON Export */}
          <div className="space-y-2">
            <span className="font-semibold text-forest-900 block">
              Local Data Backup (JSON Export)
            </span>
            <p className="text-[11px] text-ivory-600 leading-relaxed">
              VILAYA stores all data locally in Chrome. To protect against accidental browser profile clearing or extension uninstalls, export a timestamped JSON backup.
            </p>
            <button
              onClick={handleExportJson}
              className="flex items-center space-x-1.5 px-3 py-2 bg-forest-800 hover:bg-forest-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-gold-300" />
              <span>Download Backup ({Object.keys(storage.groups).length} groups)</span>
            </button>
          </div>

          {/* Section 2: Global Defaults */}
          <div className="space-y-3 border-t border-ivory-100 pt-4">
            <span className="font-semibold text-forest-900 block">
              Global Defaults for New Groups
            </span>
            <p className="text-[11px] text-ivory-600">
              Note: Changing defaults applies to newly created groups. Existing groups retain their configured settings.
            </p>

            <div className="space-y-1.5">
              <label className="font-medium text-forest-900 block text-[11px]">
                Default Pre-Expiry Reminder Window
              </label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 border border-ivory-200 rounded-lg text-forest-900"
              >
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={120}>2 hours before</option>
                <option value={360}>6 hours before</option>
                <option value={1440}>24 hours (1 day) before</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-forest-900 block text-[11px]">
                Default Grace Period Buffer
              </label>
              <select
                value={graceHours}
                onChange={(e) => setGraceHours(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 border border-ivory-200 rounded-lg text-forest-900"
              >
                <option value={0}>0 hours (no grace period)</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-center space-x-2 text-[11px] text-forest-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyExpired}
                  onChange={(e) => setNotifyExpired(e.target.checked)}
                  className="rounded border-ivory-300 text-forest-800"
                />
                <span>Send native system notification on expiration</span>
              </label>

              <label className="flex items-center space-x-2 text-[11px] text-forest-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyReminder}
                  onChange={(e) => setNotifyReminder(e.target.checked)}
                  className="rounded border-ivory-300 text-forest-800"
                />
                <span>Send native system notification on pre-expiry reminder</span>
              </label>
            </div>

            <button
              onClick={handleSaveSettings}
              className="flex items-center space-x-1 px-3 py-1.5 bg-forest-700 hover:bg-forest-600 text-white rounded-lg font-medium text-xs transition-colors"
            >
              {savedSettings ? (
                <>
                  <Check className="w-3.5 h-3.5 text-gold-300" />
                  <span>Settings Saved!</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>

          {/* Section 3: Chrome Web Store & Privacy Disclaimer */}
          <div className="border-t border-ivory-100 pt-4 p-3 bg-ivory-50 rounded-xl space-y-1 text-[11px] text-ivory-600">
            <span className="font-semibold text-forest-900 block">About VILAYA (विलयः)</span>
            <p>
              Version 1.0.0 (Manifest V3)
            </p>
            <p className="text-[10px] leading-relaxed pt-1">
              Disclaimer: VILAYA is an independent productivity companion extension and is not affiliated with, sponsored by, or endorsed by WhatsApp or Meta. All group countdowns and reminders run 100% locally on your device with zero cloud tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

