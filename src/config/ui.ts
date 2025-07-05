/**
 * UI configuration settings
 * Contains settings for UI behavior and display preferences
 */

// Event Feed Configuration
export const EVENT_FEED_CONFIG = {
  /** Whether to automatically scroll to the bottom when new events arrive */
  AUTO_SCROLL_TO_BOTTOM: true,
  /** Delay before auto-scrolling (in milliseconds) to prevent disrupting user scrolling */
  AUTO_SCROLL_DELAY: 100,
  /** Whether auto-scroll should be disabled during cache loading */
  DISABLE_AUTO_SCROLL_ON_CACHE_LOAD: true,
} as const;

// Other UI configurations can be added here as needed