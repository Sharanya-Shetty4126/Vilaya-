/**
 * Background Message Router & WhatsApp Web Pull-Bridge
 * Validates sender origin, sanitizes untrusted chat titles, rejects content-script writes.
 */

import { extendGroup } from '../core/storage';
import { reconcile } from './reconcile';

export const MESSAGE_TYPES = {
  GET_ACTIVE_CHAT_TITLE: 'GET_ACTIVE_CHAT_TITLE',
  GET_CHAT_TITLE: 'GET_CHAT_TITLE',
  RECONCILE_NOW: 'RECONCILE_NOW',
};

/**
 * Strips control and formatting characters, trims, and truncates to max 100 chars
 */
export function sanitizeChatTitle(rawTitle: unknown): string | null {
  if (typeof rawTitle !== 'string') return null;

  // Strip control characters (ASCII 0-31, 127-159)
  const sanitized = rawTitle.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  if (sanitized.length === 0) return null;

  return sanitized.slice(0, 100);
}

/**
 * Handles incoming runtime messages
 */
export function handleRuntimeMessage(
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  // 1. Security Check: Only accept messages from our own extension
  if (sender.id !== chrome.runtime.id) {
    console.warn('[VILAYA SECURITY] Rejected message from unknown sender:', sender.id);
    sendResponse({ error: 'Unauthorized sender' });
    return false;
  }

  // 2. Security Check: Content scripts are forbidden from calling data/storage actions
  if (sender.tab && message.type !== 'CHAT_TITLE_RESULT') {
    console.warn('[VILAYA SECURITY] Rejected non-whitelisted message from content script:', message.type);
    sendResponse({ error: 'Content scripts cannot call internal actions' });
    return false;
  }

  // 3. Process Whitelisted Messages
  if (message.type === MESSAGE_TYPES.RECONCILE_NOW) {
    reconcile().then(() => sendResponse({ success: true })).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // async response
  }

  if (message.type === MESSAGE_TYPES.GET_ACTIVE_CHAT_TITLE) {
    // Pull-based query: find WhatsApp Web tab
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      const activeWaTab = tabs.find((t) => t.active) || tabs[0];
      if (!activeWaTab || !activeWaTab.id) {
        sendResponse({ title: null, reason: 'WhatsApp Web tab not found or not open' });
        return;
      }

      // Send GET_CHAT_TITLE to content script
      chrome.tabs.sendMessage(
        activeWaTab.id,
        { type: MESSAGE_TYPES.GET_CHAT_TITLE },
        (res: { title?: unknown } | undefined) => {
          if (chrome.runtime.lastError || !res) {
            sendResponse({ title: null, reason: 'Content script not reachable' });
            return;
          }

          const cleanTitle = sanitizeChatTitle(res.title);
          sendResponse({ title: cleanTitle });
        }
      );
    });

    return true; // async response
  }

  return false;
}

/**
 * Handles clicks on notification buttons
 */
export async function handleNotificationButtonClick(
  notificationId: string,
  buttonIndex: number
): Promise<void> {
  // Buttons: 0 = "Extend +24h" (if single group), 1 = "Open VILAYA"
  if (notificationId.startsWith('vilaya:consolidated:')) {
    // Open Side Panel or Popup
    openVilayaInterface();
    return;
  }

  const parts = notificationId.split(':');
  if (parts.length >= 4) {
    const groupId = parts[1];

    if (buttonIndex === 0) {
      // Extend +24h
      const now = Date.now();
      await extendGroup(groupId, 24 * 3600 * 1000, now);
      await reconcile();
      chrome.notifications.clear(notificationId);
    } else {
      // Open VILAYA
      openVilayaInterface();
      chrome.notifications.clear(notificationId);
    }
  }
}

/**
 * Opens Chrome Side Panel if supported
 */
export function openVilayaInterface(): void {
  if (typeof chrome === 'undefined') return;

  if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
    chrome.windows.getCurrent((win) => {
      if (win?.id) {
        chrome.sidePanel.open({ windowId: win.id }).catch(() => {
          // Fallback handled by user clicking toolbar action
        });
      }
    });
  }
}

