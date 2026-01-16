/**
 * Announce Service (Sprint Feed-6)
 *
 * Provides screen reader announcements via ARIA live regions.
 * Creates a visually hidden live region for accessibility.
 */

let announcerElement: HTMLElement | null = null;

/**
 * Get or create the live region element
 */
function getAnnouncer(): HTMLElement {
  if (announcerElement && document.body.contains(announcerElement)) {
    return announcerElement;
  }

  // Create the announcer element
  announcerElement = document.createElement('div');
  announcerElement.id = 'feed-announcer';
  announcerElement.setAttribute('role', 'status');
  announcerElement.setAttribute('aria-live', 'polite');
  announcerElement.setAttribute('aria-atomic', 'true');

  // Visually hidden but accessible to screen readers
  Object.assign(announcerElement.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });

  document.body.appendChild(announcerElement);
  return announcerElement;
}

/**
 * Announce Service singleton
 */
export const announceService = {
  /**
   * Announce a message to screen readers
   * Uses polite announcement (waits for current speech to finish)
   */
  announce(message: string): void {
    const announcer = getAnnouncer();

    // Clear and set in sequence to trigger announcement
    announcer.textContent = '';

    // Use requestAnimationFrame to ensure the DOM update is processed
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  },

  /**
   * Announce a message assertively (interrupts current speech)
   * Use sparingly for important announcements
   */
  announceAssertive(message: string): void {
    const announcer = getAnnouncer();
    announcer.setAttribute('aria-live', 'assertive');

    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = message;

      // Reset to polite after announcement
      setTimeout(() => {
        announcer.setAttribute('aria-live', 'polite');
      }, 100);
    });
  },

  /**
   * Announce card navigation
   */
  announceCardNavigation(currentIndex: number, totalItems: number): void {
    this.announce(`Now viewing item ${currentIndex + 1} of ${totalItems}`);
  },

  /**
   * Announce vote action
   */
  announceVote(voteType: 'up' | 'down', totalUpvotes: number, totalDownvotes: number): void {
    const action = voteType === 'up' ? 'Upvoted' : 'Downvoted';
    const score = totalUpvotes - totalDownvotes;
    this.announce(`${action}. ${totalUpvotes} upvotes, ${totalDownvotes} downvotes. Score: ${score}`);
  },

  /**
   * Announce save action
   */
  announceSave(saved: boolean): void {
    this.announce(saved ? 'Saved to collection' : 'Removed from collection');
  },

  /**
   * Announce swipe action
   */
  announceSwipeAction(action: 'save' | 'not-interested'): void {
    if (action === 'save') {
      this.announce('Saved to collection');
    } else {
      this.announce('Marked as not interested');
    }
  },

  /**
   * Clean up the announcer element (for testing)
   */
  cleanup(): void {
    if (announcerElement && document.body.contains(announcerElement)) {
      document.body.removeChild(announcerElement);
      announcerElement = null;
    }
  },
};

export default announceService;
