// Storage utilities
export { Storage, STORAGE_KEYS, EXPIRATION_TIMES } from './storage';

// Session management
export { SessionManager } from './sessionManager';
export type { PersistedGameSession } from './sessionManager';

// Image optimization
export { ImageOptimizer, LazyImageObserver, lazyImageObserver } from './imageOptimization';
export type { ImageLoadOptions, ImageDimensions } from './imageOptimization';

// Accessibility utilities
export { 
  KeyboardNavigationManager, 
  ScreenReaderUtils, 
  FocusManager, 
  ColorContrastUtils,
  announceToScreenReader,
  prefersReducedMotion,
  isUsingScreenReader,
  getGameElementRole
} from './accessibility';
export type { KeyboardNavigationOptions } from './accessibility';
