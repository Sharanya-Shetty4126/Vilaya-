/**
 * Defensive WhatsApp Web Header Parser
 * Progressive enhancement ONLY.
 * Never imports core/storage, never reads chat messages, contacts or member lists.
 */

export function extractActiveChatTitle(): string | null {
  try {
    // WhatsApp Web renders the active chat header as an HTML <header> element
    const header = document.querySelector('header');
    if (!header) return null;

    // Strategy 1: Look for an element with a title attribute inside the header
    const titleElem = header.querySelector('[title]');
    if (titleElem) {
      const titleAttr = titleElem.getAttribute('title');
      if (titleAttr && titleAttr.trim().length > 0) {
        return titleAttr.trim();
      }
    }

    // Strategy 2: Look for primary span[dir="auto"] within the header title container
    const spans = header.querySelectorAll('span[dir="auto"]');
    for (const span of spans) {
      const text = span.textContent?.trim();
      // Skip status indicators (e.g. "online", "typing...", or click targets)
      if (text && text.length > 0 && text !== 'online' && !text.includes('typing')) {
        return text;
      }
    }

    // Strategy 3: Look for role="button" header section
    const roleBtn = header.querySelector('[role="button"]');
    if (roleBtn) {
      const btnText = roleBtn.textContent?.trim();
      if (btnText && btnText.length > 0) {
        return btnText;
      }
    }

    return null;
  } catch (err) {
    // Fail silently: manual entry is the 100% reliable fallback
    console.warn('[VILAYA CONTENT] Defensive parser error:', err);
    return null;
  }
}

