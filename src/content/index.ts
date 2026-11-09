/**
 * WhatsApp Web Injected Content Script (Isolated World)
 * Pull-based communication ONLY. Responds strictly to GET_CHAT_TITLE.
 * Never accesses chrome.storage, never touches chat messages or private data.
 */

import { extractActiveChatTitle } from './headerParser';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'GET_CHAT_TITLE') {
    const detectedTitle = extractActiveChatTitle();
    sendResponse({ title: detectedTitle });
  }
  return true;
});

