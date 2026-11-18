/** Where the reader was when an older page was requested. */
export type OlderAnchor = { offset: number; height: number; oldestId: number | undefined };

/**
 * The offset that keeps the same message on screen once the older page is in, or null while
 * the page has not arrived yet (other size changes, such as a live reply, leave the anchor alone).
 */
export function offsetAfterPrepend(anchor: OlderAnchor, height: number, oldestId: number | undefined): number | null {
  if (oldestId === anchor.oldestId) return null;
  return Math.max(0, anchor.offset + height - anchor.height);
}

/** Space after the last message: the docked composer, plus the keyboard it is lifted over. */
export function bottomPadding(dockHeight: number, lift: number): number {
  return dockHeight + lift;
}
