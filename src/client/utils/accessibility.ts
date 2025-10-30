/**
 * Accessibility utilities for keyboard navigation and screen reader support
 */

export interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableEnterActivation?: boolean;
  enableSpaceActivation?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

/**
 * Keyboard navigation manager
 */
export class KeyboardNavigationManager {
  private elements: HTMLElement[] = [];
  private currentIndex = 0;
  private options: Required<KeyboardNavigationOptions>;
  private container: HTMLElement | null = null;
  private isActive = false;

  constructor(options: KeyboardNavigationOptions = {}) {
    this.options = {
      enableArrowKeys: true,
      enableTabNavigation: true,
      enableEnterActivation: true,
      enableSpaceActivation: true,
      trapFocus: false,
      autoFocus: false,
      ...options,
    };
  }

  /**
   * Initialize keyboard navigation for a container
   */
  init(container: HTMLElement, focusableSelector: string = '[tabindex], button, input, select, textarea, a[href]'): void {
    this.container = container;
    this.updateElements(focusableSelector);
    
    if (this.options.autoFocus && this.elements.length > 0) {
      this.focusElement(0);
    }

    this.attachEventListeners();
    this.isActive = true;
  }

  /**
   * Update the list of focusable elements
   */
  updateElements(selector: string): void {
    if (!this.container) return;

    this.elements = Array.from(
      this.container.querySelectorAll<HTMLElement>(selector)
    ).filter(el => {
      const isDisabled = (el as any).disabled || el.getAttribute('aria-disabled') === 'true';
      return !isDisabled && !el.hasAttribute('aria-hidden');
    });
  }

  /**
   * Focus on a specific element by index
   */
  focusElement(index: number): void {
    if (index < 0 || index >= this.elements.length) return;

    this.currentIndex = index;
    const element = this.elements[index];
    
    if (element) {
      element.focus();
      announceToScreenReader(`Focused on ${this.getElementDescription(element)}`);
    }
  }

  /**
   * Move focus to the next element
   */
  focusNext(): void {
    const nextIndex = (this.currentIndex + 1) % this.elements.length;
    this.focusElement(nextIndex);
  }

  /**
   * Move focus to the previous element
   */
  focusPrevious(): void {
    const prevIndex = this.currentIndex === 0 ? this.elements.length - 1 : this.currentIndex - 1;
    this.focusElement(prevIndex);
  }

  /**
   * Activate the currently focused element
   */
  activateCurrentElement(): void {
    const element = this.elements[this.currentIndex];
    if (element) {
      if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        element.click();
      } else if (element.tagName === 'INPUT') {
        (element as HTMLInputElement).checked = !(element as HTMLInputElement).checked;
      }
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isActive) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (this.options.enableArrowKeys) {
          event.preventDefault();
          this.focusNext();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (this.options.enableArrowKeys) {
          event.preventDefault();
          this.focusPrevious();
        }
        break;

      case 'Tab':
        if (this.options.trapFocus) {
          event.preventDefault();
          if (event.shiftKey) {
            this.focusPrevious();
          } else {
            this.focusNext();
          }
        }
        break;

      case 'Enter':
        if (this.options.enableEnterActivation) {
          event.preventDefault();
          this.activateCurrentElement();
        }
        break;

      case ' ':
        if (this.options.enableSpaceActivation) {
          event.preventDefault();
          this.activateCurrentElement();
        }
        break;

      case 'Escape':
        this.blur();
        break;
    }
  };

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (this.container) {
      this.container.addEventListener('keydown', this.handleKeyDown);
    }
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (this.container) {
      this.container.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  /**
   * Get a description of an element for screen readers
   */
  private getElementDescription(element: HTMLElement): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    if (element.tagName === 'BUTTON') {
      return element.textContent || 'button';
    }

    if (element.tagName === 'A') {
      return `link ${element.textContent || element.getAttribute('href') || ''}`;
    }

    return element.textContent || element.tagName.toLowerCase();
  }

  /**
   * Blur current focus
   */
  blur(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
  }

  /**
   * Destroy the keyboard navigation manager
   */
  destroy(): void {
    this.removeEventListeners();
    this.isActive = false;
    this.elements = [];
    this.container = null;
  }
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
  private static announceElement: HTMLElement | null = null;

  /**
   * Initialize screen reader utilities
   */
  static init(): void {
    if (!this.announceElement) {
      this.announceElement = document.createElement('div');
      this.announceElement.setAttribute('aria-live', 'polite');
      this.announceElement.setAttribute('aria-atomic', 'true');
      this.announceElement.className = 'sr-only';
      this.announceElement.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(this.announceElement);
    }
  }

  /**
   * Announce text to screen readers
   */
  static announce(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.init();
    
    if (this.announceElement) {
      this.announceElement.setAttribute('aria-live', priority);
      this.announceElement.textContent = text;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.announceElement) {
          this.announceElement.textContent = '';
        }
      }, 1000);
    }
  }

  /**
   * Announce game state changes
   */
  static announceGameState(state: string, score?: number): void {
    let message = state;
    if (score !== undefined) {
      message += `. Current score: ${score} percent`;
    }
    this.announce(message, 'polite');
  }

  /**
   * Announce navigation changes
   */
  static announceNavigation(location: string, context?: string): void {
    let message = `Navigated to ${location}`;
    if (context) {
      message += `. ${context}`;
    }
    this.announce(message, 'polite');
  }
}

/**
 * Focus management utilities
 */
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  /**
   * Save current focus and set new focus
   */
  static pushFocus(element: HTMLElement): void {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  /**
   * Restore previous focus
   */
  static popFocus(): void {
    const previousFocus = this.focusStack.pop();
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  }

  /**
   * Clear focus stack
   */
  static clearFocusStack(): void {
    this.focusStack = [];
  }

  /**
   * Create a focus trap within an element
   */
  static createFocusTrap(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrastUtils {
  /**
   * Calculate relative luminance of a color
   */
  static getLuminance(r: number, g: number, b: number): number {
    const processColor = (c: number) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    
    const rs = processColor(r);
    const gs = processColor(g);
    const bs = processColor(b);
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const lum1 = this.getLuminance(...color1);
    const lum2 = this.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if color combination meets WCAG AA standards
   */
  static meetsWCAGAA(foreground: [number, number, number], background: [number, number, number]): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 4.5; // WCAG AA standard for normal text
  }

  /**
   * Check if color combination meets WCAG AAA standards
   */
  static meetsWCAGAAA(foreground: [number, number, number], background: [number, number, number]): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= 7; // WCAG AAA standard for normal text
  }
}

/**
 * Announce text to screen readers (convenience function)
 */
export function announceToScreenReader(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
  ScreenReaderUtils.announce(text, priority);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user is using a screen reader
 */
export function isUsingScreenReader(): boolean {
  // This is a heuristic and not 100% accurate
  return (
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('JAWS') ||
    navigator.userAgent.includes('VoiceOver') ||
    window.speechSynthesis?.getVoices().length > 0
  );
}

/**
 * Get appropriate ARIA role for game elements
 */
export function getGameElementRole(elementType: 'button' | 'image' | 'score' | 'progress'): string {
  switch (elementType) {
    case 'button':
      return 'button';
    case 'image':
      return 'img';
    case 'score':
      return 'status';
    case 'progress':
      return 'progressbar';
    default:
      return 'generic';
  }
}
