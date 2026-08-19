/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Type definition for Document Picture-in-Picture API
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (options?: {
        width?: number;
        height?: number;
        disallowReturnToOpener?: boolean;
      }) => Promise<Window>;
      window: Window | null;
      onenter?: (event: Event) => void;
    };
  }
}

interface UseFloatingPrescriptionWindowOptions {
  width?: number;
  height?: number;
  title?: string;
  hasActiveOrder?: boolean;
  onTabSwitchedWhileOrderActive?: () => void;
}

export function useFloatingPrescriptionWindow({
  width = 440,
  height = 680,
  title = 'Mi Receta - Asistente de Prescripción',
  hasActiveOrder = false,
  onTabSwitchedWhileOrderActive,
}: UseFloatingPrescriptionWindowOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [autoOpenOnTabSwitch, setAutoOpenOnTabSwitch] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mi-receta-auto-pip') === 'true';
    } catch {
      return false;
    }
  });

  const pipWindowRef = useRef<Window | null>(null);
  const hasActiveOrderRef = useRef(hasActiveOrder);
  hasActiveOrderRef.current = hasActiveOrder;
  const onTabSwitchedRef = useRef(onTabSwitchedWhileOrderActive);
  onTabSwitchedRef.current = onTabSwitchedWhileOrderActive;

  // Check Document PiP support
  useEffect(() => {
    setIsPipSupported(typeof window !== 'undefined' && 'documentPictureInPicture' in window);
  }, []);

  // Save auto-open preference
  const toggleAutoOpen = useCallback((enabled?: boolean) => {
    setAutoOpenOnTabSwitch((prev) => {
      const nextVal = enabled !== undefined ? enabled : !prev;
      try {
        localStorage.setItem('mi-receta-auto-pip', String(nextVal));
      } catch (e) {
        console.error('Error storing auto-pip preference', e);
      }
      return nextVal;
    });
  }, []);

  // Copy all stylesheets from main window to popup / PiP window
  const copyStylesToWindow = (targetDoc: Document) => {
    // Copy link stylesheets
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    links.forEach((link) => {
      const newLink = targetDoc.createElement('link');
      newLink.rel = 'stylesheet';
      newLink.href = (link as HTMLLinkElement).href;
      targetDoc.head.appendChild(newLink);
    });

    // Copy inline styles
    const styles = Array.from(document.querySelectorAll('style'));
    styles.forEach((style) => {
      const newStyle = targetDoc.createElement('style');
      newStyle.textContent = style.textContent;
      targetDoc.head.appendChild(newStyle);
    });

    // Add font family & basic styling
    const baseStyle = targetDoc.createElement('style');
    baseStyle.textContent = `
      :root {
        --bg: #F8FAFC;
        --ink: #0F172A;
        --ink-muted: #64748B;
        --ink-faint: rgba(1, 65, 188, 0.08);
        --brand-blue: #1661E1;
        --brand-teal: #0F6C7D;
        --brand-dark: #0141BC;
        --brand-accent: #1E6EFB;
        --brand-mint: #14BE99;
      }
      body {
        margin: 0;
        padding: 0;
        background-color: #F8FAFC;
        font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #0F172A;
        overflow-x: hidden;
      }
      * {
        box-sizing: border-box;
      }
    `;
    targetDoc.head.appendChild(baseStyle);
  };

  // Close floating window
  const closeFloatingWindow = useCallback(() => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch (err) {
        console.error('Error closing floating window', err);
      }
      pipWindowRef.current = null;
    }
    setPipContainer(null);
    setIsOpen(false);
  }, []);

  // Open floating window using Document PiP or Popup fallback
  const openFloatingWindow = useCallback(async () => {
    // If already open, focus it
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.focus();
      } catch {}
      return;
    }

    try {
      let win: Window | null = null;

      // 1. Try Document Picture-in-Picture API (Always on top)
      if (typeof window !== 'undefined' && window.documentPictureInPicture) {
        try {
          win = await window.documentPictureInPicture.requestWindow({
            width,
            height,
          });
        } catch (pipErr) {
          console.warn('Document PiP request failed, falling back to window.open', pipErr);
          win = null;
        }
      }

      // 2. Fallback to standard window.open popup
      if (!win) {
        const left = Math.max(0, window.screen.width - width - 40);
        const top = 60;
        win = window.open(
          '',
          'MiRecetaPrescriptionAssistant',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no`
        );
      }

      if (!win) {
        alert('Por favor, permita las ventanas emergentes (popups) en el navegador para abrir el Asistente de Medicación.');
        return;
      }

      pipWindowRef.current = win;
      win.document.title = title;

      // Copy styles
      copyStylesToWindow(win.document);

      // Create mounting root
      const container = win.document.createElement('div');
      container.id = 'floating-prescription-root';
      win.document.body.appendChild(container);

      setPipContainer(container);
      setIsOpen(true);

      // Listen for window close
      const handleClose = () => {
        pipWindowRef.current = null;
        setPipContainer(null);
        setIsOpen(false);
      };

      win.addEventListener('pagehide', handleClose);
      win.addEventListener('beforeunload', handleClose);
      win.addEventListener('unload', handleClose);
    } catch (error) {
      console.error('Error opening floating window:', error);
    }
  }, [width, height, title]);

  // Toggle floating window
  const toggleFloatingWindow = useCallback(() => {
    if (isOpen) {
      closeFloatingWindow();
    } else {
      openFloatingWindow();
    }
  }, [isOpen, closeFloatingWindow, openFloatingWindow]);

  // Handle Tab Switch (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched to another tab
        if (hasActiveOrderRef.current) {
          if (onTabSwitchedRef.current) {
            onTabSwitchedRef.current();
          }

          // If auto-open is enabled and window is not open, attempt opening or focusing
          if (autoOpenOnTabSwitch) {
            if (!pipWindowRef.current || pipWindowRef.current.closed) {
              // Attempt to open
              openFloatingWindow();
            } else {
              try {
                pipWindowRef.current.focus();
              } catch {}
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoOpenOnTabSwitch, openFloatingWindow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    isOpen,
    isPipSupported,
    pipContainer,
    autoOpenOnTabSwitch,
    openFloatingWindow,
    closeFloatingWindow,
    toggleFloatingWindow,
    toggleAutoOpen,
    pipWindow: pipWindowRef.current,
  };
}
