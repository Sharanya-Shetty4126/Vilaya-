/**
 * Communication & Assisted Closure Templates
 * Platform-independent, safe text generation.
 */

import { GroupEntity } from './types';

/**
 * Pre-expiry heads-up announcement template (for reminder stage)
 */
export function getHeadsUpTemplate(group: Pick<GroupEntity, 'name' | 'purpose'>): string {
  const context = group.purpose ? ` for "${group.purpose}"` : '';
  return `📢 *Heads up everyone!*
The temporary WhatsApp group *"${group.name}"*${context} will be concluding soon as its scheduled purpose is wrapping up.
Please save any relevant documents, contacts, or media. Thank you!`;
}

/**
 * Final closure announcement template (for expiration / closure stage)
 */
export function getFinalClosureTemplate(group: Pick<GroupEntity, 'name' | 'purpose'>): string {
  const context = group.purpose ? ` (${group.purpose})` : '';
  return `🏁 *Group Purpose Concluded*
Thank you all for your active participation in *"${group.name}"*${context}.
The event/collaboration has ended, and this temporary group has reached its endpoint. This group will now be closed and archived.
Wishing everyone the very best! ✨`;
}

/**
 * Admin action guidance steps
 */
export const ADMIN_GUIDANCE_STEPS = [
  {
    step: 1,
    title: 'Post Closure Announcement',
    desc: 'Copy and send the final wrap-up message to inform all group members.',
  },
  {
    step: 2,
    title: 'Restrict Messaging (Optional for Admins)',
    desc: 'In WhatsApp Group Settings, set "Send Messages" to "Only Admins" to prevent post-event spam.',
  },
  {
    step: 3,
    title: 'Exit & Delete Chat on WhatsApp',
    desc: 'Leave the group and tap "Delete group" in WhatsApp Web. (VILAYA cannot perform this step automatically).',
  },
  {
    step: 4,
    title: 'Confirm in VILAYA',
    desc: 'Mark as closed in VILAYA to archive the timer and keep your dashboard clean.',
  },
];

