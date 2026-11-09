/**
 * VILAYA (विलयः) Background Service Worker Entry Point
 * Top-level synchronous listener registration, fail-closed security initialization,
 * centralized next-milestone alarm handling, and reconcile triggers.
 */

import { initializeStorageSecurity } from '../core/storage';
import { reconcile } from './reconcile';
import {
  ALARM_NEXT,
  ALARM_HEARTBEAT,
  ensureHeartbeatAlarm,
} from './scheduler';
import {
  handleRuntimeMessage,
  handleNotificationButtonClick,
  openVilayaInterface,
} from './messages';

// 1. Immediate Fail-Closed Storage Security Initialization
initializeStorageSecurity().catch((err) => {
  console.error('[VILAYA BOOT] Storage security failed to initialize:', err);
});

// 2. Synchronous Top-Level Event Listeners

// On Service Worker Startup
chrome.runtime.onStartup.addListener(() => {
  ensureHeartbeatAlarm();
  reconcile();
});

// On Extension Install / Update
chrome.runtime.onInstalled.addListener((details) => {
  initializeStorageSecurity().catch(console.error);
  ensureHeartbeatAlarm();
  reconcile();

  if (details.reason === 'install') {
    console.log('[VILAYA] Extension installed successfully.');
  }
});

// Centralized Alarm Listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NEXT || alarm.name === ALARM_HEARTBEAT) {
    reconcile();
  }
});

// Notification Button Click Listener
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  handleNotificationButtonClick(notificationId, buttonIndex).catch(console.error);
});

// Notification Body Click Listener
chrome.notifications.onClicked.addListener((notificationId) => {
  openVilayaInterface();
  chrome.notifications.clear(notificationId);
});

// Message Listener for UI and Pull-based WhatsApp integration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return handleRuntimeMessage(message, sender, sendResponse);
});

// Run initial reconcile on worker wakeup
ensureHeartbeatAlarm();
reconcile();

