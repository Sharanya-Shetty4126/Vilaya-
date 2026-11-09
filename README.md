# VILAYA (विलयः)

> *"Every group has a purpose, and every purpose has an endpoint..."*

VILAYA is a client-only, privacy-first companion Chrome Extension (Manifest V3) for WhatsApp Web. It enables users to assign predefined lifetimes to temporary WhatsApp groups (events, hackathons, trips, projects), monitor remaining lifetimes through reactive countdowns, receive offline-resilient expiry alerts, and conduct honest assisted closures.

> **Disclaimer**: VILAYA is an independent productivity tool and is not affiliated with, sponsored by, or endorsed by WhatsApp or Meta.

---

## Key Features

1. **Temporary Group Registration**:
   - Register groups with custom names, optional purpose tags, and notes.
   - Lifetime presets: **Never (Permanent `∞`)**, **End of Today (23:59:59 local)**, **End of Tomorrow**, **24 Hours**, **48 Hours**, **3 Days**, **1 Week**, or custom date/time.
   - 1-click **"Detect from WhatsApp Web"** pull-based title fetch.

2. **Pure Computed Status & Reactive Countdowns**:
   - Zero status drift: status is purely computed via `getGroupStatus(group, now)`.
   - Distinct lifecycle states: `ACTIVE`, `EXPIRING_SOON`, `GRACE_PERIOD`, `EXPIRED`, `PERMANENT`, `CLOSED`.
   - 1-second interval countdown timer with focus and visibility refresh to prevent background sleep drift.

3. **Centralized Next-Milestone Alarm (`vilaya-next`)**:
   - Maintains a single alarm targeting the earliest upcoming event across all groups, plus a 6-hour heartbeat alarm.
   - Offline catch-up recovery: If Chrome is closed or the computer was asleep across multiple expiries, dispatches a single consolidated alert: *"N groups reached their endpoint while you were away."*
   - In-app **"Needs Attention"** banner acts as a durable fallback.

4. **Honest Assisted Closure & Communication Engine**:
   - Explicit semantics: `markedClosedAt` records confirmation in VILAYA. Never promises automated group deletions or member kicks.
   - 1-click copy for **24h Heads-up** and **Final Wrap-up** announcement templates.
   - 1-click **"Copy Name to Search"** (for quick WhatsApp Web search via `Ctrl+Alt+/`).
   - Self-reported checklist (`announcementCopied`, `chatOpened`) labeled *"marked by you"*.

5. **Security, Privacy & Zero Network Guarantee**:
   - **`TRUSTED_CONTEXTS`** isolation: Content scripts have zero access to `chrome.storage.local`.
   - Minimum permissions: `storage`, `alarms`, `notifications`, `sidePanel`, and `host_permissions: ["https://web.whatsapp.com/*"]`. **Zero `"tabs"` permission**.
   - Build-verified zero-network architecture: 0 `fetch()`, 0 `XMLHttpRequest`, 0 `WebSocket`.
   - All group data stored 100% locally on your machine.

6. **Mobile Sync & Backup**:
   - 1-click **Export as `.ics` file** to sync expiry reminders into Google Calendar, Apple Calendar, or Outlook on mobile phones.
   - Timestamped **JSON Backup Export** (`vilaya_backup_YYYY-MM-DD.json`).

---

## Loading the Extension in Google Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `dist/` directory located inside this repository:
   ```
   c:\Users\Sharanya\Vilaya\Vilaya-\dist
   ```
5. Pin **VILAYA (विलयः)** to your Chrome toolbar.
6. Open `web.whatsapp.com` and click the VILAYA toolbar icon or open the Side Panel!

---

## Development & Testing

```bash
# Run all unit tests (27 tests: status transitions, DST, leap days, idempotency, export, ics)
npm test

# Build production unpacked extension and run zero-network build assertion
npm run build
```

---

## Design System

- **Forest Green**: `#143D2B` (Brand primary)
- **Sage Emerald**: `#2D6A4F` (Active state badge)
- **Muted Gold**: `#C5A059` (Expiring soon & accents)
- **Warm Amber**: `#DDA15E` (Grace period indicator)
- **Warm Ivory**: `#FDFBF7` (Background surface)
- **Sand White**: `#F4F0E8` (Card surface)
