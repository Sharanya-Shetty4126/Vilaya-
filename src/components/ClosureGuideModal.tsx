import React, { useState } from 'react';
import { GroupEntity } from '../core/types';
import { getHeadsUpTemplate, getFinalClosureTemplate, ADMIN_GUIDANCE_STEPS } from '../core/templates';
import { markClosed } from '../core/storage';
import { X, Copy, Check, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface ClosureGuideModalProps {
  group: GroupEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onClosedConfirmed: () => void;
}

export const ClosureGuideModal: React.FC<ClosureGuideModalProps> = ({
  group,
  isOpen,
  onClose,
  onClosedConfirmed,
}) => {
  const [templateType, setTemplateType] = useState<'final' | 'headsup'>('final');
  const [copiedAnnouncement, setCopiedAnnouncement] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [announcementCopiedCheck, setAnnouncementCopiedCheck] = useState(false);
  const [chatOpenedCheck, setChatOpenedCheck] = useState(false);

  if (!isOpen || !group) return null;

  const announcementText =
    templateType === 'final'
      ? getFinalClosureTemplate(group)
      : getHeadsUpTemplate(group);

  const handleCopyAnnouncement = async () => {
    try {
      await navigator.clipboard.writeText(announcementText);
      setCopiedAnnouncement(true);
      setAnnouncementCopiedCheck(true);
      setTimeout(() => setCopiedAnnouncement(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyGroupName = async () => {
    try {
      await navigator.clipboard.writeText(group.name);
      setCopiedName(true);
      setTimeout(() => setCopiedName(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    setChatOpenedCheck(true);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          chrome.tabs.create({ url: 'https://web.whatsapp.com' });
        }
      });
    } else {
      window.open('https://web.whatsapp.com', '_blank');
    }
  };

  const handleConfirmClose = async () => {
    const now = Date.now();
    await markClosed(group.id, now, {
      announcementCopied: announcementCopiedCheck,
      chatOpened: chatOpenedCheck,
    });
    onClosedConfirmed();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-ivory-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-ivory-100 px-5 py-4 flex items-center justify-between bg-forest-800 text-ivory-50 rounded-t-2xl">
          <div>
            <h2 className="font-serif font-semibold text-base">Assisted Group Closure</h2>
            <p className="text-xs text-ivory-200 font-light truncate max-w-[280px]">
              {group.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ivory-200 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-ivory-900">
          {/* Important Honest Semantics Disclaimer */}
          <div className="p-3 bg-ivory-100/70 rounded-xl border border-ivory-200 flex items-start space-x-2 text-ivory-800">
            <AlertCircle className="w-4 h-4 text-forest-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block text-forest-900">
                Closure Semantics & Privacy Note
              </span>
              <p className="text-[11px] leading-relaxed text-ivory-700">
                VILAYA cannot leave or delete WhatsApp groups on your behalf. Exiting a group does not delete it for other participants. Complete your group departure steps below, then mark as closed to archive your reminder in VILAYA.
              </p>
            </div>
          </div>

          {/* Step 1: Announcement Templates */}
          <div className="space-y-2 border-t border-ivory-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-forest-900 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Copy Departure Announcement</span>
              </span>
              <div className="flex items-center space-x-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTemplateType('final')}
                  className={`px-2 py-0.5 rounded font-medium ${
                    templateType === 'final'
                      ? 'bg-forest-800 text-white'
                      : 'text-forest-700 hover:bg-forest-50'
                  }`}
                >
                  Final Wrap-up
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('headsup')}
                  className={`px-2 py-0.5 rounded font-medium ${
                    templateType === 'headsup'
                      ? 'bg-forest-800 text-white'
                      : 'text-forest-700 hover:bg-forest-50'
                  }`}
                >
                  24h Heads-up
                </button>
              </div>
            </div>

            <div className="p-3 bg-ivory-50 border border-ivory-200 rounded-xl relative group">
              <pre className="font-sans text-[11px] text-ivory-800 whitespace-pre-wrap leading-relaxed">
                {announcementText}
              </pre>
              <button
                type="button"
                onClick={handleCopyAnnouncement}
                className="mt-2 flex items-center space-x-1 px-2.5 py-1 bg-forest-800 hover:bg-forest-700 text-white text-[11px] font-medium rounded-lg transition-colors shadow-sm"
              >
                {copiedAnnouncement ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-gold-300" />
                    <span>Copied Announcement!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gold-300" />
                    <span>Copy Announcement</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Open WhatsApp & Search */}
          <div className="space-y-2 border-t border-ivory-100 pt-3">
            <span className="font-semibold text-forest-900 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Locate Group in WhatsApp Web</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyGroupName}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 border border-ivory-200 hover:border-forest-600 rounded-lg text-forest-900 font-medium transition-colors"
              >
                {copiedName ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-forest-600" />
                    <span>Group Name Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Name to Search</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-forest-50 hover:bg-forest-100 border border-forest-500/30 rounded-lg text-forest-800 font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open WhatsApp Web</span>
              </button>
            </div>
            <p className="text-[10px] text-ivory-600 italic">
              Tip: Press <kbd className="px-1 py-0.5 bg-ivory-200 rounded">Ctrl+Alt+/</kbd> on WhatsApp Web to jump straight to chat search.
            </p>
          </div>

          {/* Step 3: Admin & Departure Guidance */}
          <div className="space-y-2 border-t border-ivory-100 pt-3">
            <span className="font-semibold text-forest-900 flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Recommended WhatsApp Departure Actions</span>
            </span>

            <div className="space-y-1.5">
              {ADMIN_GUIDANCE_STEPS.slice(1, 3).map((guide) => (
                <div key={guide.step} className="p-2 bg-ivory-50 rounded-lg border border-ivory-100">
                  <span className="font-medium text-forest-900 block">{guide.title}</span>
                  <span className="text-[11px] text-ivory-600">{guide.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Self-reported Checkpoints */}
          <div className="space-y-2 border-t border-ivory-100 pt-3">
            <span className="text-[11px] font-semibold text-ivory-700 block">
              Self-Reported Checklist (Marked by you):
            </span>
            <label className="flex items-center space-x-2 text-[11px] text-forest-900 cursor-pointer">
              <input
                type="checkbox"
                checked={announcementCopiedCheck}
                onChange={(e) => setAnnouncementCopiedCheck(e.target.checked)}
                className="rounded border-ivory-300 text-forest-800 focus:ring-forest-600"
              />
              <span>Announcement message posted in group</span>
            </label>
            <label className="flex items-center space-x-2 text-[11px] text-forest-900 cursor-pointer">
              <input
                type="checkbox"
                checked={chatOpenedCheck}
                onChange={(e) => setChatOpenedCheck(e.target.checked)}
                className="rounded border-ivory-300 text-forest-800 focus:ring-forest-600"
              />
              <span>Group chat exited / archived on WhatsApp Web</span>
            </label>
          </div>

          {/* Final Action */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-ivory-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-ivory-700 hover:bg-ivory-100 rounded-lg transition-colors"
            >
              Keep Active
            </button>
            <button
              type="button"
              onClick={handleConfirmClose}
              className="px-4 py-2 text-xs font-medium bg-forest-800 hover:bg-forest-700 text-ivory-50 rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-gold-300" />
              <span>Mark as closed in VILAYA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

